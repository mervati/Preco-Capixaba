import { useList } from '../contexts/ListContext'

const PAGE_TITLES = {
  lista:    { label: 'Lista de compras', sub: 'Preço Capixaba · ES' },
  precos:   { label: 'Radar de preços',  sub: 'Compare por supermercado' },
  despensa: { label: 'Despensa',         sub: 'Controle de estoque' },
}

export default function Header({ onNewList, page }) {
  const { activeList } = useList()
  const supermarket = activeList?.supermarkets

  const title = PAGE_TITLES[page] || PAGE_TITLES.lista

  return (
    <header style={{
      background: 'var(--blue-900)',
      padding: '14px 20px',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      position: 'sticky', top: 0, zIndex: 10,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <img
          src="/logo.png"
          alt="Preço Capixaba"
          style={{ width: 34, height: 34, borderRadius: 8, objectFit: 'cover', flexShrink: 0 }}
          onError={e => { e.target.style.display = 'none' }}
        />
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ color: '#fff', fontWeight: 700, fontSize: 15, letterSpacing: '-0.2px', lineHeight: 1.2 }}>
              {title.label}
            </div>
            {/* Badge supermercado */}
            {page === 'lista' && supermarket && (
              <div style={{
                background: supermarket.color, color: '#fff',
                borderRadius: 10, padding: '2px 8px',
                fontSize: 10, fontWeight: 700, letterSpacing: '0.3px',
                whiteSpace: 'nowrap',
              }}>
                {supermarket.name}
              </div>
            )}
          </div>
          <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: 10.5, letterSpacing: '0.5px', textTransform: 'uppercase', fontWeight: 500, marginTop: 1 }}>
            {title.sub}
          </div>
        </div>
      </div>

      {page === 'lista' && (
        <button
          onClick={onNewList}
          style={{
            background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.18)',
            color: '#fff', borderRadius: 20, padding: '7px 15px',
            fontSize: 13, fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 5, whiteSpace: 'nowrap',
            transition: 'background 0.15s',
          }}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.18)'}
          onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
        >
          <span style={{ fontSize: 17, lineHeight: 1, marginTop: -1 }}>+</span> Nova lista
        </button>
      )}
    </header>
  )
}
