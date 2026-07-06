import { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './AuthContext'

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

  async function deletePantryItem(id) {
    await supabase.from('pantry').delete().eq('id', id)
    setPantryItems(prev => prev.filter(i => i.id !== id))
  }

  const lowStockItems = pantryItems.filter(i => Number(i.current_qty) < Number(i.min_qty))
  const outOfStockItems = pantryItems.filter(i => Number(i.current_qty) === 0)

  return (
    <PantryContext.Provider value={{
      pantryItems, loading, lowStockItems, outOfStockItems,
      addPantryItem, updateQty, updateItem, deletePantryItem,
    }}>
      {children}
    </PantryContext.Provider>
  )
}

export function usePantry() {
  return useContext(PantryContext)
}
