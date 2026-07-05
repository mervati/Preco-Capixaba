import { useState, useRef, useEffect } from 'react'
import { useList } from '../contexts/ListContext'

export default function ListSelector() {
  const { lists, activeList, setActiveList, deleteList } = useList()
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  if (!activeList) return null

  return (
    <div ref={ref} style={{ position: 'relative', padding: '14px 20px 4px' }}>
      <button
        onClick={() => setOpen(v => !v)}
        style={{
          display: 'flex', alignItems: 'center', gap: 6,
          background: 'none', border: 'none', cursor: 'pointer',
          fontFamily: 'inherit', padding: 0,
        }}
      >
        <span style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 500 }}>Lista ativa</span>
        <span style={{
          fontSize: 14, color: 'var(--green-900)', fontWeight: 700,
          display: 'flex', alignItems: 'center', gap: 4,
        }}>
          {activeList.name}
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polyline points={open ? "18 15 12 9 6 15" : "6 9 12 15 18 9"} />
          </svg>
        </span>
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: '100%', left: 20, zIndex: 20,
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-md)',
          boxShadow: '0 8px 24px rgba(0,0,0,0.1)',
          minWidth: 220,
          overflow: 'hidden',
          marginTop: 6,
        }}>
          {lists.map((list, i) => (
            <div
              key={list.id}
              style={{
                display: 'flex', alignItems: 'center',
                borderTop: i > 0 ? '1px solid var(--border)' : 'none',
              }}
            >
              <button
                onClick={() => { setActiveList(list); setOpen(false) }}
                style={{
                  flex: 1, textAlign: 'left',
                  padding: '12px 16px',
                  background: list.id === activeList.id ? 'var(--green-50)' : 'none',
                  border: 'none', cursor: 'pointer',
                  fontFamily: 'inherit',
                  fontSize: 14,
                  fontWeight: list.id === activeList.id ? 600 : 400,
                  color: list.id === activeList.id ? 'var(--green-900)' : 'var(--text-2)',
                }}
              >
                {list.id === activeList.id && (
                  <span style={{ marginRight: 6, color: 'var(--green-500)' }}>✓</span>
                )}
                {list.name}
              </button>
              <button
                onClick={() => deleteList(list.id)}
                title="Excluir lista"
                style={{
                  padding: '12px 14px',
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: 'var(--text-muted)', fontSize: 16,
                  transition: 'color 0.15s',
                }}
                onMouseEnter={e => e.currentTarget.style.color = '#e53e3e'}
                onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
