import { useState } from 'react'
import { useList } from '../contexts/ListContext'

export default function NewListModal({ onClose }) {
  const { createList } = useList()
  const [name, setName] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    if (!name.trim()) return
    await createList(name.trim())
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
          background: 'var(--surface)',
          borderRadius: 'var(--radius-lg)',
          width: '100%', maxWidth: 480,
          padding: '28px 24px 32px',
          boxShadow: '0 -4px 40px rgba(0,0,0,0.12)',
        }}
      >
        <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', marginBottom: 6 }}>
          Nova lista
        </h2>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 20 }}>
          Como você quer chamar essa lista de compras?
        </p>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <input
            autoFocus
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Ex: Compras da semana"
            style={{
              border: '1.5px solid var(--border)',
              borderRadius: 'var(--radius-sm)',
              padding: '12px 16px',
              fontSize: 15,
              fontFamily: 'inherit',
              color: 'var(--text)',
              outline: 'none',
              transition: 'border-color 0.15s',
            }}
            onFocus={e => e.target.style.borderColor = 'var(--blue-500)'}
            onBlur={e => e.target.style.borderColor = 'var(--border)'}
          />
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                flex: 1, padding: '12px',
                border: '1.5px solid var(--border)',
                borderRadius: 'var(--radius-sm)',
                background: 'none', cursor: 'pointer',
                fontFamily: 'inherit', fontSize: 14, fontWeight: 600,
                color: 'var(--text-2)',
              }}
            >
              Cancelar
            </button>
            <button
              type="submit"
              style={{
                flex: 2, padding: '12px',
                border: 'none',
                borderRadius: 'var(--radius-sm)',
                background: 'var(--blue-700)', cursor: 'pointer',
                fontFamily: 'inherit', fontSize: 14, fontWeight: 700,
                color: '#fff',
              }}
            >
              Criar lista
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
