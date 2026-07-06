import { useState, useRef, useEffect } from 'react'

const PAGE_TITLES = {
  lista:    { label: 'Lista de compras', sub: 'Preço Capixaba · ES' },
  precos:   { label: 'Radar de preços',  sub: 'Compare por supermercado' },
  despensa: { label: 'Despensa',         sub: 'Controle de estoque' },
}

export default function Header({ page, onSignOut, onOpenSupermarkets }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef(null)

  useEffect(() => {
    function handle(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [])

  const title = PAGE_TITLES[page] || PAGE_TITLES.lista

  return (
    <header style={{
      background: 'var(--blue-900)',
      padding: 'calc(14px + env(safe-area-inset-top)) 20px 14px',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      position: 'sticky', top: 0, zIndex: 10,
    }}>
      <div ref={menuRef} style={{ display: 'flex', alignItems: 'center', gap: 10, position: 'relative' }}>
        <button
          onClick={() => setMenuOpen(v => !v)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex' }}
        >
          <img
            src="/logo.png"
            alt="Preço Capixaba"
            style={{ width: 34, height: 34, borderRadius: 8, objectFit: 'cover', flexShrink: 0 }}
            onError={e => { e.target.style.display = 'none' }}
          />
        </button>

        {menuOpen && (
          <div style={{
            position: 'absolute', top: 42, left: 0, zIndex: 20,
            background: 'var(--surface)', border: '1px solid var(--border)',
            borderRadius: 12, boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
            minWidth: 140, overflow: 'hidden',
          }}>
            <button
              onClick={() => { setMenuOpen(false); onOpenSupermarkets() }}
              style={{
                width: '100%', padding: '12px 16px', textAlign: 'left',
                background: 'none', border: 'none', cursor: 'pointer',
                fontFamily: 'inherit', fontSize: 14, color: 'var(--text-2)', fontWeight: 600,
                display: 'flex', alignItems: 'center', gap: 8,
                borderBottom: '1px solid var(--border)',
              }}
            >
              <span>🏬</span> Supermercados
            </button>
            <button
              onClick={() => { setMenuOpen(false); onSignOut() }}
              style={{
                width: '100%', padding: '12px 16px', textAlign: 'left',
                background: 'none', border: 'none', cursor: 'pointer',
                fontFamily: 'inherit', fontSize: 14, color: '#e53e3e', fontWeight: 600,
                display: 'flex', alignItems: 'center', gap: 8,
              }}
            >
              <span>→</span> Sair
            </button>
          </div>
        )}

        <div>
          <div style={{ color: '#fff', fontWeight: 700, fontSize: 15, letterSpacing: '-0.2px', lineHeight: 1.2 }}>
            {title.label}
          </div>
          <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: 10.5, letterSpacing: '0.5px', textTransform: 'uppercase', fontWeight: 500, marginTop: 1 }}>
            {title.sub}
          </div>
        </div>
      </div>
    </header>
  )
}
