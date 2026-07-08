import { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './AuthContext'
import { useList } from './ListContext'
import { normalizeBarcode, stripSizeFromName } from '../lib/productLookup'

const PantryContext = createContext()

export function PantryProvider({ children }) {
  const { user } = useAuth()
  const { activeList, items: listItems, addItem: addListItem, updateItemQuantity: updateListItemQuantity, deleteItem: deleteListItem } = useList()
  const [pantryItems, setPantryItems] = useState([])
  const [loading, setLoading] = useState(true)

  // Calcula o product_group: nome do produto sem tamanho
  function calcProductGroup(productName) {
    const nameWithoutSize = stripSizeFromName(productName)
    return nameWithoutSize || productName
  }

  // Mantém a lista de compras sincronizada com o quanto falta na despensa —
  // cria o item se faltar e não estiver lá, atualiza a quantidade se mudou,
  // ou remove da lista se o estoque foi reposto e não falta mais
  function maybeAddToList({ product_name, current_qty, min_qty }) {
    if (!activeList) return
    const missing = Number(min_qty) - Number(current_qty)
    // Agrupa sempre pelo nome (sem tamanho) — não confia no product_group do banco,
    // que pode estar desatualizado/incorreto para itens antigos
    const pg = calcProductGroup(product_name)
    const existing = listItems.find(i => calcProductGroup(i.nome).trim().toUpperCase() === pg.trim().toUpperCase())

    if (missing <= 0) {
      if (existing) deleteListItem(existing.id)
      return
    }

    if (existing) {
      if (Number(existing.quantidade) !== missing) updateListItemQuantity(existing.id, missing)
      return
    }
    addListItem({ nome: product_name, quantidade: missing, valor_unitario: 0, valor_total: 0 })
  }

  useEffect(() => {
    if (user) fetchPantry()
  }, [user])

  async function fetchPantry() {
    setLoading(true)
    const { data } = await supabase
      .from('pantry')
      .select('*')
      .order('product_name')
    if (data) setPantryItems(data)
    setLoading(false)
  }

  async function addPantryItem(item) {
    const productGroup = calcProductGroup(item.product_name)
    const { data } = await supabase
      .from('pantry')
      .insert({ ...item, product_group: productGroup, user_id: user.id })
      .select()
      .single()
    if (data) setPantryItems(prev => [...prev, data].sort((a, b) => a.product_name.localeCompare(b.product_name)))
    return data
  }

  async function updateQty(id, current_qty) {
    const { data } = await supabase
      .from('pantry')
      .update({ current_qty })
      .eq('id', id)
      .select()
      .single()
    if (data) {
      setPantryItems(prev => prev.map(i => i.id === id ? data : i))
      maybeAddToList(data)
    }
  }

  async function updateItem(id, fields) {
    // Se product_name foi alterado, recalcula product_group
    if (fields.product_name && !fields.product_group) {
      fields.product_group = calcProductGroup(fields.product_name)
    }
    const { data } = await supabase
      .from('pantry')
      .update(fields)
      .eq('id', id)
      .select()
      .single()
    if (data) {
      setPantryItems(prev => prev.map(i => i.id === id ? data : i))
      // Mantém a memória de reconhecimento em dia (rename, marca, código de barras)
      if (data.nfce_name) {
        await saveNfceProduct(data.nfce_name, { product_name: data.product_name, brand: data.brand, barcode: data.barcode })
      }
    }
  }

  async function updateMinQty(id, min_qty) {
    const { data } = await supabase
      .from('pantry')
      .update({ min_qty })
      .eq('id', id)
      .select()
      .single()
    if (data) {
      setPantryItems(prev => prev.map(i => i.id === id ? data : i))
      maybeAddToList(data)
    }
  }

  async function addItemsBatchToPantry(items, supermarketId = null) {
    const current = pantryItems
    const createdWithoutBarcode = []

    // Memória de reconhecimento por nome de nota — sobrevive à exclusão do produto.
    // Carrega tudo de uma vez e monta um mapa nfce_name -> dados salvos.
    const { data: memoryRows } = await supabase
      .from('nfce_products')
      .select('nfce_name, product_name, brand, barcode')
      .eq('user_id', user.id)
    const memory = new Map((memoryRows || []).map(r => [r.nfce_name, r]))

    for (const item of items) {
      const name = item.nome.trim().toUpperCase()
      const qty = Number(item.quantidade) || 1
      // Reconhece pelo nome cru da nota (nfce_name) — chave estável que não muda
      // quando o usuário renomeia. Fallback pro product_name cobre itens antigos.
      const existing = current.find(p => (p.nfce_name || p.product_name) === name)

      if (existing) {
        const newQty = Number(existing.current_qty) + qty
        const patch = { current_qty: newQty }
        // Vincula o mercado se o item ainda não tiver um (não sobrescreve escolha do usuário)
        if (supermarketId && !existing.supermarket_id) patch.supermarket_id = supermarketId
        await supabase
          .from('pantry')
          .update(patch)
          .eq('id', existing.id)
        maybeAddToList({ product_name: existing.product_name, product_group: existing.product_group, current_qty: newQty, min_qty: existing.min_qty })
      } else {
        // Se já reconhecemos esse nome de nota antes, restaura nome bonito, marca e código
        const remembered = memory.get(name)
        const productName = remembered?.product_name || name
        const { data } = await supabase
          .from('pantry')
          .insert({
            user_id: user.id,
            product_name: productName,
            product_group: calcProductGroup(productName),
            nfce_name: name,
            brand: remembered?.brand || null,
            barcode: remembered?.barcode || null,
            current_qty: qty,
            min_qty: 0,
            unit: 'UN',
            source: 'nfce',
            supermarket_id: supermarketId || null,
          })
          .select()
          .single()
        if (data) {
          // Registra/atualiza a memória de reconhecimento
          await saveNfceProduct(name, { product_name: data.product_name, brand: data.brand, barcode: data.barcode })
          // Só entra na fila de "sem código" se de fato não tiver código (memória pode ter restaurado)
          if (!data.barcode) createdWithoutBarcode.push(data)
        }
      }
    }

    await fetchPantry()
    // Devolve os itens novos ainda sem código de barras para o fluxo pós-nota
    return createdWithoutBarcode
  }

  async function deletePantryItem(id) {
    await supabase.from('pantry').delete().eq('id', id)
    setPantryItems(prev => prev.filter(i => i.id !== id))
  }

  // Memória de código de barras -> nome/marca, independente da despensa —
  // continua valendo mesmo se o item for excluído depois
  async function lookupBarcodeProduct(barcode) {
    if (!barcode) return null
    const { data } = await supabase
      .from('barcode_products')
      .select('product_name, brand')
      .eq('barcode', normalizeBarcode(barcode))
      .maybeSingle()
    if (!data) return null
    return { name: data.product_name, brand: data.brand, fromLocal: true }
  }

  async function saveBarcodeProduct(barcode, productName, brand) {
    if (!barcode || !productName) return
    await supabase.from('barcode_products').upsert(
      {
        user_id: user.id,
        barcode: normalizeBarcode(barcode),
        product_name: productName,
        brand: brand || null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,barcode' }
    )
  }

  // Memória de reconhecimento por nome de nota (nfce_name -> nome bonito, marca, código).
  // Fica em tabela separada, então continua valendo mesmo se o produto for excluído da despensa.
  async function saveNfceProduct(nfceName, { product_name, brand, barcode }) {
    if (!nfceName || !product_name) return
    await supabase.from('nfce_products').upsert(
      {
        user_id: user.id,
        nfce_name: nfceName,
        product_name,
        brand: brand || null,
        barcode: barcode || null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,nfce_name' }
    )
  }

  const lowStockItems = pantryItems.filter(i => Number(i.min_qty) > 0 && Number(i.current_qty) < Number(i.min_qty))
  const outOfStockItems = pantryItems.filter(i => Number(i.current_qty) === 0)

  return (
    <PantryContext.Provider value={{
      pantryItems, loading, lowStockItems, outOfStockItems,
      addPantryItem, updateQty, updateMinQty, updateItem, deletePantryItem, addItemsBatchToPantry,
      lookupBarcodeProduct, saveBarcodeProduct,
    }}>
      {children}
    </PantryContext.Provider>
  )
}

export function usePantry() {
  return useContext(PantryContext)
}
