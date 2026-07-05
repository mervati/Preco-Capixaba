import { useList } from '../contexts/ListContext'

export default function Summary() {
  const { items, totalValue, checkedCount } = useList()

  if (items.length === 0) return null

  return (
    <div className="px-4 py-2 bg-green-50 border-t border-green-100 flex justify-between items-center text-sm">
      <span className="text-gray-500">
        {checkedCount}/{items.length} itens
      </span>
      <span className="font-bold text-green-700">
        Total: R$ {totalValue.toFixed(2)}
      </span>
    </div>
  )
}
