import { useState } from 'react'
import { useList } from '../contexts/ListContext'
import { useSupermarket, SUPERMARKET_COLORS } from '../contexts/SupermarketContext'

export default function NewListModal({ onClose }) {
  const { createList } = useList()
  const { supermarkets, createSupermarket } = useSupermarket()
  const [name, setName] = useState('')
  const [supermarketId, setSupermarketId] = useState('')
  const [newSupermarket, setNewSupermarket] = useState('')
  const [newColor, setNewColor] = useState(SUPERMARKET_COLORS[0])
  const [showNewSuper, setShowNewSuper] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    if (!name.trim()) return
    setLoading(true)

    let finalSupermarketId = supermarketId || null

    if (showNewSuper && newSupermarket.trim()) {
      const s = await createSupermarket(newSupermarket.trim(), newColor)
      if (s) finalSupermarketId = s.id
    }

    await createList(name.trim(), finalSupermarketId)
    setLoading(false)
    onClose()
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 50,
        background: 'rgba(26,22,20,0.5)',
        display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
        padding: 16,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: 'var(--surface)', borderRadius: 'var(--radius-lg)',
          width: '100%', maxWidth: 480,
          padding: '28px 24px 32px',
          boxShadow: '0 -4px 40px rgba(0,0,0,0.12)',
        }}
      >
        <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', marginBottom: 20 }}>Nova lista</h2>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <input
            autoFocus
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Nome da lista (ex: Compras da semana)"
            style={inputStyle}
            onFocus={e => e.target.style.borderColor = 'var(--blue-500)'}
            onBlur={e => e.target.style.borderColor = 'var(--border)'}
          />

          {/* Supermercado */}
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: 6 }}>
              Supermercado (opcional)
            </label>

            {!showNewSuper ? (
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={() => setSupermarketId('')}
                  style={{ ...chipStyle, ...(supermarketId === '' ? chipActive : {}) }}
                >
                  Nenhum
                </button>
                {supermarkets.map(s => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setSupermarketId(s.id)}
                    style={{
                      ...chipStyle,
                      ...(supermarketId === s.id ? { background: s.color, color: '#fff', borderColor: s.color } : {}),
                    }}
                  >
                    {s.name}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setShowNewSuper(true)}
                  style={{ ...chipStyle, borderStyle: 'dashed' }}
                >
                  + Novo
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <input
                  autoFocus
                  value={newSupermarket}
                  onChange={e => setNewSupermarket(e.target.value)}
                  placeholder="Nome do supermercado"
                  style={inputStyle}
                  onFocus={e => e.target.style.borderColor = 'var(--blue-500)'}
                  onBlur={e => e.target.style.borderColor = 'var(--border)'}
                />
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {SUPERMARKET_COLORS.map(c => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setNewColor(c)}
                      style={{
                        width: 28, height: 28, borderRadius: '50%',
                        background: c, border: newColor === c ? '3px solid var(--text)' : '2px solid transparent',
                        cursor: 'pointer',
                      }}
                    />
                  ))}
                </div>
                <button type="button" onClick={() => setShowNewSuper(false)} style={{ fontSize: 12, color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}>
                  ← Cancelar
                </button>
              </div>
            )}
          </div>

          <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
            <button type="button" onClick={onClose} style={btnSecondary}>Cancelar</button>
            <button type="submit" disabled={loading} style={btnPrimary}>
              {loading ? 'Criando...' : 'Criar lista'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

const inputStyle = {
  border: '1.5px solid var(--border)', borderRadius: 'var(--radius-sm)',
  padding: '11px 14px', fontSize: 14, fontFamily: 'inherit',
  color: 'var(--text)', background: 'var(--bg)', outline: 'none',
  width: '100%', transition: 'border-color 0.15s',
}
const chipStyle = {
  padding: '6px 14px', borderRadius: 20, fontSize: 13, fontWeight: 500,
  fontFamily: 'inherit', cursor: 'pointer', border: '1.5px solid var(--border)',
  background: 'none', color: 'var(--text-2)', transition: 'all 0.15s',
}
const chipActive = { background: 'var(--blue-700)', color: '#fff', borderColor: 'var(--blue-700)' }
const btnSecondary = {
  flex: 1, padding: '12px', border: '1.5px solid var(--border)',
  borderRadius: 'var(--radius-sm)', background: 'none', cursor: 'pointer',
  fontFamily: 'inherit', fontSize: 14, fontWeight: 600, color: 'var(--text-2)',
}
const btnPrimary = {
  flex: 2, padding: '12px', border: 'none',
  borderRadius: 'var(--radius-sm)', background: 'var(--blue-700)', cursor: 'pointer',
  fontFamily: 'inherit', fontSize: 14, fontWeight: 700, color: '#fff',
}
