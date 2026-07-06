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

  function getSupermarket(id) {
    return supermarkets.find(s => s.id === id)
  }

  return (
    <SupermarketContext.Provider value={{ supermarkets, loading, createSupermarket, deleteSupermarket, getSupermarket }}>
      {children}
    </SupermarketContext.Provider>
  )
}

export function useSupermarket() {
  return useContext(SupermarketContext)
}
