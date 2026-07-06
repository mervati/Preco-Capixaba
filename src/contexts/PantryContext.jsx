import { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './AuthContext'
import { fetchProductImage } from '../lib/productImage'

const PantryContext = createContext()

export function PantryProvider({ children }) {
  const { user } = useAuth()
  const [pantryItems, setPantryItems] = useState([])
  const [loading, setLoading] = useState(true)

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

  // Busca imagem em background e atualiza state + banco sem bloquear o usuário
  function loadImageAsync(id, productName) {
    fetchProductImage(productName).then(url => {
      if (!url) return
      supabase.from('pantry').update({ image_url: url }).eq('id', id)
      setPantryItems(prev => prev.map(i => i.id === id ? { ...i, image_url: url } : i))
    })
  }

  async function addPantryItem(item) {
    const { data } = await supabase
      .from('pantry')
      .insert({ ...item, user_id: user.id })
      .select()
      .single()
    if (data) {
      setPantryItems(prev => [...prev, data].sort((a, b) => a.product_name.localeCompare(b.product_name)))
      if (!data.image_url) loadImageAsync(data.id, data.product_name)
    }
    return data
  }

  async function updateQty(id, current_qty) {
    const { data } = await supabase
      .from('pantry')
      .update({ current_qty })
      .eq('id', id)
      .select()
      .single()
    if (data) setPantryItems(prev => prev.map(i => i.id === id ? data : i))
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
    if (data) setPantryItems(prev => prev.map(i => i.id === id ? data : i))
  }

  async function addItemsBatchToPantry(items) {
    const current = pantryItems
    const upserted = []

    for (const item of items) {
      const name = item.nome.trim().toUpperCase()
      const qty = Number(item.quantidade) || 1
      const existing = current.find(p => p.product_name === name)

      if (existing) {
        await supabase
          .from('pantry')
          .update({ current_qty: Number(existing.current_qty) + qty })
          .eq('id', existing.id)
        upserted.push({ id: existing.id, name, hasImage: !!existing.image_url })
      } else {
        const { data } = await supabase
          .from('pantry')
          .insert({ user_id: user.id, product_name: name, current_qty: qty, min_qty: 0, unit: 'UN' })
          .select()
          .single()
        if (data) upserted.push({ id: data.id, name, hasImage: false })
      }
    }

    await fetchPantry()

    // Busca imagens em background para itens novos (sem imagem)
    for (const u of upserted.filter(x => !x.hasImage)) {
      loadImageAsync(u.id, u.name)
    }
  }

  async function deletePantryItem(id) {
    await supabase.from('pantry').delete().eq('id', id)
    setPantryItems(prev => prev.filter(i => i.id !== id))
  }

  const lowStockItems = pantryItems.filter(i => Number(i.min_qty) > 0 && Number(i.current_qty) < Number(i.min_qty))
  const outOfStockItems = pantryItems.filter(i => Number(i.current_qty) === 0)

  return (
    <PantryContext.Provider value={{
      pantryItems, loading, lowStockItems, outOfStockItems,
      addPantryItem, updateQty, updateMinQty, updateItem, deletePantryItem, addItemsBatchToPantry,
    }}>
      {children}
    </PantryContext.Provider>
  )
}

export function usePantry() {
  return useContext(PantryContext)
}
