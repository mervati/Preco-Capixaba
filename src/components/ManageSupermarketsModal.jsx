import { useState } from 'react'
import { useSupermarket, SUPERMARKET_COLORS } from '../contexts/SupermarketContext'
import AddSupermarketModal from './AddSupermarketModal'

export default function ManageSupermarketsModal({ onClose }) {
  const { supermarkets, updateSupermarket, deleteSupermarket } = useSupermarket()
  const [editingId, setEditingId] = useState(null)
  const [editName, setEditName] = useState('')
  const [editColor, setEditColor] = useState('')
  const [showAdd, setShowAdd] = useState(false)

  function startEdit(s) {
    setEditingId(s.id)
    setEditName(s.name)
    setEditColor(s.color)
  }

  async function saveEdit() {
    if (!editName.trim()) return
    await updateSupermarket(editingId, { name: editName.trim(), color: editColor })
    setEditingId(null)
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
          width: '100%', maxWidth: 480, maxHeight: '80%',
          display: 'flex', flexDirection: 'column',
        }}
      >
        <div style={{ padding: '20px 20px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontSize: 17, fontWeight: 700, color: 'var(--text)' }}>Supermercados</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 22, color: 'var(--text-muted)', lineHeight: 1 }}>×</button>
        </div>

        <div style={{ overflowY: 'auto', padding: '0 20px', flex: 1 }}>
          {supermarkets.length === 0 ? (
            <p style={{ fontSize: 13, color: 'var(--text-muted)', padding: '4px 0 20px' }}>
              Nenhum supermercado cadastrado ainda.
            </p>
          ) : (
            supermarkets.map(s => (
              <div key={s.id} style={{ padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                {editingId === s.id ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <input
                      autoFocus
                      value={editName}
                      onChange={e => setEditName(e.target.value)}
                      style={inputStyle}
                      onFocus={e => e.target.style.borderColor = 'var(--blue-500)'}
                      onBlur={e => e.target.style.borderColor = 'var(--border)'}
                    />
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {SUPERMARKET_COLORS.map(c => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => setEditColor(c)}
                          style={{
                            width: 24, height: 24, borderRadius: '50%',
                            background: c, border: editColor === c ? '3px solid var(--text)' : '2px solid transparent',
                            cursor: 'pointer',
                          }}
                        />
                      ))}
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button onClick={() => setEditingId(null)} style={btnSec}>Cancelar</button>
                      <button onClick={saveEdit} style={btnPri}>Salvar</button>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: s.color, flexShrink: 0 }} />
                    <span style={{ flex: 1, fontSize: 14, color: 'var(--text)', minWidth: 0 }}>{s.name}</span>
                    <button onClick={() => startEdit(s)} title="Editar" style={iconBtn}>
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                      </svg>
                    </button>
                    <button onClick={() => deleteSupermarket(s.id)} title="Excluir" style={iconBtn}>
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                        <path d="M10 11v6M14 11v6M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                      </svg>
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        <div style={{ padding: 20 }}>
          <button
            onClick={() => setShowAdd(true)}
            style={{
              width: '100%', padding: '13px', border: 'none',
              borderRadius: 'var(--radius-sm)', background: 'var(--blue-700)',
              cursor: 'pointer', fontFamily: 'inherit', fontSize: 14, fontWeight: 700, color: '#fff',
            }}
          >
            + Add Supermercado
          </button>
        </div>
      </div>

      {showAdd && <AddSupermarketModal onClose={() => setShowAdd(false)} />}
    </div>
  )
}

const inputStyle = {
  border: '1.5px solid var(--border)', borderRadius: 'var(--radius-sm)',
  padding: '10px 12px', fontSize: 14, fontFamily: 'inherit',
  color: 'var(--text)', background: 'var(--bg)', outline: 'none',
  width: '100%', transition: 'border-color 0.15s',
}
const iconBtn = { background: 'none', border: 'none', cursor: 'pointer', color: 'var(--border-strong)', padding: 4, display: 'flex' }
const btnSec = { flex: 1, padding: '10px', border: '1.5px solid var(--border)', borderRadius: 'var(--radius-sm)', background: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, fontWeight: 600, color: 'var(--text-2)' }
const btnPri = { flex: 1, padding: '10px', border: 'none', borderRadius: 'var(--radius-sm)', background: 'var(--blue-700)', cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, fontWeight: 700, color: '#fff' }
