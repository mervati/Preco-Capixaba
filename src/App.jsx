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
import AddItem from './components/AddItem'
import Summary from './components/Summary'
import BottomNav from './components/BottomNav'
import FinalizarModal from './components/FinalizarModal'
import ManageSupermarketsModal from './components/ManageSupermarketsModal'

function ListaPage({ onFinalizar }) {
  const { items, loading } = useList()

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}><Spinner /></div>
        ) : items.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '48px 32px', textAlign: 'center', gap: 12 }}>
            <div style={{ fontSize: 40 }}>📋</div>
            <p style={{ fontSize: 14, color: 'var(--text-muted)', lineHeight: 1.6 }}>
              Lista vazia. Adicione itens manualmente ou deixe a Despensa adicionar automaticamente.
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
      <AddItem />
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
    setVh()
    window.visualViewport?.addEventListener('resize', setVh)
    window.addEventListener('orientationchange', setVh)
    return () => {
      window.visualViewport?.removeEventListener('resize', setVh)
      window.removeEventListener('orientationchange', setVh)
    }
  }, [])

  useEffect(() => {
    // Impede o rubber band / bounce do iOS no nível do documento.
    const prevent = (e) => {
      let el = e.target
      while (el && el !== document.body) {
        const oy = window.getComputedStyle(el).overflowY
        if ((oy === 'auto' || oy === 'scroll') && el.scrollHeight > el.clientHeight) return
        el = el.parentElement
      }
      e.preventDefault()
    }
    document.addEventListener('touchmove', prevent, { passive: false })
    return () => document.removeEventListener('touchmove', prevent)
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
        flex: 1, display: 'flex', flexDirection: 'column',
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
