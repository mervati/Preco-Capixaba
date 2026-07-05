export default function Header({ onNewList }) {
  return (
    <header style={{
      background: 'var(--blue-900)',
      padding: '14px 20px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      position: 'sticky',
      top: 0,
      zIndex: 10,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <img
          src="/logo.png"
          alt="Preço Capixaba"
          style={{ width: 36, height: 36, borderRadius: 8, objectFit: 'cover' }}
          onError={e => { e.target.style.display = 'none' }}
        />
        <div>
          <div style={{ color: '#fff', fontWeight: 700, fontSize: 15, letterSpacing: '-0.2px', lineHeight: 1.2 }}>
            Preço Capixaba
          </div>
          <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: 10.5, letterSpacing: '0.5px', textTransform: 'uppercase', fontWeight: 500 }}>
            Lista de compras · ES
          </div>
        </div>
      </div>

      <button
        onClick={onNewList}
        style={{
          background: 'rgba(255,255,255,0.1)',
          border: '1px solid rgba(255,255,255,0.18)',
          color: '#fff',
          borderRadius: 20,
          padding: '7px 15px',
          fontSize: 13,
          fontWeight: 600,
          fontFamily: 'inherit',
          cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: 5,
          transition: 'background 0.15s',
        }}
        onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.18)'}
        onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
      >
        <span style={{ fontSize: 17, lineHeight: 1, marginTop: -1 }}>+</span> Nova lista
      </button>
    </header>
  )
}
