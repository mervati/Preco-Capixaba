import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { useList } from '../contexts/ListContext'

export default function FinalizarModal({ onClose, onSaved }) {
  const { user } = useAuth()
  const { items, priceIndex, estimatedTotal, clearList } = useList()
  const [supermarket, setSupermarket] = useState('')
  const [limpar, setLimpar] = useState(true)
  const [saving, setSaving] = useState(false)

  const itemCount = items.length

  async function handleSave() {
    setSaving(true)
    const snapshot = items.map(item => {
      const cheapest = priceIndex[item.nome.trim().toUpperCase()]
      const preco_unit = Number(item.valor_total) > 0
        ? Number(item.valor_total) / Number(item.quantidade)
        : (cheapest ? cheapest.price : 0)
      return { nome: item.nome, quantidade: Number(item.quantidade), preco_unit }
    })

    await supabase.from('shopping_trips').insert({
      user_id: user.id,
      supermarket: supermarket.trim() || null,
      total: estimatedTotal,
      items: snapshot,
    })

    if (limpar) await clearList()
    setSaving(false)
    onSaved()
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 100,
      background: 'rgba(0,0,0,0.45)',
      display: 'flex', alignItems: 'flex-end',
    }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{
        width: '100%', maxWidth: 480, margin: '0 auto',
        background: 'var(--surface)',
        borderRadius: 'var(--radius-lg) var(--radius-lg) 0 0',
        padding: '24px 20px 32px',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <span style={{ fontSize: 17, fontWeight: 700, color: 'var(--text)' }}>Finalizar compra</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: 'var(--text-muted)', lineHeight: 1, padding: 4 }}>✕</button>
        </div>

        {/* Resumo */}
        <div style={{
          background: 'var(--blue-50)',
          border: '1px solid var(--blue-100)',
          borderRadius: 'var(--radius-sm)',
          padding: '12px 16px',
          marginBottom: 20,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <span style={{ fontSize: 13, color: 'var(--text-2)' }}>{itemCount} {itemCount === 1 ? 'item' : 'itens'}</span>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
            <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.4px' }}>Total</span>
            <span style={{ fontSize: 20, fontWeight: 700, color: 'var(--gold)' }}>
              R$ {estimatedTotal.toFixed(2).replace('.', ',')}
            </span>
          </div>
        </div>

        {/* Supermercado */}
        <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6 }}>
          Supermercado <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(opcional)</span>
        </label>
        <input
          value={supermarket}
          onChange={e => setSupermarket(e.target.value)}
          placeholder="Ex: Assaí, Tenda, Carrefour…"
          style={{
            width: '100%', border: '1.5px solid var(--border)',
            borderRadius: 'var(--radius-sm)', padding: '10px 14px',
            fontSize: 14, fontFamily: 'inherit', color: 'var(--text)',
            background: 'var(--bg)', outline: 'none', marginBottom: 16,
            boxSizing: 'border-box',
          }}
          onFocus={e => e.target.style.borderColor = 'var(--blue-500)'}
          onBlur={e => e.target.style.borderColor = 'var(--border)'}
        />

        {/* Limpar lista */}
        <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', marginBottom: 24 }}>
          <input
            type="checkbox"
            checked={limpar}
            onChange={e => setLimpar(e.target.checked)}
            style={{ width: 18, height: 18, accentColor: 'var(--blue-700)', cursor: 'pointer' }}
          />
          <span style={{ fontSize: 14, color: 'var(--text-2)' }}>Limpar lista após salvar</span>
        </label>

        {/* Botões */}
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={onClose} style={{
            flex: 1, padding: '12px 0', borderRadius: 'var(--radius-sm)',
            border: '1.5px solid var(--border)', background: 'none',
            fontSize: 14, fontWeight: 600, color: 'var(--text-2)', cursor: 'pointer',
            fontFamily: 'inherit',
          }}>
            Cancelar
          </button>
          <button onClick={handleSave} disabled={saving} style={{
            flex: 2, padding: '12px 0', borderRadius: 'var(--radius-sm)',
            border: 'none', background: saving ? 'var(--border)' : 'var(--blue-700)',
            fontSize: 14, fontWeight: 700, color: '#fff', cursor: saving ? 'default' : 'pointer',
            fontFamily: 'inherit', transition: 'background 0.15s',
          }}>
            {saving ? 'Salvando…' : 'Salvar compra'}
          </button>
        </div>
      </div>
    </div>
  )
}
