import { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './AuthContext'

const SupermarketContext = createContext()

export const SUPERMARKET_COLORS = [
  '#2362a8', '#e05c20', '#16803c', '#9333ea',
  '#dc2626', '#0891b2', '#d97706', '#0f766e',
]

export function SupermarketProvider({ children }) {
  const { user } = useAuth()
  const [supermarkets, setSupermarkets] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user) fetch()
  }, [user])

  async function fetch() {
    setLoading(true)
    const { data } = await supabase
      .from('supermarkets')
      .select('*')
      .order('name')
    if (data) setSupermarkets(data)
    setLoading(false)
  }

  async function createSupermarket(name, color) {
    const { data } = await supabase
      .from('supermarkets')
      .insert({ name, color, user_id: user.id })
      .select()
      .single()
    if (data) setSupermarkets(prev => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)))
    return data
  }

  async function deleteSupermarket(id) {
    await supabase.from('supermarkets').delete().eq('id', id)
    setSupermarkets(prev => prev.filter(s => s.id !== id))
  }

  async function updateSupermarket(id, fields) {
    const { data } = await supabase
      .from('supermarkets')
      .update(fields)
      .eq('id', id)
      .select()
      .single()
    if (data) setSupermarkets(prev => prev.map(s => s.id === id ? data : s).sort((a, b) => a.name.localeCompare(b.name)))
    return data
  }

  function getSupermarket(id) {
    return supermarkets.find(s => s.id === id)
  }

  async function findOrCreateSupermarket(name) {
    if (!name?.trim()) return null
    const clean = name.trim()
    const existing = supermarkets.find(s => s.name.toLowerCase() === clean.toLowerCase())
    if (existing) return existing
    return createSupermarket(clean, SUPERMARKET_COLORS[supermarkets.length % SUPERMARKET_COLORS.length])
  }

  async function recordPrices(items, supermarketId) {
    if (!supermarketId || !user) return
    const priced = items.filter(i => i.valor_unitario > 0)
    if (priced.length === 0) return
    await supabase.from('price_history').insert(
      priced.map(i => ({
        user_id: user.id,
        product_name: i.nome,
        supermarket_id: supermarketId,
        price: i.valor_unitario,
      }))
    )
  }

  return (
    <SupermarketContext.Provider value={{ supermarkets, loading, createSupermarket, updateSupermarket, deleteSupermarket, getSupermarket, findOrCreateSupermarket, recordPrices }}>
      {children}
    </SupermarketContext.Provider>
  )
}

export function useSupermarket() {
  return useContext(SupermarketContext)
}
