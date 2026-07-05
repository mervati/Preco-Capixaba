import { useState } from 'react'
import { useList } from '../contexts/ListContext'

export default function AddItem() {
  const { addItem } = useList()
  const [nome, setNome] = useState('')
  const [quantidade, setQuantidade] = useState(1)

  async function handleSubmit(e) {
    e.preventDefault()
    if (!nome.trim()) return
    await addItem({ nome: nome.trim().toUpperCase(), quantidade })
    setNome('')
    setQuantidade(1)
  }

  return (
    <form
      onSubmit={handleSubmit}
      style={{
        display: 'flex', gap: 8,
        padding: '12px 16px',
        borderTop: '1px solid var(--border)',
        background: 'var(--surface)',
      }}
    >
      <input
        value={nome}
        onChange={e => setNome(e.target.value)}
        placeholder="Adicionar item..."
        style={{
          flex: 1,
          border: '1.5px solid var(--border)',
          borderRadius: 'var(--radius-sm)',
          padding: '10px 14px',
          fontSize: 14,
          fontFamily: 'inherit',
          color: 'var(--text)',
          background: 'var(--bg)',
          outline: 'none',
          transition: 'border-color 0.15s',
        }}
        onFocus={e => e.target.style.borderColor = 'var(--blue-500)'}
        onBlur={e => e.target.style.borderColor = 'var(--border)'}
      />
      <input
        type="number"
        min="1"
        value={quantidade}
        onChange={e => setQuantidade(Number(e.target.value))}
        style={{
          width: 56,
          border: '1.5px solid var(--border)',
          borderRadius: 'var(--radius-sm)',
          padding: '10px 8px',
          fontSize: 14,
          fontFamily: 'DM Mono, monospace',
          color: 'var(--text)',
          background: 'var(--bg)',
          textAlign: 'center',
          outline: 'none',
        }}
        onFocus={e => e.target.style.borderColor = 'var(--blue-500)'}
        onBlur={e => e.target.style.borderColor = 'var(--border)'}
      />
      <button
        type="submit"
        style={{
          background: 'var(--blue-700)',
          color: '#fff',
          border: 'none',
          borderRadius: 'var(--radius-sm)',
          width: 44, height: 44,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer',
          flexShrink: 0,
          transition: 'background 0.15s',
        }}
        onMouseEnter={e => e.currentTarget.style.background = 'var(--blue-900)'}
        onMouseLeave={e => e.currentTarget.style.background = 'var(--blue-700)'}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
        </svg>
      </button>
    </form>
  )
}
