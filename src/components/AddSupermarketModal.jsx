import { useState } from 'react'
import { useSupermarket, SUPERMARKET_COLORS } from '../contexts/SupermarketContext'

export default function AddSupermarketModal({ onClose }) {
  const { createSupermarket } = useSupermarket()
  const [name, setName] = useState('')
  const [color, setColor] = useState(SUPERMARKET_COLORS[0])
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    if (!name.trim()) return
    setLoading(true)
    await createSupermarket(name.trim(), color)
    setLoading(false)
    onClose()
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: 'absolute', inset: 0, zIndex: 60,
        background: 'rgba(26,22,20,0.5)',
        display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
        padding: 16,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: 'var(--surface)', borderRadius: 'var(--radius-lg)',
          width: '100%', maxWidth: 480, padding: '24px 24px 32px',
        }}
      >
        <h2 style={{ fontSize: 17, fontWeight: 700, marginBottom: 18, color: 'var(--text)' }}>Novo supermercado</h2>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <input
            autoFocus
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Nome do supermercado"
            style={inputStyle}
            onFocus={e => e.target.style.borderColor = 'var(--blue-500)'}
            onBlur={e => e.target.style.borderColor = 'var(--border)'}
          />

          <div>
            <label style={labelStyle}>Cor</label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {SUPERMARKET_COLORS.map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  style={{
                    width: 28, height: 28, borderRadius: '50%',
                    background: c, border: color === c ? '3px solid var(--text)' : '2px solid transparent',
                    cursor: 'pointer',
                  }}
                />
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
            <button type="button" onClick={onClose} style={btnSec}>Cancelar</button>
            <button type="submit" disabled={loading} style={btnPri}>{loading ? 'Salvando...' : 'Adicionar'}</button>
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
const labelStyle = { fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.4px', display: 'block', marginBottom: 6 }
const btnSec = { flex: 1, padding: '12px', border: '1.5px solid var(--border)', borderRadius: 'var(--radius-sm)', background: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 14, fontWeight: 600, color: 'var(--text-2)' }
const btnPri = { flex: 2, padding: '12px', border: 'none', borderRadius: 'var(--radius-sm)', background: 'var(--blue-700)', cursor: 'pointer', fontFamily: 'inherit', fontSize: 14, fontWeight: 700, color: '#fff' }
