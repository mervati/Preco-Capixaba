import { useState, useEffect } from 'react'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { ListProvider, useList } from './contexts/ListContext'
import { SupermarketProvider } from './contexts/SupermarketContext'
import { PantryProvider, usePantry } from './contexts/PantryContext'
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
  const { pantryItems } = usePantry()

  // Monta a lista em texto (quantidade, nome, marca) e abre o WhatsApp
  function handleShareWhatsApp() {
    const lines = items.map(it => {
      const brand = pantryItems.find(p => p.product_name.trim().toUpperCase() === it.nome.trim().toUpperCase())?.brand
      return `• ${it.quantidade}× ${it.nome}${brand ? ` (${brand})` : ''}`
    })
    const text = `*Lista de compras*\n\n${lines.join('\n')}\n\n${items.length} ${items.length === 1 ? 'item' : 'itens'}`
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank')
  }

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
        <div style={{ padding: '8px 16px', background: 'var(--surface)', borderTop: '1px solid var(--border)', display: 'flex', gap: 8 }}>
          <button
            onClick={handleShareWhatsApp}
            title="Compartilhar lista no WhatsApp"
            style={{
              flexShrink: 0, padding: '11px 14px',
              background: '#25D366', color: '#fff',
              border: 'none', borderRadius: 'var(--radius-sm)',
              fontSize: 14, fontWeight: 700, cursor: 'pointer',
              fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 6,
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.71.306 1.263.489 1.694.625.712.227 1.36.195 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413"/>
            </svg>
          </button>
          <button
            onClick={onFinalizar}
            style={{
              flex: 1, padding: '11px 0',
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
      maxWidth: 480, margin: '0 auto', width: '100%',
      background: 'var(--bg)',
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
