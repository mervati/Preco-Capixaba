import { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './AuthContext'

const ListContext = createContext()

export function ListProvider({ children }) {
  const { user } = useAuth()
  const [activeList, setActiveList] = useState(null)
  const [items, setItems] = useState([])
  const [priceIndex, setPriceIndex] = useState({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user) {
      fetchOrCreateList()
      fetchPriceIndex()
    }
  }, [user])

  useEffect(() => {
    if (activeList) fetchItems(activeList.id)
    else setItems([])
  }, [activeList])

  // O app usa uma única lista de compras por usuário — cria automaticamente se ainda não existir
  async function fetchOrCreateList() {
    setLoading(true)
    const { data } = await supabase
      .from('lists')
      .select('*')
      .order('created_at', { ascending: true })
      .limit(1)

    if (data && data.length > 0) {
      setActiveList(data[0])
    } else {
      const { data: created } = await supabase
        .from('lists')
        .insert({ name: 'Minha lista', user_id: user.id })
        .select()
        .single()
      if (created) setActiveList(created)
    }
    setLoading(false)
  }

  async function fetchItems(listId) {
    const { data } = await supabase
      .from('items')
      .select('*')
      .eq('list_id', listId)
      .order('created_at', { ascending: true })
    if (data) setItems(data)
  }

  // Menor preço já registrado por produto (entre supermercados) — usado para dar uma dica de preço na lista
  async function fetchPriceIndex() {
    const { data } = await supabase
      .from('price_history')
      .select('product_name, supermarket_id, price, recorded_at, supermarkets(name, color)')
      .order('recorded_at', { ascending: false })
    if (!data) return

    const latestBySupermarket = {}
    for (const row of data) {
      latestBySupermarket[row.product_name] ??= {}
      latestBySupermarket[row.product_name][row.supermarket_id] ??= row
    }

    const cheapest = {}
    for (const [name, bySuper] of Object.entries(latestBySupermarket)) {
      const rows = Object.values(bySuper)
      cheapest[name] = rows.reduce((a, b) => (a.price <= b.price ? a : b))
    }
    setPriceIndex(cheapest)
  }

  async function addItem(item) {
    if (!activeList) return
    // Aceita quantity ou quantidade; ignora product_group (agrupamento é calculado pelo nome)
    const { product_group, quantity, quantidade, ...rest } = item
    const { data } = await supabase
      .from('items')
      .insert({ ...rest, quantidade: quantidade ?? quantity ?? 0, list_id: activeList.id, checked: false })
      .select()
      .single()
    if (data) setItems(prev => [...prev, data])
  }

  async function toggleItem(id) {
    const item = items.find(i => i.id === id)
    const { data } = await supabase
      .from('items')
      .update({ checked: !item.checked })
      .eq('id', id)
      .select()
      .single()
    if (data) setItems(prev => prev.map(i => i.id === id ? data : i))
  }

  async function deleteItem(id) {
    await supabase.from('items').delete().eq('id', id)
    setItems(prev => prev.filter(i => i.id !== id))
  }

  async function updateItemQuantity(id, quantidade) {
    const { data } = await supabase
      .from('items')
      .update({ quantidade })
      .eq('id', id)
      .select()
      .single()
    if (data) setItems(prev => prev.map(i => i.id === id ? data : i))
  }

  async function clearList() {
    if (!activeList) return
    await supabase.from('items').delete().eq('list_id', activeList.id)
    setItems([])
  }

  // Usa o preço real do item se houver; senão estima pelo menor preço já registrado para o produto
  const estimatedTotal = items.reduce((sum, i) => {
    if (Number(i.valor_total) > 0) return sum + Number(i.valor_total)
    const cheapest = priceIndex[i.nome.trim().toUpperCase()]
    return sum + (cheapest ? cheapest.price * Number(i.quantidade) : 0)
  }, 0)
  const checkedCount = items.filter(i => i.checked).length

  return (
    <ListContext.Provider value={{
      activeList, items, priceIndex, loading,
      addItem, toggleItem, deleteItem, updateItemQuantity, clearList, fetchPriceIndex,
      estimatedTotal, checkedCount,
    }}>
      {children}
    </ListContext.Provider>
  )
}

export function useList() {
  return useContext(ListContext)
}
