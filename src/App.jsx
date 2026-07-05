import { useState } from 'react'
import { ListProvider, useList } from './contexts/ListContext'
import Header from './components/Header'
import ListSelector from './components/ListSelector'
import ItemCard from './components/ItemCard'
import AddItem from './components/AddItem'
import Summary from './components/Summary'
import QRScanner from './components/QRScanner'
import NewListModal from './components/NewListModal'
import { QRCode, Receipt } from './components/icons'

function ShoppingApp() {
  const { items, loading, activeList } = useList()
  const [showScanner, setShowScanner] = useState(false)
  const [showNewList, setShowNewList] = useState(false)

  return (
    <div className="flex flex-col min-h-dvh max-w-md mx-auto bg-white shadow-sm">
      <Header onNewList={() => setShowNewList(true)} />

      <ListSelector />

      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex justify-center items-center py-16">
            <div className="w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : !activeList ? (
          <div className="flex flex-col items-center justify-center py-20 px-6 text-center gap-4">
            <Receipt size={48} />
            <p className="text-gray-500 text-sm">Crie uma lista para começar</p>
            <button
              onClick={() => setShowNewList(true)}
              className="bg-green-600 text-white px-6 py-2 rounded-full text-sm font-semibold hover:bg-green-700 transition"
            >
              + Nova lista
            </button>
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-6 text-center gap-3">
            <Receipt size={40} />
            <p className="text-gray-500 text-sm">
              Lista vazia. Adicione itens abaixo ou importe uma nota fiscal.
            </p>
          </div>
        ) : (
          <div>
            {items.map((item) => (
              <ItemCard key={item.id} item={item} />
            ))}
          </div>
        )}
      </div>

      {activeList && (
        <>
          <Summary />
          <AddItem />
          <button
            onClick={() => setShowScanner(true)}
            className="flex items-center justify-center gap-2 mx-4 mb-4 mt-2 bg-green-700 text-white py-3 rounded-xl font-semibold text-sm hover:bg-green-800 transition shadow"
          >
            <QRCode size={18} />
            Importar nota fiscal (NFC-e)
          </button>
        </>
      )}

      {showScanner && <QRScanner onClose={() => setShowScanner(false)} />}
      {showNewList && <NewListModal onClose={() => setShowNewList(false)} />}
    </div>
  )
}

export default function App() {
  return (
    <ListProvider>
      <ShoppingApp />
    </ListProvider>
  )
}
