import { useState, lazy, Suspense } from 'react'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { ListProvider, useList } from './contexts/ListContext'
import { SupermarketProvider } from './contexts/SupermarketContext'
import { PantryProvider } from './contexts/PantryContext'
import Login from './pages/Login'
import Prices from './pages/Prices'
import Pantry from './pages/Pantry'
import Header from './components/Header'
import ItemCard from './components/ItemCard'
import AddItem from './components/AddItem'
import Summary from './components/Summary'
import BottomNav from './components/BottomNav'
import ManageSupermarketsModal from './components/ManageSupermarketsModal'

// Só baixa a biblioteca de leitura de QR Code quando o usuário abre o scanner
const QRScanner = lazy(() => import('./components/QRScanner'))

function ListaPage() {
  const { items, loading } = useList()
  const [showScanner, setShowScanner] = useState(false)

  return (
    <>
      <div style={{ padding: '14px 16px 4px' }}>
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
          Escanear nota fiscal (NFC-e)
        </button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto' }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}><Spinner /></div>
        ) : items.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '48px 32px', textAlign: 'center', gap: 12 }}>
            <div style={{ fontSize: 40 }}>📋</div>
            <p style={{ fontSize: 14, color: 'var(--text-muted)', lineHeight: 1.6 }}>
              Lista vazia. Escaneie uma nota fiscal ou adicione itens manualmente.
            </p>
          </div>
        ) : (
          items.map(item => <ItemCard key={item.id} item={item} />)
        )}
      </div>

      <Summary />
      <AddItem />

      {showScanner && (
        <Suspense fallback={
          <div style={{ position: 'absolute', inset: 0, zIndex: 50, background: 'rgba(10,15,10,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Spinner />
          </div>
        }>
          <QRScanner onClose={() => setShowScanner(false)} />
        </Suspense>
      )}
    </>
  )
}

function ShoppingApp() {
  const { signOut } = useAuth()
  const [page, setPage] = useState('lista')
  const [showSupermarkets, setShowSupermarkets] = useState(false)

  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      height: '100dvh', maxWidth: 480, margin: '0 auto',
      background: 'var(--bg)', boxShadow: '0 0 0 1px var(--border)',
      overflow: 'hidden', position: 'relative',
      touchAction: 'pan-y',
    }}>
      <Header page={page} onSignOut={signOut} onOpenSupermarkets={() => setShowSupermarkets(true)} />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {page === 'lista'    && <ListaPage />}
        {page === 'precos'   && <Prices />}
        {page === 'despensa' && <Pantry />}
      </div>

      <BottomNav active={page} onChange={setPage} />

      {showSupermarkets && <ManageSupermarketsModal onClose={() => setShowSupermarkets(false)} />}

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
