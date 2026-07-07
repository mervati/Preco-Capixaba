import { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './AuthContext'
import { useList } from './ListContext'
import { normalizeBarcode } from '../lib/productLookup'

const PantryContext = createContext()

export function PantryProvider({ children }) {
  const { user } = useAuth()
  const { activeList, items: listItems, addItem: addListItem, updateItemQuantity: updateListItemQuantity, deleteItem: deleteListItem } = useList()
  const [pantryItems, setPantryItems] = useState([])
  const [loading, setLoading] = useState(true)

  // Mantém a lista de compras sincronizada com o quanto falta na despensa —
  // cria o item se faltar e não estiver lá, atualiza a quantidade se mudou,
  // ou remove da lista se o estoque foi reposto e não falta mais
  function maybeAddToList({ product_name, current_qty, min_qty }) {
    if (!activeList) return
    const missing = Number(min_qty) - Number(current_qty)
    const existing = listItems.find(i => i.nome.trim().toUpperCase() === product_name.trim().toUpperCase())

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
    const { data } = await supabase
      .from('pantry')
      .insert({ ...item, user_id: user.id })
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
    const { data } = await supabase
      .from('pantry')
      .update(fields)
      .eq('id', id)
      .select()
      .single()
    if (data) setPantryItems(prev => prev.map(i => i.id === id ? data : i))
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

  async function addItemsBatchToPantry(items) {
    const current = pantryItems

    for (const item of items) {
      const name = item.nome.trim().toUpperCase()
      const qty = Number(item.quantidade) || 1
      const existing = current.find(p => p.product_name === name)

      if (existing) {
        const newQty = Number(existing.current_qty) + qty
        await supabase
          .from('pantry')
          .update({ current_qty: newQty })
          .eq('id', existing.id)
        maybeAddToList({ product_name: name, current_qty: newQty, min_qty: existing.min_qty })
      } else {
        await supabase
          .from('pantry')
          .insert({ user_id: user.id, product_name: name, current_qty: qty, min_qty: 0, unit: 'UN', source: 'nfce' })
      }
    }

    await fetchPantry()
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
