import { useState, useEffect } from 'react'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { ListProvider, useList } from './contexts/ListContext'
import { SupermarketProvider } from './contexts/SupermarketContext'
import { PantryProvider } from './contexts/PantryContext'
import Login from './pages/Login'
import Prices from './pages/Prices'
import Pantry from './pages/Pantry'
import History from './pages/History'
import Header from './components/Header'
import ItemCard from './components/ItemCard'
import Summary from './components/Summary'
import BottomNav from './components/BottomNav'
import FinalizarModal from './components/FinalizarModal'
import ManageSupermarketsModal from './components/ManageSupermarketsModal'
import SplashScreen from './components/SplashScreen'

function ListaPage({ onFinalizar }) {
  const { items, loading } = useList()

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', overscrollBehavior: 'contain' }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}><Spinner /></div>
        ) : items.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '48px 32px', textAlign: 'center', gap: 12 }}>
            <div style={{ fontSize: 40 }}>📋</div>
            <p style={{ fontSize: 14, color: 'var(--text-muted)', lineHeight: 1.6 }}>
              Lista vazia. Gerencie seus produtos na Despensa e eles aparecerão aqui automaticamente quando o estoque estiver baixo.
            </p>
          </div>
        ) : (
          items.map(item => <ItemCard key={item.id} item={item} />)
        )}
      </div>

      <Summary />
      {items.length > 0 && (
        <div style={{ padding: '8px 16px', background: 'var(--surface)', borderTop: '1px solid var(--border)' }}>
          <button
            onClick={onFinalizar}
            style={{
              width: '100%', padding: '11px 0',
              background: 'var(--blue-700)', color: '#fff',
              border: 'none', borderRadius: 'var(--radius-sm)',
              fontSize: 14, fontWeight: 700, cursor: 'pointer',
              fontFamily: 'inherit', transition: 'background 0.15s',
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--blue-900)'}
            onMouseLeave={e => e.currentTarget.style.background = 'var(--blue-700)'}
          >
            Finalizar compra
          </button>
        </div>
      )}
    </div>
  )
}

function ShoppingApp() {
  const { signOut } = useAuth()
  const [page, setPage] = useState('lista')
  const [showSupermarkets, setShowSupermarkets] = useState(false)
  const [showFinalizar, setShowFinalizar] = useState(false)

  useEffect(() => {
    // iOS Safari: position:fixed não recalcula corretamente na carga inicial.
    // visualViewport devolve a altura visual real (excluindo a barra do browser).
    function setVh() {
      const h = window.visualViewport?.height ?? window.innerHeight
      document.documentElement.style.setProperty('--app-height', `${h}px`)
    }
    // Leitura inicial (corrige o bug do iOS Safari na carga)
    setVh()
    // Atualiza só na rotação — NÃO no resize do scroll (causaria re-renders durante o scroll)
    window.addEventListener('orientationchange', () => setTimeout(setVh, 200))
    return () => window.removeEventListener('orientationchange', setVh)
  }, [])


  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      height: 'var(--app-height, 100dvh)',
      maxWidth: 480, margin: '0 auto',
      background: 'var(--bg)', boxShadow: '0 0 0 1px var(--border)',
      touchAction: 'pan-y',
    }}>
      <Header page={page} onSignOut={signOut} onOpenSupermarkets={() => setShowSupermarkets(true)} />

      <div style={{
        flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column',
        paddingBottom: 'calc(64px + env(safe-area-inset-bottom))',
      }}>
        {page === 'lista'     && <ListaPage onFinalizar={() => setShowFinalizar(true)} />}
        {page === 'precos'    && <Prices />}
        {page === 'despensa'  && <Pantry />}
        {page === 'historico' && <History />}
      </div>

      <BottomNav active={page} onChange={setPage} />

      {showSupermarkets && <ManageSupermarketsModal onClose={() => setShowSupermarkets(false)} />}
      {showFinalizar && (
        <FinalizarModal
          onClose={() => setShowFinalizar(false)}
          onSaved={() => { setShowFinalizar(false); setPage('historico') }}
        />
      )}

<style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}

function AppGate() {
  const { user, loading } = useAuth()
  const [minDone, setMinDone] = useState(false)

  useEffect(() => {
    const id = setTimeout(() => setMinDone(true), 1600)
    return () => clearTimeout(id)
  }, [])

  if (loading || !minDone) return <SplashScreen />

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
