import { useState } from 'react'
import { useList } from '../contexts/ListContext'

export default function ItemCard({ item }) {
  const { toggleItem, deleteItem } = useList()
  const [pressing, setPressing] = useState(false)

  return (
    <div
      style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '13px 20px',
        borderBottom: '1px solid var(--border)',
        background: item.checked ? 'var(--green-50)' : 'var(--surface)',
        transition: 'background 0.15s',
      }}
    >
      {/* Checkbox */}
      <button
        onClick={() => toggleItem(item.id)}
        style={{
          width: 24, height: 24, borderRadius: '50%', flexShrink: 0,
          border: item.checked ? 'none' : '2px solid var(--border-strong)',
          background: item.checked ? 'var(--green-700)' : 'transparent',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', transition: 'all 0.15s',
        }}
      >
        {item.checked && (
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        )}
      </button>

      {/* Nome + qtd */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 14, fontWeight: 500, lineHeight: 1.3,
          color: item.checked ? 'var(--text-muted)' : 'var(--text)',
          textDecoration: item.checked ? 'line-through' : 'none',
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>
          {item.nome}
        </div>
        {item.valor_unitario > 0 && (
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
            {item.quantidade}× R$ {Number(item.valor_unitario).toFixed(2).replace('.', ',')}
          </div>
        )}
      </div>

      {/* Preço total */}
      {item.valor_total > 0 && (
        <div className="tabular" style={{
          fontSize: 14, fontWeight: 600,
          color: item.checked ? 'var(--text-muted)' : 'var(--gold)',
          flexShrink: 0,
        }}>
          R$ {Number(item.valor_total).toFixed(2).replace('.', ',')}
        </div>
      )}

      {/* Deletar */}
      <button
        onClick={() => deleteItem(item.id)}
        style={{
          background: 'none', border: 'none', cursor: 'pointer',
          color: 'var(--border-strong)', padding: 4, borderRadius: 6,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'color 0.15s',
          flexShrink: 0,
        }}
        onMouseEnter={e => e.currentTarget.style.color = '#e53e3e'}
        onMouseLeave={e => e.currentTarget.style.color = 'var(--border-strong)'}
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="3 6 5 6 21 6" />
          <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
          <path d="M10 11v6M14 11v6M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
        </svg>
      </button>
    </div>
  )
}
