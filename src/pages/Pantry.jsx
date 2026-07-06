import { useState } from 'react'
import { usePantry } from '../contexts/PantryContext'
import { useList } from '../contexts/ListContext'
import { useSupermarket } from '../contexts/SupermarketContext'
import BarcodeScanner from '../components/BarcodeScanner'
import { stripSizeFromName } from '../lib/productLookup'

export default function Pantry() {
  const { pantryItems, loading, lowStockItems, addPantryItem, updateQty, updateMinQty, deletePantryItem } = usePantry()
  const { addItem, activeList, items } = useList()
  const { supermarkets, getSupermarket } = useSupermarket()
  const [showAdd, setShowAdd] = useState(false)
  const [filter, setFilter] = useState('all')

  const filtered = pantryItems.filter(i => {
    if (filter === 'low') return Number(i.min_qty) > 0 && Number(i.current_qty) < Number(i.min_qty)
    if (filter === 'ok') return Number(i.min_qty) === 0 || Number(i.current_qty) >= Number(i.min_qty)
    return true
  })

  function isInList(productName) {
    return items.some(i => i.nome.trim().toUpperCase() === productName.trim().toUpperCase())
  }

  async function handleAddToList(item) {
    if (!activeList) return alert('Selecione uma lista de compras primeiro.')
    const missing = Number(item.min_qty) - Number(item.current_qty)
    if (missing <= 0 || isInList(item.product_name)) return
    await addItem({ nome: item.product_name, quantidade: missing, valor_unitario: 0, valor_total: 0 })
  }

  return (
    <div style={{ flex: 1, overflowY: 'auto' }}>
      {/* Alerta de itens acabando */}
      {lowStockItems.length > 0 && (
        <div style={{
          margin: '12px 16px 0',
          background: '#fff7ed', border: '1px solid #fed7aa',
          borderRadius: 'var(--radius-sm)', padding: '10px 14px',
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <span style={{ fontSize: 20 }}>⚠️</span>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#c2410c' }}>
              {lowStockItems.length} {lowStockItems.length === 1 ? 'item acabando' : 'itens acabando'}
            </div>
            <div style={{ fontSize: 12, color: '#ea580c' }}>
              {lowStockItems.slice(0, 2).map(i => i.product_name).join(', ')}
              {lowStockItems.length > 2 && ` +${lowStockItems.length - 2}`}
            </div>
          </div>
        </div>
      )}

      {/* Ações */}
      <div style={{ padding: '12px 16px 4px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        <button
          onClick={() => setShowAdd(true)}
          style={{
            width: '100%', padding: '13px',
            background: 'none', color: 'var(--blue-700)',
            border: '1.5px solid var(--blue-700)', borderRadius: 'var(--radius-md)',
            fontFamily: 'inherit', fontSize: 14, fontWeight: 600, cursor: 'pointer',
          }}
        >
          + Adicionar manualmente
        </button>
      </div>

      {/* Filtros */}
      <div style={{ display: 'flex', gap: 8, padding: '12px 16px 4px' }}>
        {[['all', 'Todos'], ['low', '⚠️ Acabando'], ['ok', '✓ OK']].map(([val, label]) => (
          <button
            key={val}
            onClick={() => setFilter(val)}
            style={{
              padding: '5px 14px', borderRadius: 20, fontSize: 12, fontWeight: 500,
              fontFamily: 'inherit', cursor: 'pointer',
              border: '1.5px solid',
              borderColor: filter === val ? 'var(--blue-700)' : 'var(--border)',
              background: filter === val ? 'var(--blue-700)' : 'none',
              color: filter === val ? '#fff' : 'var(--text-2)',
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}><Spinner /></div>
      ) : filtered.length === 0 && pantryItems.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px 32px', color: 'var(--text-muted)' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🏠</div>
          <p style={{ fontSize: 14, lineHeight: 1.6, marginBottom: 20 }}>
            Nenhum item na despensa ainda. Escaneie uma nota fiscal na aba Lista para importar automaticamente.
          </p>
        </div>
      ) : (
        <div style={{ paddingBottom: 8 }}>
          {filtered.map(item => (
            <PantryItem
              key={item.id}
              item={item}
              inList={isInList(item.product_name)}
              supermarket={item.supermarket_id ? getSupermarket(item.supermarket_id) : null}
              onUpdateQty={updateQty}
              onUpdateMinQty={updateMinQty}
              onDelete={deletePantryItem}
              onAddToList={() => handleAddToList(item)}
            />
          ))}
        </div>
      )}

      {showAdd && <AddPantryModal onClose={() => setShowAdd(false)} onAdd={addPantryItem} supermarkets={supermarkets} />}
    </div>
  )
}

function PantryItem({ item, inList, supermarket, onUpdateQty, onUpdateMinQty, onDelete, onAddToList }) {
  const current = Number(item.current_qty)
  const min = Number(item.min_qty)
  const isLow = min > 0 && current < min
  const isEmpty = current === 0
  const pct = min > 0 ? Math.min((current / min) * 100, 100) : 100

  const barColor = isEmpty ? '#ef4444' : isLow ? '#f97316' : '#22c55e'

  const [editingMin, setEditingMin] = useState(false)
  const [minDraft, setMinDraft] = useState(String(min))
  const [confirmZero, setConfirmZero] = useState(false)

  function startEditMin() {
    setMinDraft(String(min))
    setEditingMin(true)
  }

  function saveMin() {
    const val = Math.max(0, parseInt(minDraft, 10) || 0)
    onUpdateMinQty(item.id, val)
    setEditingMin(false)
  }

  function handleMinKey(e) {
    if (e.key === 'Enter') saveMin()
    if (e.key === 'Escape') setEditingMin(false)
  }

  function handleConsume() {
    if (current === 1) {
      setConfirmZero(true)
      return
    }
    onUpdateQty(item.id, Math.max(0, current - 1))
  }

  function confirmConsumeLast() {
    onUpdateQty(item.id, 0)
    setConfirmZero(false)
  }

  return (
    <div style={{
      padding: '12px 16px',
      borderBottom: '1px solid var(--border)',
      background: 'var(--surface)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>

        <div style={{
          width: 44, height: 44, borderRadius: 10, flexShrink: 0,
          background: 'var(--blue-50)', display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <span style={{ fontSize: 18, fontWeight: 700, color: 'var(--blue-700)' }}>
            {item.product_name[0]}
          </span>
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', textTransform: 'capitalize', marginBottom: 3 }}>
            {item.product_name.toLowerCase()}
          </div>

          {(item.brand || supermarket) && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
              {item.brand && (
                <span style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'capitalize' }}>
                  {item.brand.toLowerCase()}
                </span>
              )}
              {supermarket && (
                <span style={{
                  fontSize: 10, fontWeight: 700, padding: '1px 7px', borderRadius: 10,
                  background: supermarket.color, color: '#fff',
                }}>
                  {supermarket.name}
                </span>
              )}
            </div>
          )}

          {/* Mínimo editável */}
          {editingMin ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>mínimo:</span>
              <input
                autoFocus
                type="number"
                min="0"
                value={minDraft}
                onChange={e => setMinDraft(e.target.value)}
                onBlur={saveMin}
                onKeyDown={handleMinKey}
                style={{
                  width: 52, fontSize: 12, fontFamily: 'inherit',
                  border: '1.5px solid var(--blue-500)', borderRadius: 6,
                  padding: '2px 6px', outline: 'none', background: 'var(--bg)',
                  color: 'var(--text)',
                }}
              />
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{item.unit}</span>
            </div>
          ) : min === 0 ? (
            <button
              onClick={startEditMin}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                fontSize: 11, color: 'var(--blue-700)', fontFamily: 'inherit',
                padding: 0, textDecoration: 'underline', textDecorationStyle: 'dotted',
              }}
            >
              Definir quantidade mínima
            </button>
          ) : (
            <button
              onClick={startEditMin}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                fontSize: 11, color: 'var(--text-muted)', fontFamily: 'inherit',
                padding: 0, display: 'flex', alignItems: 'center', gap: 4,
              }}
            >
              mínimo: {min} {item.unit}
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            </button>
          )}
        </div>

        {isLow && (
          inList ? (
            <span style={{
              fontSize: 11, fontWeight: 700, padding: '4px 10px',
              background: '#dcfce7', color: '#15803d',
              border: '1px solid #bbf7d0', borderRadius: 20,
            }}>
              ✓ Na lista
            </span>
          ) : (
            <button
              onClick={onAddToList}
              title="Adicionar à lista de compras"
              style={{
                fontSize: 11, fontWeight: 700, padding: '4px 10px',
                background: 'var(--blue-50)', color: 'var(--blue-700)',
                border: '1px solid var(--blue-100)', borderRadius: 20,
                fontFamily: 'inherit', cursor: 'pointer',
              }}
            >
              + Lista
            </button>
          )
        )}

        {/* Quantidade: repor / consumir */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <button
            onClick={() => onUpdateQty(item.id, current + 1)}
            title="Repor"
            style={qtyBtn}
          >
            +
          </button>
          <span className="tabular" style={{ fontSize: 14, fontWeight: 700, minWidth: 18, textAlign: 'center', color: isLow ? '#e53e3e' : 'var(--text)' }}>
            {current}
          </span>
          <button
            onClick={handleConsume}
            title="Consumir"
            style={qtyBtn}
          >
            −
          </button>
        </div>

        <button
          onClick={() => onDelete(item.id)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--border-strong)', padding: 4 }}
          onMouseEnter={e => e.currentTarget.style.color = '#e53e3e'}
          onMouseLeave={e => e.currentTarget.style.color = 'var(--border-strong)'}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
        </button>
      </div>

      {/* Barra de estoque — só mostra se mínimo definido */}
      {min > 0 && (
        <div style={{ height: 5, background: 'var(--border)', borderRadius: 99, overflow: 'hidden' }}>
          <div style={{
            height: '100%', width: `${pct}%`,
            background: barColor, borderRadius: 99,
            transition: 'width 0.3s, background 0.3s',
          }} />
        </div>
      )}

      {confirmZero && (
        <div
          onClick={() => setConfirmZero(false)}
          style={{
            position: 'absolute', inset: 0, zIndex: 60,
            background: 'rgba(26,22,20,0.5)',
            display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
            padding: 16,
          }}
        >
          <div onClick={e => e.stopPropagation()} style={{ background: 'var(--surface)', borderRadius: 'var(--radius-lg)', width: '100%', maxWidth: 480, padding: '24px 24px 28px' }}>
            <p style={{ fontSize: 14, color: 'var(--text)', marginBottom: 20, lineHeight: 1.5 }}>
              Consumir o último <strong style={{ textTransform: 'capitalize' }}>{item.product_name.toLowerCase()}</strong>? O estoque ficará zerado.
            </p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setConfirmZero(false)} style={btnSec}>Cancelar</button>
              <button onClick={confirmConsumeLast} style={btnPri}>Sim, consumir</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function AddPantryModal({ onClose, onAdd, supermarkets }) {
  const [name, setName] = useState('')
  const [brand, setBrand] = useState('')
  const [minQty, setMinQty] = useState(1)
  const [currentQty, setCurrentQty] = useState(0)
  const [unit, setUnit] = useState('UN')
  const [supermarketId, setSupermarketId] = useState('')
  const [loading, setLoading] = useState(false)
  const [showScanner, setShowScanner] = useState(false)

  function handleBarcodeResult(info) {
    if (info.name) {
      let displayName = stripSizeFromName(info.name).toUpperCase()
      if (info.quantity && info.unit) displayName += ` - ${info.quantity}${info.unit}`
      setName(displayName)
    }
    if (info.brand) setBrand(info.brand)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!name.trim()) return
    setLoading(true)
    await onAdd({
      product_name: name.trim().toUpperCase(),
      brand: brand.trim() || null,
      min_qty: minQty,
      current_qty: currentQty,
      unit,
      supermarket_id: supermarketId || null,
    })
    setLoading(false)
    onClose()
  }

  return (
    <div onClick={onClose} style={{ position: 'absolute', inset: 0, zIndex: 50, background: 'rgba(26,22,20,0.5)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', padding: 16 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: 'var(--surface)', borderRadius: 'var(--radius-lg)', width: '100%', maxWidth: 480, padding: '24px 24px 32px' }}>
        <h2 style={{ fontSize: 17, fontWeight: 700, marginBottom: 18, color: 'var(--text)' }}>Adicionar à despensa</h2>

        <button
          type="button"
          onClick={() => setShowScanner(true)}
          style={{
            width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            background: 'var(--blue-50)', color: 'var(--blue-700)',
            border: '1px solid var(--blue-100)', borderRadius: 'var(--radius-sm)',
            padding: '11px', fontSize: 13, fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer',
            marginBottom: 12,
          }}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 5v14M7 5v14M11 5v10M15 5v14M19 5v10M21 5v14" />
          </svg>
          Escanear código de barras
        </button>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <input autoFocus value={name} onChange={e => setName(e.target.value)} placeholder="Nome do produto" style={inputStyle} onFocus={e => e.target.style.borderColor = 'var(--blue-500)'} onBlur={e => e.target.style.borderColor = 'var(--border)'} />
          <input value={brand} onChange={e => setBrand(e.target.value)} placeholder="Marca (opcional)" style={inputStyle} onFocus={e => e.target.style.borderColor = 'var(--blue-500)'} onBlur={e => e.target.style.borderColor = 'var(--border)'} />

          <div>
            <label style={labelStyle}>Supermercado</label>
            {supermarkets.length === 0 ? (
              <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                Nenhum cadastrado — toque no logo no topo do app para adicionar um.
              </p>
            ) : (
              <select value={supermarketId} onChange={e => setSupermarketId(e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}>
                <option value="">Nenhum</option>
                {supermarkets.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            )}
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Qtd. atual</label>
              <input type="number" min="0" value={currentQty} onChange={e => setCurrentQty(Number(e.target.value))} style={{ ...inputStyle, textAlign: 'center' }} onFocus={e => e.target.style.borderColor = 'var(--blue-500)'} onBlur={e => e.target.style.borderColor = 'var(--border)'} />
            </div>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Qtd. mínima</label>
              <input type="number" min="0" value={minQty} onChange={e => setMinQty(Number(e.target.value))} style={{ ...inputStyle, textAlign: 'center' }} onFocus={e => e.target.style.borderColor = 'var(--blue-500)'} onBlur={e => e.target.style.borderColor = 'var(--border)'} />
            </div>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Unidade</label>
              <select value={unit} onChange={e => setUnit(e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}>
                {['UN', 'KG', 'G', 'L', 'ML', 'CX', 'PCT'].map(u => <option key={u}>{u}</option>)}
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
            <button type="button" onClick={onClose} style={btnSec}>Cancelar</button>
            <button type="submit" disabled={loading} style={btnPri}>{loading ? 'Salvando...' : 'Adicionar'}</button>
          </div>
        </form>
      </div>

      {showScanner && <BarcodeScanner onClose={() => setShowScanner(false)} onResult={handleBarcodeResult} />}
    </div>
  )
}

const inputStyle = { border: '1.5px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '10px 12px', fontSize: 14, fontFamily: 'inherit', color: 'var(--text)', background: 'var(--bg)', outline: 'none', width: '100%', transition: 'border-color 0.15s' }
const labelStyle = { fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.4px', display: 'block', marginBottom: 4 }
const qtyBtn = { width: 28, height: 28, borderRadius: '50%', border: '1.5px solid var(--border)', background: 'var(--bg)', cursor: 'pointer', fontFamily: 'inherit', fontSize: 16, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-2)' }
const btnSec = { flex: 1, padding: '12px', border: '1.5px solid var(--border)', borderRadius: 'var(--radius-sm)', background: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 14, fontWeight: 600, color: 'var(--text-2)' }
const btnPri = { flex: 2, padding: '12px', border: 'none', borderRadius: 'var(--radius-sm)', background: 'var(--blue-700)', cursor: 'pointer', fontFamily: 'inherit', fontSize: 14, fontWeight: 700, color: '#fff' }

function Spinner() {
  return <div style={{ width: 32, height: 32, borderRadius: '50%', border: '3px solid var(--border)', borderTopColor: 'var(--blue-700)', animation: 'spin 0.8s linear infinite' }}><style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style></div>
}
