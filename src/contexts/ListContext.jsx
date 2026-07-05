import { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const ListContext = createContext()

export function ListProvider({ children }) {
  const [lists, setLists] = useState([])
  const [activeList, setActiveList] = useState(null)
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchLists()
  }, [])

  useEffect(() => {
    if (activeList) fetchItems(activeList.id)
  }, [activeList])

  async function fetchLists() {
    setLoading(true)
    const { data } = await supabase
      .from('lists')
      .select('*')
      .order('created_at', { ascending: false })
    if (data) {
      setLists(data)
      if (data.length > 0) setActiveList(data[0])
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

  async function createList(name) {
    const { data } = await supabase
      .from('lists')
      .insert({ name })
      .select()
      .single()
    if (data) {
      setLists((prev) => [data, ...prev])
      setActiveList(data)
      setItems([])
    }
    return data
  }

  async function deleteList(id) {
    await supabase.from('items').delete().eq('list_id', id)
    await supabase.from('lists').delete().eq('id', id)
    const remaining = lists.filter((l) => l.id !== id)
    setLists(remaining)
    setActiveList(remaining[0] || null)
    setItems([])
  }

  async function addItem(item) {
    if (!activeList) return
    const { data } = await supabase
      .from('items')
      .insert({ ...item, list_id: activeList.id, checked: false })
      .select()
      .single()
    if (data) setItems((prev) => [...prev, data])
  }

  async function addItemsBatch(newItems) {
    if (!activeList) return
    const rows = newItems.map((item) => ({ ...item, list_id: activeList.id, checked: false }))
    const { data } = await supabase.from('items').insert(rows).select()
    if (data) setItems((prev) => [...prev, ...data])
  }

  async function toggleItem(id) {
    const item = items.find((i) => i.id === id)
    const { data } = await supabase
      .from('items')
      .update({ checked: !item.checked })
      .eq('id', id)
      .select()
      .single()
    if (data) setItems((prev) => prev.map((i) => (i.id === id ? data : i)))
  }

  async function deleteItem(id) {
    await supabase.from('items').delete().eq('id', id)
    setItems((prev) => prev.filter((i) => i.id !== id))
  }

  async function updateItemQuantity(id, quantidade) {
    const { data } = await supabase
      .from('items')
      .update({ quantidade })
      .eq('id', id)
      .select()
      .single()
    if (data) setItems((prev) => prev.map((i) => (i.id === id ? data : i)))
  }

  const totalValue = items.reduce((sum, i) => sum + (i.valor_total || 0), 0)
  const checkedCount = items.filter((i) => i.checked).length

  return (
    <ListContext.Provider
      value={{
        lists,
        activeList,
        setActiveList,
        items,
        loading,
        createList,
        deleteList,
        addItem,
        addItemsBatch,
        toggleItem,
        deleteItem,
        updateItemQuantity,
        totalValue,
        checkedCount,
      }}
    >
      {children}
    </ListContext.Provider>
  )
}

export function useList() {
  return useContext(ListContext)
}
