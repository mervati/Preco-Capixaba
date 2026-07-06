import { useState } from 'react'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { ListProvider, useList } from './contexts/ListContext'
import { SupermarketProvider } from './contexts/SupermarketContext'
import { PantryProvider } from './contexts/PantryContext'
import Login from './pages/Login'
import Prices from './pages/Prices'
import Pantry from './pages/Pantry'
import Header from './components/Header'
import ListSelector from './components/ListSelector'
import ItemCard from './components/ItemCard'
import AddItem from './components/AddItem'
import Summary from './components/Summary'
import QRScanner from './components/QRScanner'
import NewListModal from './components/NewListModal'
import BottomNav from './components/BottomNav'

function ListaPage({ onScan, onNewList }) {
  const { items, loading, activeList } = useList()
  const [showScanner, setShowScanner] = useState(false)

  return (
    <>
      <ListSelector />
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}><Spinner /></div>
        ) : !activeList ? (
          <EmptyState onNewList={onNewList} />
        ) : items.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '48px 32px', textAlign: 'center', gap: 12 }}>
            <div style={{ fontSize: 40 }}>📋</div>
            <p style={{ fontSize: 14, color: 'var(--text-muted)', lineHeight: 1.6 }}>
              Lista vazia. Adicione itens ou importe uma nota fiscal.
            </p>
          </div>
        ) : (
          items.map(item => <ItemCard key={item.id} item={item} />)
        )}
      </div>

      {activeList && (
        <>
          <Summary />
          <AddItem />
          <div style={{ padding: '8px 16px 12px' }}>
            <button
              onClick={() => setShowScanner(true)}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                background: 'linear-gradient(135deg, var(--blue-700), var(--blue-900))',
                color: '#fff', border: 'none', borderRadius: 'var(--radius-md)',
                padding: '13px', fontSize: 14, fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(35,98,168,0.25)',
              }}
            >
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
                <rect x="3" y="14" width="7" height="7"/><path d="M14 14h.01M18 14h.01M14 18h.01M18 18h.01M21 14v4M14 21h7"/>
              </svg>
              Importar nota fiscal (NFC-e)
            </button>
          </div>
        </>
      )}

      {showScanner && <QRScanner onClose={() => setShowScanner(false)} />}
    </>
  )
}

function EmptyState({ onNewList }) {
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 32px', textAlign: 'center', gap: 16 }}>
      <div style={{ fontSize: 52 }}>🛍️</div>
      <div>
        <p style={{ fontWeight: 700, fontSize: 16, color: 'var(--text)', marginBottom: 6 }}>Nenhuma lista ainda</p>
        <p style={{ fontSize: 14, color: 'var(--text-muted)', lineHeight: 1.6 }}>Crie sua primeira lista e comece a adicionar itens.</p>
      </div>
      <button onClick={onNewList} style={{ background: 'var(--blue-700)', color: '#fff', border: 'none', borderRadius: 20, padding: '10px 24px', fontSize: 14, fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer', marginTop: 4 }}>
        + Criar lista
      </button>
    </div>
  )
}

function ShoppingApp() {
  const { signOut } = useAuth()
  const [page, setPage] = useState('lista')
  const [showNewList, setShowNewList] = useState(false)

  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      height: '100dvh', maxWidth: 480, margin: '0 auto',
      background: 'var(--bg)', boxShadow: '0 0 0 1px var(--border)',
      overflow: 'hidden',
    }}>
      <Header onNewList={() => setShowNewList(true)} page={page} onSignOut={signOut} />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {page === 'lista'    && <ListaPage onNewList={() => setShowNewList(true)} />}
        {page === 'precos'   && <Prices />}
        {page === 'despensa' && <Pantry />}
      </div>

      <BottomNav active={page} onChange={setPage} />

      {showNewList && <NewListModal onClose={() => setShowNewList(false)} />}

<style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}

function AppGate() {
  const { user, loading } = useAuth()

  if (loading) return (
    <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}>
      <Spinner />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )

  if (!user) return <Login />

  return (
    <SupermarketProvider>
      <ListProvider>
        <PantryProvider>
          <ShoppingApp />
        </PantryProvider>
      </ListProvider>
    </SupermarketProvider>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <AppGate />
    </AuthProvider>
  )
}

function Spinner() {
  return <div style={{ width: 36, height: 36, borderRadius: '50%', border: '3px solid var(--border)', borderTopColor: 'var(--blue-700)', animation: 'spin 0.8s linear infinite' }} />
}
