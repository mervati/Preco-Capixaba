import { useState, useEffect } from 'react'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { ListProvider, useList } from './contexts/ListContext'
import { SupermarketProvider } from './contexts/SupermarketContext'
import { PantryProvider, usePantry } from './contexts/PantryContext'
import { stripSizeFromName } from './lib/productLookup'
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

function GroupedItemCard({ group, pantryItems }) {
  const { toggleItem, deleteItem, priceIndex } = useList()
  const { updateQty } = usePantry()
  const [showChooseModal, setShowChooseModal] = useState(false)
  const [showPrices, setShowPrices] = useState(false)

  // Busca itens da despensa que correspondem ao grupo (compara nome sem tamanho)
  const matchingPantryItems = pantryItems.filter(p => {
    const pNameWithoutSize = stripSizeFromName(p.product_name).trim().toUpperCase()
    const groupDisplay = group.displayName.trim().toUpperCase()
    return pNameWithoutSize === groupDisplay
  })

  // Último preço de cada marca (do priceIndex, chaveado por product_name)
  const brandPrices = matchingPantryItems.map(p => ({
    item: p,
    price: priceIndex[p.product_name.trim().toUpperCase()],
  }))
  const hasAnyPrice = brandPrices.some(b => b.price)
  const totalQty = group.items.reduce((sum, i) => sum + Number(i.quantidade), 0)
  const anyChecked = group.items.some(i => i.checked)
  const firstItem = group.items[0]
  const cheapest = priceIndex[firstItem.nome.trim().toUpperCase()]

  function handleToggle() {
    if (matchingPantryItems.length > 1 && !anyChecked) {
      setShowChooseModal(true)
    } else {
      for (const item of group.items) {
        toggleItem(item.id)
      }
    }
  }

  async function handleChoosePantryItem(pantryItem) {
    const newQty = Math.max(0, Number(pantryItem.current_qty) - totalQty)
    await updateQty(pantryItem.id, newQty)
    for (const item of group.items) {
      await toggleItem(item.id)
    }
    setShowChooseModal(false)
  }

  function handleDelete() {
    for (const item of group.items) {
      deleteItem(item.id)
    }
  }

  return (
    <>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '13px 20px',
        borderBottom: '1px solid var(--border)',
        background: anyChecked ? 'var(--green-50)' : 'var(--surface)',
        transition: 'background 0.15s',
      }}>
        <button onClick={handleToggle} style={{
          width: 24, height: 24, borderRadius: '50%', flexShrink: 0,
          border: anyChecked ? 'none' : '2px solid var(--border-strong)',
          background: anyChecked ? 'var(--green-700)' : 'transparent',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', transition: 'all 0.15s',
        }}>
          {anyChecked && (
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          )}
        </button>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: 14, fontWeight: 500, lineHeight: 1.3,
            color: anyChecked ? 'var(--text-muted)' : 'var(--text)',
            textDecoration: anyChecked ? 'line-through' : 'none',
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>{group.displayName}</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2, display: 'flex', alignItems: 'center', gap: 5 }}>
            {totalQty}×
            {cheapest ? (
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: cheapest.supermarkets?.color || 'var(--border)' }} />
                A partir de R$ {Number(cheapest.price).toFixed(2).replace('.', ',')} · {cheapest.supermarkets?.name}
              </span>
            ) : null}
          </div>
        </div>

        {/* Ver preços por marca — só quando há mais de uma marca */}
        {matchingPantryItems.length > 1 && (
          <button onClick={() => setShowPrices(true)} title="Ver preço de cada marca" style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--blue-700)', padding: 4, borderRadius: 6,
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
              <line x1="7" y1="7" x2="7.01" y2="7" />
            </svg>
          </button>
        )}

        <button onClick={handleDelete} style={{
          background: 'none', border: 'none', cursor: 'pointer',
          color: 'var(--border-strong)', padding: 4, borderRadius: 6,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'color 0.15s', flexShrink: 0,
        }}
        onMouseEnter={e => e.currentTarget.style.color = '#e53e3e'}
        onMouseLeave={e => e.currentTarget.style.color = 'var(--border-strong)'}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
            <path d="M10 11v6M14 11v6M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
          </svg>
        </button>
      </div>

      {showPrices && (
        <div
          onClick={() => setShowPrices(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 100,
            background: 'rgba(0,0,0,0.45)',
            display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
          }}
        >
          <div onClick={e => e.stopPropagation()} style={{
            width: '100%', maxWidth: 480, background: 'var(--surface)',
            borderRadius: 'var(--radius-lg) var(--radius-lg) 0 0', padding: '24px 20px 32px',
          }}>
            <div style={{ marginBottom: 4 }}>
              <span style={{ fontSize: 17, fontWeight: 700, color: 'var(--text)', textTransform: 'capitalize' }}>
                {group.displayName.toLowerCase()}
              </span>
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 20 }}>
              Último preço de cada marca
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {brandPrices
                .slice()
                .sort((a, b) => (a.price?.price ?? Infinity) - (b.price?.price ?? Infinity))
                .map(({ item, price }, i) => {
                  const isCheapest = price && i === 0 && brandPrices.filter(b => b.price).length > 1
                  return (
                    <div key={item.id} style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
                      padding: '12px 16px',
                      background: isCheapest ? '#dcfce7' : 'var(--blue-50)',
                      border: `1.5px solid ${isCheapest ? '#bbf7d0' : 'var(--blue-100)'}`,
                      borderRadius: 'var(--radius-sm)',
                    }}>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', textTransform: 'capitalize' }}>
                          {(item.brand || item.product_name).toLowerCase()}
                          {isCheapest && <span style={{ marginLeft: 6, fontSize: 10, fontWeight: 700, color: '#15803d' }}>MAIS BARATO</span>}
                        </div>
                        {price?.supermarkets?.name && (
                          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2, display: 'flex', alignItems: 'center', gap: 5 }}>
                            <span style={{ width: 6, height: 6, borderRadius: '50%', background: price.supermarkets.color || 'var(--border)' }} />
                            {price.supermarkets.name}
                            {price.recorded_at && ` · ${new Date(price.recorded_at).toLocaleDateString('pt-BR')}`}
                          </div>
                        )}
                      </div>
                      <div className="tabular" style={{ fontSize: 15, fontWeight: 700, color: isCheapest ? '#15803d' : 'var(--text)', flexShrink: 0 }}>
                        {price ? `R$ ${Number(price.price).toFixed(2).replace('.', ',')}` : '—'}
                      </div>
                    </div>
                  )
                })}
            </div>

            {!hasAnyPrice && (
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 12, textAlign: 'center' }}>
                Nenhum preço registrado ainda. Importe uma nota fiscal para começar.
              </div>
            )}

            <button
              onClick={() => setShowPrices(false)}
              style={{
                width: '100%', marginTop: 16, padding: '12px 0',
                background: 'none', border: '1.5px solid var(--border)',
                borderRadius: 'var(--radius-sm)',
                fontSize: 14, fontWeight: 600, color: 'var(--text-2)',
                cursor: 'pointer', fontFamily: 'inherit',
              }}
            >
              Fechar
            </button>
          </div>
        </div>
      )}

      {showChooseModal && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 100,
          background: 'rgba(0,0,0,0.45)',
          display: 'flex', alignItems: 'flex-end',
        }} onClick={e => e.target === e.currentTarget && setShowChooseModal(false)}>
          <div style={{
            width: '100%', maxWidth: 480, margin: '0 auto',
            background: 'var(--surface)',
            borderRadius: 'var(--radius-lg) var(--radius-lg) 0 0',
            padding: '24px 20px 32px',
          }}>
            <div style={{ marginBottom: 20 }}>
              <span style={{ fontSize: 17, fontWeight: 700, color: 'var(--text)' }}>Qual marca você comprou?</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {matchingPantryItems.map(pItem => (
                <button key={pItem.id} onClick={() => handleChoosePantryItem(pItem)} style={{
                  width: '100%', padding: '12px 16px',
                  background: 'var(--blue-50)', border: '1.5px solid var(--blue-200)',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: 14, fontWeight: 500, color: 'var(--text)',
                  cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--blue-100)'}
                onMouseLeave={e => e.currentTarget.style.background = 'var(--blue-50)'}>
                  <div style={{ fontWeight: 600 }}>{pItem.product_name}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                    {pItem.brand && `${pItem.brand} · `}Em estoque: {pItem.current_qty} {pItem.unit}
                  </div>
                </button>
              ))}
            </div>

            <button onClick={() => setShowChooseModal(false)} style={{
              width: '100%', marginTop: 16, padding: '12px 0',
              background: 'none', border: '1.5px solid var(--border)',
              borderRadius: 'var(--radius-sm)',
              fontSize: 14, fontWeight: 600, color: 'var(--text-2)',
              cursor: 'pointer', fontFamily: 'inherit',
            }}>Cancelar</button>
          </div>
        </div>
      )}
    </>
  )
}

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

  // Agrupa itens da lista sempre pelo nome sem tamanho (robusto a dados antigos)
  function getProductGroup(nome) {
    return stripSizeFromName(nome) || nome
  }

  const grouped = {}
  for (const item of items) {
    const pg = getProductGroup(item.nome)
    const key = pg.trim().toUpperCase()
    if (!grouped[key]) {
      grouped[key] = { displayName: pg, items: [] }
    }
    grouped[key].items.push(item)
  }

  const groupedItems = Object.values(grouped)

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
          groupedItems.map(group => (
            <GroupedItemCard key={group.displayName} group={group} pantryItems={pantryItems} />
          ))
        )}
      </div>

      <Summary />
      {items.length > 0 && (
        <div style={{ padding: '8px 16px', background: 'var(--surface)', borderTop: '1px solid var(--border)' }}>
          <button
            onClick={handleShareWhatsApp}
            title="Compartilhar lista no WhatsApp"
            style={{
              width: '100%', padding: '11px 14px',
              background: '#25D366', color: '#fff',
              border: 'none', borderRadius: 'var(--radius-sm)',
              fontSize: 14, fontWeight: 700, cursor: 'pointer',
              fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.71.306 1.263.489 1.694.625.712.227 1.36.195 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413"/>
            </svg>
            Compartilhar no WhatsApp
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
