import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { usePantry } from '../contexts/PantryContext'
import { useSupermarket } from '../contexts/SupermarketContext'
import { useProductImages } from '../contexts/ProductImageContext'
import ProductAvatar from '../components/ProductAvatar'
import { fetchProductInfo } from '../lib/productLookup'

export default function Prices() {
  const { user } = useAuth()
  const { pantryItems } = usePantry()
  const { supermarkets, findOrCreateSupermarket } = useSupermarket()
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState(null)
  const [selectMode, setSelectMode] = useState(false)
  const [selectedNames, setSelectedNames] = useState(new Set())
  const [infoByName, setInfoByName] = useState({})
  const [showAddModal, setShowAddModal] = useState(false)
  const fetchedRef = useRef(new Set())

  // Salva um preço direto em price_history — não toca na despensa/lista, fica só no Radar de Preços
  async function handleAddPrice({ nome, preco, marketName }) {
    const supermarket = await findOrCreateSupermarket(marketName)
    if (!supermarket) return
    await supabase.from('price_history').insert({
      user_id: user.id,
      product_name: nome.trim().toUpperCase(),
      supermarket_id: supermarket.id,
      price: preco,
    })
    await fetchHistory()
  }

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

  async function handleDeleteEntry(productName, supermarketId) {
    await supabase
      .from('price_history')
      .delete()
      .eq('product_name', productName)
      .eq('supermarket_id', supermarketId)
    await fetchHistory()
  }

  async function handleDeleteSelected() {
    await supabase.from('price_history').delete().in('product_name', [...selectedNames])
    await fetchHistory()
    setSelectedNames(new Set())
    setSelectMode(false)
  }

  function toggleSelected(name) {
    setSelectedNames(prev => {
      const next = new Set(prev)
      if (next.has(name)) next.delete(name)
      else next.add(name)
      return next
    })
  }

  function toggleSelectMode() {
    setSelectMode(v => !v)
    setSelectedNames(new Set())
  }

  function toggleSelectAll() {
    setSelectedNames(prev =>
      prev.size === products.length ? new Set() : new Set(products.map(p => p.name))
    )
  }

  // Agrupa por produto → supermercado, mantendo o histórico (para calcular tendência de preço)
  const grouped = {}
  for (const row of history) {
    const key = row.product_name
    if (!grouped[key]) grouped[key] = {}
    const sid = row.supermarket_id
    if (!grouped[key][sid]) grouped[key][sid] = []
    grouped[key][sid].push(row)
  }

  const products = Object.entries(grouped)
    .map(([name, bySuper]) => {
      const entries = Object.values(bySuper).map(rows => {
        const latest = rows[0]
        const previous = rows[1]
        const trendPct = previous
          ? Math.round(((latest.price - previous.price) / previous.price) * 100)
          : null
        return {
          price: latest.price,
          recorded_at: latest.recorded_at,
          supermarket: latest.supermarkets,
          supermarket_id: latest.supermarket_id,
          trendPct,
        }
      })
      const prices = entries.map(e => e.price)
      const minPrice = Math.min(...prices)
      const maxPrice = Math.max(...prices)
      const pctDiff = entries.length > 1 ? Math.round(((maxPrice - minPrice) / minPrice) * 100) : null
      return { name, entries, minPrice, maxPrice, pctDiff }
    })
    .filter(p => {
      const q = search.toLowerCase()
      if (p.name.toLowerCase().includes(q)) return true
      return p.entries.some(e => e.supermarket?.name?.toLowerCase().includes(q))
    })
    .sort((a, b) => a.name.localeCompare(b.name))

  // Busca a marca do produto — reaproveita da despensa se já existir, senão busca em background
  useEffect(() => {
    for (const p of products) {
      if (fetchedRef.current.has(p.name)) continue
      fetchedRef.current.add(p.name)

      const pantryMatch = pantryItems.find(i => i.product_name === p.name)
      if (pantryMatch?.brand) {
        setInfoByName(prev => ({ ...prev, [p.name]: { brand: pantryMatch.brand } }))
        continue
      }

      fetchProductInfo(p.name).then(info => {
        if (info) setInfoByName(prev => ({ ...prev, [p.name]: info }))
      })
    }
  }, [products, pantryItems])

  useEffect(() => {
    if (selected && !products.some(p => p.name === selected.name)) setSelected(null)
  }, [products, selected])

  if (selected) {
    const fresh = products.find(p => p.name === selected.name) || selected
    const historyRows = history.filter(r => r.product_name === fresh.name)
    return (
      <ProductDetail
        product={fresh}
        info={infoByName[fresh.name]}
        historyRows={historyRows}
        onBack={() => setSelected(null)}
        onDeleteEntry={supermarketId => handleDeleteEntry(fresh.name, supermarketId)}
      />
    )
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
    <div style={{ flex: 1, overflowY: 'auto', padding: '16px 0' }}>
      {/* Search */}
      <div style={{ padding: '0 16px 12px', display: 'flex', gap: 8 }}>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar produto ou supermercado..."
          style={{
            flex: 1, border: '1.5px solid var(--border)',
            borderRadius: 'var(--radius-sm)', padding: '10px 14px',
            fontSize: 14, fontFamily: 'inherit', background: 'var(--bg)',
            color: 'var(--text)', outline: 'none',
          }}
          onFocus={e => e.target.style.borderColor = 'var(--blue-500)'}
          onBlur={e => e.target.style.borderColor = 'var(--border)'}
        />
        <button
          onClick={() => setShowAddModal(true)}
          title="Adicionar produto e preço"
          style={{
            padding: '0 14px', borderRadius: 'var(--radius-sm)', fontSize: 13, fontWeight: 700,
            fontFamily: 'inherit', cursor: 'pointer', whiteSpace: 'nowrap',
            border: 'none', background: 'var(--blue-700)', color: '#fff',
          }}
        >
          + Produto
        </button>
        {products.length > 0 && (
          <button
            onClick={toggleSelectMode}
            style={{
              padding: '0 14px', borderRadius: 'var(--radius-sm)', fontSize: 13, fontWeight: 600,
              fontFamily: 'inherit', cursor: 'pointer', whiteSpace: 'nowrap',
              border: '1.5px solid', borderColor: selectMode ? 'var(--blue-700)' : 'var(--border)',
              background: selectMode ? 'var(--blue-700)' : 'none',
              color: selectMode ? '#fff' : 'var(--text-2)',
            }}
          >
            {selectMode ? 'Cancelar' : 'Selecionar'}
          </button>
        )}
      </div>

      {showAddModal && (
        <AddPriceModal
          supermarkets={supermarkets}
          onClose={() => setShowAddModal(false)}
          onSave={handleAddPrice}
        />
      )}

      {selectMode && products.length > 0 && (
        <div style={{ padding: '0 16px 10px', display: 'flex', justifyContent: 'flex-end' }}>
          <button
            onClick={toggleSelectAll}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              fontFamily: 'inherit', fontSize: 12.5, fontWeight: 600, color: 'var(--blue-700)',
              textDecoration: 'underline', textDecorationStyle: 'dotted', padding: 0,
            }}
          >
            {selectedNames.size === products.length ? 'Desmarcar tudo' : 'Selecionar tudo'}
          </button>
        </div>
      )}

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
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)',
          gap: 6, padding: '0 12px',
        }}>
          {products.map(product => (
            <ProductGridCard
              key={product.name}
              product={product}
              selectMode={selectMode}
              isSelected={selectedNames.has(product.name)}
              onClick={() => selectMode ? toggleSelected(product.name) : setSelected(product)}
            />
          ))}
        </div>
      )}
    </div>

      {selectMode && selectedNames.size > 0 && (
        <div style={{
          padding: '12px 16px', background: 'var(--surface)',
          borderTop: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
        }}>
          <span style={{ fontSize: 13, color: 'var(--text-2)', fontWeight: 600 }}>
            {selectedNames.size} {selectedNames.size === 1 ? 'selecionado' : 'selecionados'}
          </span>
          <button
            onClick={handleDeleteSelected}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              background: '#fee2e2', color: '#dc2626', border: 'none',
              borderRadius: 20, padding: '8px 16px', fontSize: 13, fontWeight: 700,
              fontFamily: 'inherit', cursor: 'pointer',
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
              <path d="M10 11v6M14 11v6M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
            </svg>
            Excluir
          </button>
        </div>
      )}
    </div>
  )
}

function ProductGridCard({ product, selectMode, isSelected, onClick }) {
  const { name, minPrice, pctDiff } = product
  const { getImage } = useProductImages()
  const image = getImage(name)

  return (
    <button
      onClick={onClick}
      style={{
        background: 'var(--surface)',
        border: '1px solid', borderColor: isSelected ? 'var(--blue-700)' : 'var(--border)',
        borderRadius: 10, padding: 5,
        display: 'flex', flexDirection: 'column', gap: 4,
        cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
        position: 'relative', minWidth: 0,
      }}
    >
      {selectMode && (
        <div style={{
          position: 'absolute', top: 3, left: 3, zIndex: 1,
          width: 16, height: 16, borderRadius: '50%',
          background: isSelected ? 'var(--blue-700)' : 'var(--surface)',
          border: isSelected ? 'none' : '1.5px solid var(--border-strong)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {isSelected && (
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          )}
        </div>
      )}

      {pctDiff !== null && (
        <div style={{
          position: 'absolute', top: 3, right: 3,
          background: 'var(--gold-light)', color: 'var(--gold)',
          borderRadius: 20, padding: '1px 4px',
          fontSize: 8, fontWeight: 700, zIndex: 1, lineHeight: 1.4,
        }}>
          {pctDiff}%
        </div>
      )}

      <div style={{
        width: '100%', aspectRatio: '1', borderRadius: 7,
        background: 'var(--blue-50)', display: 'flex', alignItems: 'center', justifyContent: 'center',
        overflow: 'hidden',
      }}>
        {image ? (
          <img src={image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--blue-700)' }}>
            {name[0]}
          </span>
        )}
      </div>

      <div style={{
        fontSize: 9, fontWeight: 600, color: 'var(--text)',
        textTransform: 'capitalize', lineHeight: 1.25,
        display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
        minHeight: '2.5em',
      }}>
        {name.toLowerCase()}
      </div>

      <span className="tabular" style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--blue-700)' }}>
        R$ {Number(minPrice).toFixed(2).replace('.', ',')}
      </span>
    </button>
  )
}

function ProductDetail({ product, info, historyRows, onBack, onDeleteEntry }) {
  const { name, entries, minPrice, maxPrice, pctDiff } = product
  const sorted = [...entries].sort((a, b) => a.price - b.price)

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '14px 16px', borderBottom: '1px solid var(--border)',
        background: 'var(--surface)',
      }}>
        <button
          onClick={onBack}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, display: 'flex', color: 'var(--text)' }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
        </button>

        <ProductAvatar productName={name} size={44} borderRadius={10} editable />

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', textTransform: 'capitalize', lineHeight: 1.25 }}>
            {name.toLowerCase()}
          </div>
          {info?.brand && (
            <div style={{ fontSize: 11.5, color: 'var(--text-muted)', textTransform: 'capitalize' }}>
              {info.brand.toLowerCase()}
            </div>
          )}
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
        <PriceChart rows={historyRows} />

        {pctDiff !== null && (
          <div style={{
            background: 'var(--gold-light)', borderRadius: 'var(--radius-sm)',
            padding: '12px 14px', marginBottom: 16,
            display: 'flex', alignItems: 'center', gap: 10,
          }}>
            <span style={{ fontSize: 20 }}>💰</span>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--gold)' }}>
                {pctDiff}% de diferença entre supermercados
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                Economize comprando no mais barato
              </div>
            </div>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {sorted.map((entry, i) => {
            const isCheapest = entry.price === minPrice && sorted.length > 1
            const isMostExp = entry.price === maxPrice && sorted.length > 1
            const barPct = maxPrice > 0 ? (entry.price / maxPrice) * 100 : 100
            const date = entry.recorded_at
              ? new Date(entry.recorded_at).toLocaleDateString('pt-BR')
              : null

            return (
              <div key={i} style={{
                background: 'var(--surface)', border: '1px solid var(--border)',
                borderRadius: 'var(--radius-sm)', padding: 12,
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: entry.supermarket?.color || 'var(--border)' }} />
                    <span style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text-2)' }}>
                      {entry.supermarket?.name || 'Desconhecido'}
                    </span>
                    {isCheapest && <Tag color="#15803d" bg="#dcfce7">MAIS BARATO</Tag>}
                    {isMostExp && <Tag color="#dc2626" bg="#fee2e2">MAIS CARO</Tag>}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                    <div style={{ textAlign: 'right' }}>
                      <div className="tabular" style={{ fontSize: 16, fontWeight: 700, color: isCheapest ? '#15803d' : isMostExp ? '#dc2626' : 'var(--text)' }}>
                        R$ {Number(entry.price).toFixed(2).replace('.', ',')}
                      </div>
                      {entry.trendPct !== null && entry.trendPct !== 0 && (
                        <div style={{
                          fontSize: 11, fontWeight: 700, marginTop: 1,
                          color: entry.trendPct > 0 ? '#dc2626' : '#15803d',
                        }}>
                          {entry.trendPct > 0 ? '▲' : '▼'} {Math.abs(entry.trendPct)}%
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => onDeleteEntry(entry.supermarket_id)}
                      title="Excluir este preço"
                      style={{
                        background: 'none', border: 'none', cursor: 'pointer',
                        color: 'var(--border-strong)', padding: 2, flexShrink: 0,
                      }}
                      onMouseEnter={e => e.currentTarget.style.color = '#e53e3e'}
                      onMouseLeave={e => e.currentTarget.style.color = 'var(--border-strong)'}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                        <path d="M10 11v6M14 11v6M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                      </svg>
                    </button>
                  </div>
                </div>

                <div style={{ height: 5, background: 'var(--border)', borderRadius: 99, overflow: 'hidden', marginBottom: 6 }}>
                  <div style={{
                    height: '100%', width: `${barPct}%`,
                    background: isCheapest ? '#22c55e' : isMostExp ? '#ef4444' : 'var(--blue-500)',
                    borderRadius: 99, transition: 'width 0.4s ease',
                  }} />
                </div>

                {date && (
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                    Atualizado em {date}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function PriceChart({ rows }) {
  const bySuper = {}
  for (const r of rows) {
    const sid = r.supermarket_id
    if (!bySuper[sid]) bySuper[sid] = { supermarket: r.supermarkets, points: [] }
    bySuper[sid].points.push({ date: r.recorded_at, price: Number(r.price) })
  }
  const series = Object.values(bySuper)
  for (const s of series) {
    s.points.sort((a, b) => new Date(a.date) - new Date(b.date))
  }

  const prices = rows.map(r => Number(r.price))
  const minPrice = Math.min(...prices)
  const maxPrice = Math.max(...prices)
  const priceRange = maxPrice - minPrice || 1
  const midPrice = (minPrice + maxPrice) / 2

  const uniqueDates = [...new Set(rows.map(r => r.recorded_at.slice(0, 10)))].sort()
  const dateIndex = Object.fromEntries(uniqueDates.map((d, i) => [d, i]))

  const width = 300, height = 170
  const padLeft = 34, padRight = 10, padTop = 12, padBottom = 22
  const plotW = width - padLeft - padRight
  const plotH = height - padTop - padBottom

  function xFor(date) {
    const i = dateIndex[date.slice(0, 10)]
    return padLeft + (uniqueDates.length > 1 ? (i / (uniqueDates.length - 1)) * plotW : plotW / 2)
  }
  function yFor(price) {
    return padTop + (1 - (price - minPrice) / priceRange) * plotH
  }

  return (
    <div style={{
      background: 'var(--surface)', border: '1px solid var(--border)',
      borderRadius: 'var(--radius-sm)', padding: '14px 10px 10px', marginBottom: 16,
    }}>
      <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height: 'auto', display: 'block' }}>
        {[minPrice, midPrice, maxPrice].map((p, i) => (
          <g key={i}>
            <line
              x1={padLeft} x2={width - padRight} y1={yFor(p)} y2={yFor(p)}
              stroke="var(--border)" strokeWidth="1" strokeDasharray={i === 1 ? '3,3' : ''}
            />
            <text x={padLeft - 4} y={yFor(p)} textAnchor="end" dominantBaseline="middle" fontSize="7.5" fill="var(--text-muted)">
              {p.toFixed(0)}
            </text>
          </g>
        ))}

        {uniqueDates.map(d => (
          <text key={d} x={xFor(d)} y={height - 6} textAnchor="middle" fontSize="7" fill="var(--text-muted)">
            {new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
          </text>
        ))}

        {series.map((s, i) => {
          const color = s.supermarket?.color || 'var(--blue-500)'
          const pts = s.points.map(p => `${xFor(p.date)},${yFor(p.price)}`).join(' ')
          return (
            <g key={i}>
              {s.points.length > 1 && (
                <polyline points={pts} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
              )}
              {s.points.map((p, j) => (
                <circle key={j} cx={xFor(p.date)} cy={yFor(p.price)} r="3" fill={color} />
              ))}
            </g>
          )
        })}
      </svg>

      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 6, paddingLeft: 4 }}>
        {series.map((s, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: s.supermarket?.color || 'var(--border)' }} />
            <span style={{ fontSize: 11, color: 'var(--text-2)' }}>{s.supermarket?.name || 'Desconhecido'}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function AddPriceModal({ supermarkets, onClose, onSave }) {
  const [nome, setNome] = useState('')
  const [preco, setPreco] = useState('')
  const [marketName, setMarketName] = useState('')
  const [saving, setSaving] = useState(false)

  const precoNum = Number(preco.replace(',', '.'))
  const canSave = nome.trim() && precoNum > 0 && marketName.trim()

  async function handleSubmit(e) {
    e.preventDefault()
    if (!canSave || saving) return
    setSaving(true)
    await onSave({ nome: nome.trim(), preco: precoNum, marketName: marketName.trim() })
    setSaving(false)
    onClose()
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 100,
        background: 'rgba(0,0,0,0.45)',
        display: 'flex', alignItems: 'flex-end',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 480, margin: '0 auto',
          background: 'var(--surface)',
          borderRadius: 'var(--radius-lg) var(--radius-lg) 0 0',
          padding: '24px 20px 32px',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <span style={{ fontSize: 17, fontWeight: 700, color: 'var(--text)' }}>Adicionar produto</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: 'var(--text-muted)', lineHeight: 1, padding: 4 }}>✕</button>
        </div>

        <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: -8, marginBottom: 18, lineHeight: 1.5 }}>
          Só entra no Radar de Preços — não afeta a Despensa nem a Lista.
        </p>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={priceLabelStyle}>Produto</label>
            <input
              autoFocus
              value={nome}
              onChange={e => setNome(e.target.value)}
              placeholder="Ex: Leite integral 1L"
              style={priceInputStyle}
              onFocus={e => e.target.style.borderColor = 'var(--blue-500)'}
              onBlur={e => e.target.style.borderColor = 'var(--border)'}
            />
          </div>

          <div>
            <label style={priceLabelStyle}>Preço</label>
            <input
              value={preco}
              onChange={e => setPreco(e.target.value)}
              placeholder="0,00"
              inputMode="decimal"
              style={priceInputStyle}
              onFocus={e => e.target.style.borderColor = 'var(--blue-500)'}
              onBlur={e => e.target.style.borderColor = 'var(--border)'}
            />
          </div>

          <div>
            <label style={priceLabelStyle}>Supermercado</label>
            <input
              value={marketName}
              onChange={e => setMarketName(e.target.value)}
              placeholder="Nome do supermercado"
              style={priceInputStyle}
              onFocus={e => e.target.style.borderColor = 'var(--blue-500)'}
              onBlur={e => e.target.style.borderColor = 'var(--border)'}
            />
            {supermarkets.length > 0 && (
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
                {supermarkets.map(s => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setMarketName(s.name)}
                    style={{
                      padding: '6px 14px', borderRadius: 20, fontSize: 13, fontWeight: 500,
                      fontFamily: 'inherit', cursor: 'pointer', border: '1.5px solid',
                      borderColor: marketName === s.name ? s.color : 'var(--border)',
                      background: marketName === s.name ? s.color : 'none',
                      color: marketName === s.name ? '#fff' : 'var(--text-2)',
                    }}
                  >
                    {s.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
            <button type="button" onClick={onClose} style={{
              flex: 1, padding: '12px', border: '1.5px solid var(--border)',
              borderRadius: 'var(--radius-sm)', background: 'none', cursor: 'pointer',
              fontFamily: 'inherit', fontSize: 14, fontWeight: 600, color: 'var(--text-2)',
            }}>
              Cancelar
            </button>
            <button type="submit" disabled={!canSave || saving} style={{
              flex: 2, padding: '12px', border: 'none', borderRadius: 'var(--radius-sm)',
              background: canSave && !saving ? 'var(--blue-700)' : 'var(--border)',
              fontSize: 14, fontWeight: 700, color: '#fff',
              cursor: canSave && !saving ? 'pointer' : 'default', fontFamily: 'inherit',
            }}>
              {saving ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

const priceLabelStyle = { fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.4px', display: 'block', marginBottom: 4 }
const priceInputStyle = { width: '100%', border: '1.5px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '10px 14px', fontSize: 14, fontFamily: 'inherit', color: 'var(--text)', background: 'var(--bg)', outline: 'none', boxSizing: 'border-box' }

function Tag({ color, bg, children }) {
  return (
    <span style={{ fontSize: 10, background: bg, color, padding: '1px 6px', borderRadius: 10, fontWeight: 700 }}>
      {children}
    </span>
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
