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

  async function createSupermarket(name, color, razaoSocial = null) {
    const { data } = await supabase
      .from('supermarkets')
      .insert({ name, color, razao_social: razaoSocial, user_id: user.id })
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

  // Acha o supermercado já salvo cuja razão social (nome feio da nota) bate — pra
  // reusar o nome bonito que o usuário deu antes
  function findSupermarketByRazaoSocial(razao) {
    if (!razao?.trim()) return null
    const r = razao.trim().toLowerCase()
    return supermarkets.find(s => (s.razao_social || '').trim().toLowerCase() === r) || null
  }

  async function findOrCreateSupermarket(name, razaoSocial = null) {
    if (!name?.trim()) return null
    const clean = name.trim()
    const existing = supermarkets.find(s => s.name.toLowerCase() === clean.toLowerCase())
    if (existing) {
      // Aprende a razão social nesse supermercado se ainda não tiver (pra reconhecer futuras notas)
      if (razaoSocial?.trim() && !existing.razao_social) {
        return (await updateSupermarket(existing.id, { razao_social: razaoSocial.trim() })) || existing
      }
      return existing
    }
    return createSupermarket(clean, SUPERMARKET_COLORS[supermarkets.length % SUPERMARKET_COLORS.length], razaoSocial?.trim() || null)
  }

  async function recordPrices(items, supermarketId, tripId = null) {
    if (!supermarketId || !user) return
    const priced = items.filter(i => i.valor_unitario > 0)
    if (priced.length === 0) return
    await supabase.from('price_history').insert(
      priced.map(i => ({
        user_id: user.id,
        product_name: i.nome,
        supermarket_id: supermarketId,
        price: i.valor_unitario,
        trip_id: tripId,
      }))
    )
  }

  return (
    <SupermarketContext.Provider value={{ supermarkets, loading, createSupermarket, updateSupermarket, deleteSupermarket, getSupermarket, findOrCreateSupermarket, findSupermarketByRazaoSocial, recordPrices }}>
      {children}
    </SupermarketContext.Provider>
  )
}

export function useSupermarket() {
  return useContext(SupermarketContext)
}
