import { usePantry } from '../contexts/PantryContext'

const tabs = [
  { id: 'lista',    label: 'Lista',    icon: '🛒' },
  { id: 'precos',   label: 'Preços',   icon: '📊' },
  { id: 'despensa', label: 'Despensa', icon: '🏠' },
]

export default function BottomNav({ active, onChange }) {
  const { lowStockItems } = usePantry()

  return (
    <nav style={{
      display: 'flex',
      background: 'var(--surface)',
      borderTop: '1px solid var(--border)',
      position: 'sticky',
      bottom: 0,
      zIndex: 10,
      paddingBottom: 'env(safe-area-inset-bottom)',
    }}>
      {tabs.map(tab => {
        const isActive = active === tab.id
        const badge = tab.id === 'despensa' && lowStockItems.length > 0

        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            style={{
              flex: 1, display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              gap: 3, padding: '10px 0 12px',
              background: 'none', border: 'none', cursor: 'pointer',
              fontFamily: 'inherit', position: 'relative',
              transition: 'background 0.15s',
            }}
          >
            {/* linha ativa no topo */}
            {isActive && (
              <div style={{
                position: 'absolute', top: 0, left: '20%', right: '20%',
                height: 2, background: 'var(--blue-700)', borderRadius: 99,
              }} />
            )}

            <span style={{ fontSize: 20, lineHeight: 1 }}>{tab.icon}</span>
            <span style={{
              fontSize: 11, fontWeight: isActive ? 700 : 400,
              color: isActive ? 'var(--blue-700)' : 'var(--text-muted)',
              letterSpacing: '0.2px',
            }}>
              {tab.label}
            </span>

            {badge && (
              <div style={{
                position: 'absolute', top: 6, right: '22%',
                width: 8, height: 8, borderRadius: '50%',
                background: '#e53e3e',
                border: '1.5px solid var(--surface)',
              }} />
            )}
          </button>
        )
      })}
    </nav>
  )
}
