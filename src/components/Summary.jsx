import { useList } from '../contexts/ListContext'

export default function Summary() {
  const { items, totalValue, checkedCount } = useList()
  if (items.length === 0) return null

  const pct = Math.round((checkedCount / items.length) * 100)

  return (
    <div style={{
      padding: '12px 20px',
      background: 'var(--surface)',
      borderTop: '1px solid var(--border)',
    }}>
      {/* Barra de progresso */}
      <div style={{
        height: 4,
        background: 'var(--border)',
        borderRadius: 99,
        overflow: 'hidden',
        marginBottom: 10,
      }}>
        <div style={{
          height: '100%',
          width: `${pct}%`,
          background: 'linear-gradient(90deg, var(--blue-500), var(--rose-400))',
          borderRadius: 99,
          transition: 'width 0.3s ease',
        }} />
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
          {checkedCount} de {items.length} {items.length === 1 ? 'item' : 'itens'}
        </span>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
          <span style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>Total</span>
          <span className="tabular" style={{ fontSize: 18, fontWeight: 700, color: 'var(--gold)' }}>
            R$ {totalValue.toFixed(2).replace('.', ',')}
          </span>
        </div>
      </div>
    </div>
  )
}
