import { useList } from '../contexts/ListContext'
import { Trash, Check } from './icons'

export default function ItemCard({ item }) {
  const { toggleItem, deleteItem, updateItemQuantity } = useList()

  return (
    <div
      className={`flex items-center gap-3 px-4 py-3 border-b border-gray-100 last:border-0 transition ${
        item.checked ? 'opacity-50' : ''
      }`}
    >
      <button
        onClick={() => toggleItem(item.id)}
        className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition ${
          item.checked
            ? 'bg-green-500 border-green-500 text-white'
            : 'border-gray-300 hover:border-green-400'
        }`}
      >
        {item.checked && <Check size={13} />}
      </button>

      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium truncate ${item.checked ? 'line-through text-gray-400' : 'text-gray-800'}`}>
          {item.nome}
        </p>
        {item.valor_unitario && (
          <p className="text-xs text-gray-400">
            {item.quantidade}x R$ {Number(item.valor_unitario).toFixed(2)}
          </p>
        )}
      </div>

      <div className="flex items-center gap-2">
        {item.valor_total && (
          <span className="text-sm font-semibold text-green-700">
            R$ {Number(item.valor_total).toFixed(2)}
          </span>
        )}
        <button
          onClick={() => deleteItem(item.id)}
          className="text-gray-300 hover:text-red-400 transition"
        >
          <Trash size={16} />
        </button>
      </div>
    </div>
  )
}
