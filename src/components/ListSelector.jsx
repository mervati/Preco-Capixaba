import { useState } from 'react'
import { useList } from '../contexts/ListContext'
import { ChevronDown, Trash } from './icons'

export default function ListSelector() {
  const { lists, activeList, setActiveList, deleteList } = useList()
  const [open, setOpen] = useState(false)

  if (!activeList) return null

  return (
    <div className="relative px-4 pt-3 pb-1">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1 text-green-800 font-semibold text-sm"
      >
        {activeList.name}
        <ChevronDown size={16} />
      </button>

      {open && (
        <div className="absolute left-4 top-9 z-10 bg-white border border-gray-200 rounded-xl shadow-lg min-w-48 overflow-hidden">
          {lists.map((list) => (
            <div
              key={list.id}
              className="flex items-center justify-between px-4 py-2.5 hover:bg-green-50 cursor-pointer group"
            >
              <span
                onClick={() => { setActiveList(list); setOpen(false) }}
                className={`text-sm flex-1 ${list.id === activeList.id ? 'text-green-700 font-semibold' : 'text-gray-700'}`}
              >
                {list.name}
              </span>
              <button
                onClick={() => deleteList(list.id)}
                className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition"
              >
                <Trash size={15} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
