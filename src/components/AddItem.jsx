import { useState } from 'react'
import { useList } from '../contexts/ListContext'
import { Plus } from './icons'

export default function AddItem() {
  const { addItem } = useList()
  const [nome, setNome] = useState('')
  const [quantidade, setQuantidade] = useState(1)

  async function handleSubmit(e) {
    e.preventDefault()
    if (!nome.trim()) return
    await addItem({ nome: nome.trim().toUpperCase(), quantidade })
    setNome('')
    setQuantidade(1)
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2 px-4 py-3 bg-white border-t border-gray-100">
      <input
        value={nome}
        onChange={(e) => setNome(e.target.value)}
        placeholder="Adicionar item..."
        className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
      />
      <input
        type="number"
        min="1"
        value={quantidade}
        onChange={(e) => setQuantidade(Number(e.target.value))}
        className="w-16 border border-gray-200 rounded-lg px-2 py-2 text-sm text-center focus:outline-none focus:ring-2 focus:ring-green-400"
      />
      <button
        type="submit"
        className="bg-green-600 text-white rounded-lg px-3 py-2 hover:bg-green-700 transition"
      >
        <Plus size={18} />
      </button>
    </form>
  )
}
