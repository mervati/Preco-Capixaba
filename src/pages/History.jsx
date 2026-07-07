import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

const MESES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']

function fmt(valor) {
  return 'R$ ' + Number(valor).toFixed(2).replace('.', ',')
}

function fmtData(iso) {
  const d = new Date(iso)
  const dia = String(d.getDate()).padStart(2, '0')
  const mes = String(d.getMonth() + 1).padStart(2, '0')
  const hora = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  return `${dia}/${mes} às ${hora}`
}

function TripCard({ trip }) {
  const [open, setOpen] = useState(false)
  const items = Array.isArray(trip.items) ? trip.items : []

  return (
    <div style={{
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius-md)',
      marginBottom: 10,
      overflow: 'hidden',
    }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center',
          justifyContent: 'space-between', padding: '14px 16px',
          background: 'none', border: 'none', cursor: 'pointer',
          fontFamily: 'inherit', textAlign: 'left',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>
              {trip.supermarket || 'Compra'}
            </span>
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
              {fmtData(trip.created_at)}
            </span>
          </div>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            {items.length} {items.length === 1 ? 'item' : 'itens'}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--gold)' }}>
            {fmt(trip.total)}
          </span>
          <span style={{ fontSize: 12, color: 'var(--text-muted)', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', display: 'inline-block' }}>▼</span>
        </div>
      </button>

      {open && items.length > 0 && (
        <div style={{ borderTop: '1px solid var(--border)', padding: '8px 16px 12px' }}>
          {items.map((item, i) => (
            <div key={i} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '6px 0',
              borderBottom: i < items.length - 1 ? '1px solid var(--border)' : 'none',
            }}>
              <div>
                <div style={{ fontSize: 13, color: 'var(--text)' }}>
                  {item.quantidade > 1 && (
                    <span style={{ fontSize: 12, color: 'var(--text-muted)', marginRight: 6 }}>{item.quantidade}×</span>
                  )}
                  {item.nome}
                </div>
                {item.marca && (
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>{item.marca}</div>
                )}
              </div>
              <span style={{ fontSize: 13, color: item.preco_unit > 0 ? 'var(--text-2)' : 'var(--text-muted)', fontFamily: 'DM Mono, monospace', flexShrink: 0, marginLeft: 12 }}>
                {item.preco_unit > 0 ? fmt(item.preco_unit * item.quantidade) : '—'}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function History() {
  const { user } = useAuth()
  const [trips, setTrips] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetch() {
      const { data } = await supabase
        .from('shopping_trips')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
      if (data) setTrips(data)
      setLoading(false)
    }
    fetch()
  }, [user])

  if (loading) {
    return (
      <div style={{ flex: 1, display: 'flex', justifyContent: 'center', padding: 48 }}>
        <div style={{ width: 36, height: 36, borderRadius: '50%', border: '3px solid var(--border)', borderTopColor: 'var(--blue-700)', animation: 'spin 0.8s linear infinite' }} />
      </div>
    )
  }

  if (trips.length === 0) {
    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '48px 32px', textAlign: 'center', gap: 12 }}>
        <div style={{ fontSize: 40 }}>🛍️</div>
        <p style={{ fontSize: 14, color: 'var(--text-muted)', lineHeight: 1.6 }}>
          Nenhuma compra registrada ainda.<br />Finalize uma lista para começar o histórico.
        </p>
      </div>
    )
  }

  // Agrupa por mês (YYYY-MM)
  const byMonth = {}
  for (const trip of trips) {
    const d = new Date(trip.created_at)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    if (!byMonth[key]) byMonth[key] = []
    byMonth[key].push(trip)
  }

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '16px 16px 0' }}>
      {Object.entries(byMonth).map(([key, monthTrips]) => {
        const [year, month] = key.split('-')
        const monthTotal = monthTrips.reduce((s, t) => s + Number(t.total), 0)
        const label = `${MESES[parseInt(month) - 1]} ${year}`

        return (
          <div key={key} style={{ marginBottom: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</span>
              <div style={{ display: 'flex', gap: 8, alignItems: 'baseline' }}>
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{monthTrips.length} {monthTrips.length === 1 ? 'compra' : 'compras'}</span>
                <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-2)' }}>{fmt(monthTotal)}</span>
              </div>
            </div>
            {monthTrips.map(trip => <TripCard key={trip.id} trip={trip} />)}
          </div>
        )
      })}
    </div>
  )
}
