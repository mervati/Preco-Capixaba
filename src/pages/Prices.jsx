import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { useSupermarket } from '../contexts/SupermarketContext'

export default function Prices() {
  const { user } = useAuth()
  const { supermarkets } = useSupermarket()
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    if (user) fetchHistory()
  }, [user])

  async function fetchHistory() {
    setLoading(true)
    const { data } = await supabase
      .from('price_history')
      .select('*, supermarkets(id, name, color)')
      .order('recorded_at', { ascending: false })
    if (data) setHistory(data)
    setLoading(false)
  }

  // Agrupa por produto → supermercado → preço mais recente
  const grouped = {}
  for (const row of history) {
    const key = row.product_name
    if (!grouped[key]) grouped[key] = {}
    const sid = row.supermarket_id
    if (!grouped[key][sid]) {
      grouped[key][sid] = { price: row.price, supermarket: row.supermarkets, recorded_at: row.recorded_at }
    }
  }

  const products = Object.entries(grouped)
    .map(([name, bySuper]) => {
      const entries = Object.values(bySuper)
      const prices = entries.map(e => e.price)
      const minPrice = Math.min(...prices)
      const maxPrice = Math.max(...prices)
      const pctDiff = entries.length > 1 ? Math.round(((maxPrice - minPrice) / minPrice) * 100) : null
      return { name, entries, minPrice, maxPrice, pctDiff }
    })
    .filter(p => p.name.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => a.name.localeCompare(b.name))

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '16px 0' }}>
      {/* Search */}
      <div style={{ padding: '0 16px 12px' }}>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar produto..."
          style={{
            width: '100%', border: '1.5px solid var(--border)',
            borderRadius: 'var(--radius-sm)', padding: '10px 14px',
            fontSize: 14, fontFamily: 'inherit', background: 'var(--bg)',
            color: 'var(--text)', outline: 'none',
          }}
          onFocus={e => e.target.style.borderColor = 'var(--blue-500)'}
          onBlur={e => e.target.style.borderColor = 'var(--border)'}
        />
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}>
          <Spinner />
        </div>
      ) : products.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px 32px', color: 'var(--text-muted)' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>📊</div>
          <p style={{ fontSize: 14, lineHeight: 1.6 }}>
            {history.length === 0
              ? 'Importe uma NFC-e com supermercado vinculado para ver a comparação de preços.'
              : 'Nenhum produto encontrado.'}
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {products.map(product => (
            <ProductCard key={product.name} product={product} />
          ))}
        </div>
      )}
    </div>
  )
}

function ProductCard({ product }) {
  const [open, setOpen] = useState(false)
  const { name, entries, minPrice, maxPrice, pctDiff } = product

  return (
    <div style={{
      background: 'var(--surface)',
      borderBottom: '1px solid var(--border)',
    }}>
      <button
        onClick={() => setOpen(v => !v)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center',
          padding: '13px 16px', background: 'none', border: 'none',
          cursor: 'pointer', fontFamily: 'inherit', gap: 10,
          textAlign: 'left',
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 2, textTransform: 'capitalize' }}>
            {name.toLowerCase()}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
            {entries.length} {entries.length === 1 ? 'supermercado' : 'supermercados'}
          </div>
        </div>

        {pctDiff !== null && (
          <div style={{
            background: 'var(--gold-light)', color: 'var(--gold)',
            borderRadius: 20, padding: '3px 10px',
            fontSize: 12, fontWeight: 700,
          }}>
            {pctDiff}% diferença
          </div>
        )}

        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2">
          <polyline points={open ? "18 15 12 9 6 15" : "6 9 12 15 18 9"} />
        </svg>
      </button>

      {open && (
        <div style={{ padding: '0 16px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {entries.map((entry, i) => {
            const isCheapest = entry.price === minPrice && entries.length > 1
            const isMostExp = entry.price === maxPrice && entries.length > 1
            const barPct = maxPrice > 0 ? (entry.price / maxPrice) * 100 : 100

            return (
              <div key={i}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div style={{
                      width: 8, height: 8, borderRadius: '50%',
                      background: entry.supermarket?.color || 'var(--border)',
                    }} />
                    <span style={{ fontSize: 13, color: 'var(--text-2)' }}>
                      {entry.supermarket?.name || 'Desconhecido'}
                    </span>
                    {isCheapest && <span style={{ fontSize: 10, background: '#dcfce7', color: '#15803d', padding: '1px 6px', borderRadius: 10, fontWeight: 700 }}>MAIS BARATO</span>}
                    {isMostExp && entries.length > 1 && <span style={{ fontSize: 10, background: '#fee2e2', color: '#dc2626', padding: '1px 6px', borderRadius: 10, fontWeight: 700 }}>MAIS CARO</span>}
                  </div>
                  <span className="tabular" style={{ fontSize: 13, fontWeight: 700, color: isCheapest ? '#15803d' : isMostExp ? '#dc2626' : 'var(--text)' }}>
                    R$ {Number(entry.price).toFixed(2).replace('.', ',')}
                  </span>
                </div>
                <div style={{ height: 4, background: 'var(--border)', borderRadius: 99, overflow: 'hidden' }}>
                  <div style={{
                    height: '100%', width: `${barPct}%`,
                    background: isCheapest ? '#22c55e' : isMostExp && entries.length > 1 ? '#ef4444' : 'var(--blue-500)',
                    borderRadius: 99, transition: 'width 0.4s ease',
                  }} />
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function Spinner() {
  return (
    <div style={{
      width: 32, height: 32, borderRadius: '50%',
      border: '3px solid var(--border)', borderTopColor: 'var(--blue-700)',
      animation: 'spin 0.8s linear infinite',
    }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
