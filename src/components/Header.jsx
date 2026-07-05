import { ShoppingCart } from './icons'

export default function Header({ onNewList }) {
  return (
    <header className="bg-green-600 text-white px-4 py-3 flex items-center justify-between shadow-md">
      <div className="flex items-center gap-2">
        <ShoppingCart size={22} />
        <span className="font-bold text-lg tracking-tight">Preço Capixaba</span>
      </div>
      <button
        onClick={onNewList}
        className="bg-white text-green-700 text-sm font-semibold px-3 py-1.5 rounded-full hover:bg-green-50 transition"
      >
        + Nova lista
      </button>
    </header>
  )
}
