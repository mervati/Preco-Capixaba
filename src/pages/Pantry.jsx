import { useState, lazy, Suspense } from 'react'
import { usePantry } from '../contexts/PantryContext'
import { useList } from '../contexts/ListContext'
import { useSupermarket } from '../contexts/SupermarketContext'
import { stripSizeFromName, fetchProductByBarcode } from '../lib/productLookup'
import { useProductImages } from '../contexts/ProductImageContext'
import ProductAvatar from '../components/ProductAvatar'

// Nome do grupo = nome sem o tamanho (ex: "ÓLEO DE SOJA - 900ML" → "ÓLEO DE SOJA")
function getProductGroup(productName) {
  return stripSizeFromName(productName) || productName
}

// Só baixa as bibliotecas de câmera/leitura quando o usuário abre o scanner
const BarcodeScanner = lazy(() => import('../components/BarcodeScanner'))
const QRScanner = lazy(() => import('../components/QRScanner'))

export default function Pantry() {
  const {
    pantryItems, loading, lowStockItems, addPantryItem, updateQty, updateMinQty, updateItem, deletePantryItem,
    lookupBarcodeProduct, saveBarcodeProduct,
  } = usePantry()
  const { addItem, activeList, items } = useList()
  const { supermarkets, getSupermarket, recordPrices } = useSupermarket()
  const [showAdd, setShowAdd] = useState(false)
  const [editingItem, setEditingItem] = useState(null)
  const [filter, setFilter] = useState('all')
  const [showBarcodeScanner, setShowBarcodeScanner] = useState(false)
  const [barcodePrefill, setBarcodePrefill] = useState(null)
  const [showQRScanner, setShowQRScanner] = useState(false)
  // Fila de itens esperando ter o código de barras escaneado (Fase 2: 1 item; Fase 3: vários)
  const [barcodeQueue, setBarcodeQueue] = useState([])
  const [barcodeTotal, setBarcodeTotal] = useState(0)

  function startBarcodeQueue(list) {
    setBarcodeQueue(list)
    setBarcodeTotal(list.length)
  }

  const noBarcodeCount = pantryItems.filter(i => !i.barcode).length

  const filtered = pantryItems.filter(i => {
    if (filter === 'low') return Number(i.min_qty) > 0 && Number(i.current_qty) < Number(i.min_qty)
    if (filter === 'ok') return Number(i.min_qty) === 0 || Number(i.current_qty) >= Number(i.min_qty)
    if (filter === 'nobarcode') return !i.barcode
    return true
  })

  function handleTopBarcodeResult(info) {
    setBarcodePrefill(info)
    setShowBarcodeScanner(false)
    setShowAdd(true)
  }

  // Liga o código escaneado ao primeiro item da fila (com nome/marca editados) e avança
  async function handleLinkBarcode(info) {
    const target = barcodeQueue[0]
    if (target && info?.barcode) {
      const fields = { barcode: info.barcode }
      if (info.product_name?.trim()) fields.product_name = info.product_name.trim().toUpperCase()
      if (info.brand !== undefined) fields.brand = info.brand?.trim() || null
      await updateItem(target.id, fields)
      await saveBarcodeProduct(info.barcode, fields.product_name || target.product_name, fields.brand ?? target.brand)
    }
    setBarcodeQueue(q => q.slice(1))
  }

  function isInList(productName) {
    return items.some(i => i.nome.trim().toUpperCase() === productName.trim().toUpperCase())
  }

  async function handleAddToList(item) {
    if (!activeList) return alert('Selecione uma lista de compras primeiro.')
    const missing = Number(item.min_qty) - Number(item.current_qty)
    if (missing <= 0 || isInList(item.product_name)) return
    await addItem({ nome: item.product_name, quantidade: missing, valor_unitario: 0, valor_total: 0 })
  }

  return (
    <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', overscrollBehavior: 'contain' }}>

      {/* Ações */}
      <div style={{ padding: '12px 16px 4px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => setShowQRScanner(true)}
            style={{
              flex: 1, padding: '11px 6px',
              background: 'var(--blue-50)', color: 'var(--blue-700)',
              border: '1.5px solid var(--blue-700)', borderRadius: 'var(--radius-md)',
              fontFamily: 'inherit', fontSize: 12, fontWeight: 600, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
              <rect x="3" y="14" width="7" height="7"/><path d="M14 14h.01M18 14h.01M14 18h.01M18 18h.01M21 14v4M14 21h7"/>
            </svg>
            Escanear nota fiscal
          </button>
          <button
            onClick={() => setShowBarcodeScanner(true)}
            style={{
              flex: 1, padding: '11px 6px',
              background: 'var(--blue-50)', color: 'var(--blue-700)',
              border: '1.5px solid var(--blue-700)', borderRadius: 'var(--radius-md)',
              fontFamily: 'inherit', fontSize: 12, fontWeight: 600, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 5v14M7 5v14M11 5v10M15 5v14M19 5v10M21 5v14" />
            </svg>
            Cód. de barras
          </button>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          style={{
            width: '100%', padding: '13px',
            background: 'none', color: 'var(--blue-700)',
            border: '1.5px solid var(--blue-700)', borderRadius: 'var(--radius-md)',
            fontFamily: 'inherit', fontSize: 14, fontWeight: 600, cursor: 'pointer',
          }}
        >
          + Adicionar manualmente
        </button>
      </div>

      {/* Filtros */}
      <div style={{ display: 'flex', gap: 8, padding: '12px 16px 4px', flexWrap: 'wrap' }}>
        {[
          ['all', 'Todos'],
          ['low', '⚠️ Acabando'],
          ['ok', '✓ OK'],
          ['nobarcode', noBarcodeCount > 0 ? `📷 Sem código (${noBarcodeCount})` : '📷 Sem código'],
        ].map(([val, label]) => (
          <button
            key={val}
            onClick={() => setFilter(val)}
            style={{
              padding: '5px 14px', borderRadius: 20, fontSize: 12, fontWeight: 500,
              fontFamily: 'inherit', cursor: 'pointer',
              border: '1.5px solid',
              borderColor: filter === val ? 'var(--blue-700)' : 'var(--border)',
              background: filter === val ? 'var(--blue-700)' : 'none',
              color: filter === val ? '#fff' : 'var(--text-2)',
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}><Spinner /></div>
      ) : filtered.length === 0 && pantryItems.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px 32px', color: 'var(--text-muted)' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🏠</div>
          <p style={{ fontSize: 14, lineHeight: 1.6, marginBottom: 20 }}>
            Nenhum item na despensa ainda. Escaneie uma nota fiscal na aba Lista para importar automaticamente.
          </p>
        </div>
      ) : (
        <div style={{ paddingBottom: 8 }}>
          {(() => {
            // Agrupa itens do mesmo produto pelo nome sem tamanho
            const grouped = {}
            for (const item of filtered) {
              const key = getProductGroup(item.product_name).trim().toUpperCase()
              if (!grouped[key]) grouped[key] = { displayName: getProductGroup(item.product_name), items: [] }
              grouped[key].items.push(item)
            }

            return Object.values(grouped).map(group => {
              // 1 marca → item normal (design intacto)
              if (group.items.length === 1) {
                const item = group.items[0]
                return (
                  <PantryItem
                    key={item.id}
                    item={item}
                    inList={isInList(item.product_name)}
                    supermarket={item.supermarket_id ? getSupermarket(item.supermarket_id) : null}
                    onUpdateQty={updateQty}
                    onUpdateMinQty={updateMinQty}
                    onDelete={deletePantryItem}
                    onAddToList={() => handleAddToList(item)}
                    onEdit={() => setEditingItem(item)}
                    onScanBarcode={() => startBarcodeQueue([item])}
                  />
                )
              }
              // 2+ marcas → card agrupado com escolha de marca ao mexer na quantidade
              return (
                <PantryGroupItem
                  key={group.displayName}
                  group={group}
                  getSupermarket={getSupermarket}
                  isInList={isInList}
                  onUpdateQty={updateQty}
                  onUpdateMinQty={updateMinQty}
                  onDelete={deletePantryItem}
                  onAddToList={handleAddToList}
                  onEdit={setEditingItem}
                  onScanBarcode={startBarcodeQueue}
                />
              )
            })
          })()}
        </div>
      )}

      {showAdd && (
        <AddPantryModal
          onClose={() => { setShowAdd(false); setBarcodePrefill(null) }}
          onAdd={addPantryItem}
          onRecordPrice={recordPrices}
          onLookupBarcode={lookupBarcodeProduct}
          onSaveBarcode={saveBarcodeProduct}
          supermarkets={supermarkets}
          prefill={barcodePrefill}
        />
      )}

      {showBarcodeScanner && (
        <Suspense fallback={<ModalSpinner />}>
          <BarcodeScanner
            onClose={() => setShowBarcodeScanner(false)}
            onResult={handleTopBarcodeResult}
            lookupLocal={lookupBarcodeProduct}
          />
        </Suspense>
      )}

      {showQRScanner && (
        <Suspense fallback={<ModalSpinner />}>
          <QRScanner
            onClose={() => setShowQRScanner(false)}
            onScanBarcodes={(newItems) => startBarcodeQueue(newItems)}
          />
        </Suspense>
      )}

      {/* Escaneia código de barras e liga ao item da fila (item da despensa ou pós-nota).
          Mostra qual produto é; o × cancela TODA a fila de uma vez. */}
      {barcodeQueue.length > 0 && (
        <Suspense fallback={<ModalSpinner />}>
          <BarcodeScanner
            key={barcodeQueue[0].id}
            captureOnly
            subtitle={barcodeQueue[0].product_name.toLowerCase()}
            initialName={barcodeQueue[0].product_name}
            initialBrand={barcodeQueue[0].brand || ''}
            quantity={barcodeQueue[0].current_qty}
            unit={barcodeQueue[0].unit}
            unitPrice={barcodeQueue[0]._unitPrice ?? undefined}
            progress={barcodeTotal > 1 ? `Produto ${barcodeTotal - barcodeQueue.length + 1} de ${barcodeTotal}` : undefined}
            onClose={() => setBarcodeQueue([])}
            onResult={handleLinkBarcode}
          />
        </Suspense>
      )}
      {editingItem && (
        <EditPantryModal
          item={editingItem}
          onClose={() => setEditingItem(null)}
          onSave={updateItem}
          onRecordPrice={recordPrices}
          onSaveBarcode={saveBarcodeProduct}
          supermarkets={supermarkets}
        />
      )}
    </div>
  )
}

function PantryItem({ item, inList, supermarket, onUpdateQty, onUpdateMinQty, onDelete, onAddToList, onEdit, onScanBarcode }) {
  const { getImage } = useProductImages()
  const image = getImage(item.product_name)
  const current = Number(item.current_qty)
  const min = Number(item.min_qty)
  const isLow = min > 0 && current < min
  const isEmpty = current === 0
  const pct = min > 0 ? Math.min((current / min) * 100, 100) : 100

  const barColor = isEmpty ? '#ef4444' : isLow ? '#f97316' : '#22c55e'

  const [editingMin, setEditingMin] = useState(false)
  const [minDraft, setMinDraft] = useState(String(min))
  const [confirmZero, setConfirmZero] = useState(false)

  function startEditMin() {
    setMinDraft(String(min))
    setEditingMin(true)
  }

  function saveMin() {
    const val = Math.max(0, parseInt(minDraft, 10) || 0)
    onUpdateMinQty(item.id, val)
    setEditingMin(false)
  }

  function handleMinKey(e) {
    if (e.key === 'Enter') saveMin()
    if (e.key === 'Escape') setEditingMin(false)
  }

  function handleConsume() {
    if (current === 1) {
      setConfirmZero(true)
      return
    }
    onUpdateQty(item.id, Math.max(0, current - 1))
  }

  function confirmConsumeLast() {
    onUpdateQty(item.id, 0)
    setConfirmZero(false)
  }

  return (
    <div style={{
      padding: '12px 16px',
      borderBottom: '1px solid var(--border)',
      background: 'var(--surface)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>

        <button
          onClick={onEdit}
          title="Editar item"
          style={{
            width: 44, height: 44, borderRadius: 10, flexShrink: 0,
            background: 'var(--blue-50)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: 'none', cursor: 'pointer', padding: 0, fontFamily: 'inherit',
            overflow: 'hidden',
          }}
        >
          {image ? (
            <img src={image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <span style={{ fontSize: 18, fontWeight: 700, color: 'var(--blue-700)' }}>
              {item.product_name[0]}
            </span>
          )}
        </button>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', textTransform: 'capitalize', marginBottom: 3 }}>
            {item.product_name.toLowerCase()}
          </div>

          {item.brand && (
            <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'capitalize', marginBottom: 3 }}>
              {item.brand.toLowerCase()}
            </div>
          )}

          {supermarket && (
            <div style={{ marginBottom: 3 }}>
              <span style={{
                display: 'inline-block', whiteSpace: 'nowrap',
                fontSize: 10, fontWeight: 700, padding: '1px 7px', borderRadius: 10,
                background: supermarket.color, color: '#fff',
              }}>
                {supermarket.name}
              </span>
            </div>
          )}

          {/* Mínimo editável */}
          {editingMin ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>mínimo:</span>
              <input
                autoFocus
                type="number"
                inputMode="numeric"
                min="0"
                value={minDraft}
                onChange={e => setMinDraft(e.target.value)}
                onFocus={e => e.target.select()}
                onBlur={saveMin}
                onKeyDown={handleMinKey}
                style={{
                  width: 52, fontSize: 12, fontFamily: 'inherit',
                  border: '1.5px solid var(--blue-500)', borderRadius: 6,
                  padding: '2px 6px', outline: 'none', background: 'var(--bg)',
                  color: 'var(--text)',
                }}
              />
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{item.unit}</span>
            </div>
          ) : min === 0 ? (
            <button
              onClick={startEditMin}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                fontSize: 11, color: 'var(--blue-700)', fontFamily: 'inherit',
                padding: 0, textDecoration: 'underline', textDecorationStyle: 'dotted',
              }}
            >
              Definir quantidade mínima
            </button>
          ) : (
            <button
              onClick={startEditMin}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                fontSize: 11, color: 'var(--text-muted)', fontFamily: 'inherit',
                padding: 0, display: 'flex', alignItems: 'center', gap: 4,
              }}
            >
              mínimo: {min} {item.unit}
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            </button>
          )}
        </div>

        {isLow && (
          inList ? (
            <span style={{
              fontSize: 11, fontWeight: 700, padding: '4px 10px',
              background: '#dcfce7', color: '#15803d',
              border: '1px solid #bbf7d0', borderRadius: 20,
              flexShrink: 0, whiteSpace: 'nowrap',
            }}>
              ✓ Na lista
            </span>
          ) : (
            <button
              onClick={onAddToList}
              title="Adicionar à lista de compras"
              style={{
                fontSize: 11, fontWeight: 700, padding: '4px 10px',
                background: 'var(--blue-50)', color: 'var(--blue-700)',
                border: '1px solid var(--blue-100)', borderRadius: 20,
                fontFamily: 'inherit', cursor: 'pointer',
                flexShrink: 0, whiteSpace: 'nowrap',
              }}
            >
              + Lista
            </button>
          )
        )}

        {/* Escanear código de barras — só quando o item ainda não tem */}
        {!item.barcode && (
          <button
            onClick={onScanBarcode}
            title="Escanear código de barras"
            style={{
              fontSize: 11, fontWeight: 700, padding: '4px 10px',
              background: 'var(--gold-light)', color: 'var(--gold)',
              border: '1px solid var(--gold-mid)', borderRadius: 20,
              fontFamily: 'inherit', cursor: 'pointer',
              flexShrink: 0, whiteSpace: 'nowrap',
            }}
          >
            📷 Código
          </button>
        )}

        {/* Quantidade: repor / consumir */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <button
            onClick={() => onUpdateQty(item.id, current + 1)}
            title="Repor"
            style={qtyBtn}
          >
            +
          </button>
          <span className="tabular" style={{ fontSize: 14, fontWeight: 700, minWidth: 18, textAlign: 'center', color: isLow ? '#e53e3e' : 'var(--text)' }}>
            {current}
          </span>
          <button
            onClick={handleConsume}
            title="Consumir"
            style={qtyBtn}
          >
            −
          </button>
        </div>

        <button
          onClick={() => onDelete(item.id)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--border-strong)', padding: 4 }}
          onMouseEnter={e => e.currentTarget.style.color = '#e53e3e'}
          onMouseLeave={e => e.currentTarget.style.color = 'var(--border-strong)'}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
        </button>
      </div>

      {/* Barra de estoque — só mostra se mínimo definido */}
      {min > 0 && (
        <div style={{ height: 5, background: 'var(--border)', borderRadius: 99, overflow: 'hidden' }}>
          <div style={{
            height: '100%', width: `${pct}%`,
            background: barColor, borderRadius: 99,
            transition: 'width 0.3s, background 0.3s',
          }} />
        </div>
      )}

      {confirmZero && (
        <div
          onClick={() => setConfirmZero(false)}
          style={{
            position: 'absolute', inset: 0, zIndex: 60,
            background: 'rgba(26,22,20,0.5)',
            display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
            padding: 16,
          }}
        >
          <div onClick={e => e.stopPropagation()} style={{ background: 'var(--surface)', borderRadius: 'var(--radius-lg)', width: '100%', maxWidth: 480, padding: '24px 24px 28px' }}>
            <p style={{ fontSize: 14, color: 'var(--text)', marginBottom: 20, lineHeight: 1.5 }}>
              Consumir o último <strong style={{ textTransform: 'capitalize' }}>{item.product_name.toLowerCase()}</strong>? O estoque ficará zerado.
            </p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setConfirmZero(false)} style={btnSec}>Cancelar</button>
              <button onClick={confirmConsumeLast} style={btnPri}>Sim, consumir</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function PantryGroupItem({ group, getSupermarket, isInList, onUpdateQty, onUpdateMinQty, onDelete, onAddToList, onEdit, onScanBarcode }) {
  const items = group.items
  const current = items.reduce((s, i) => s + Number(i.current_qty), 0)
  const min = Math.max(...items.map(i => Number(i.min_qty)))
  const unit = items[0].unit
  const isLow = min > 0 && current < min
  const isEmpty = current === 0
  const pct = min > 0 ? Math.min((current / min) * 100, 100) : 100
  const barColor = isEmpty ? '#ef4444' : isLow ? '#f97316' : '#22c55e'

  // Marcas para o subtítulo
  const brands = items.map(i => i.brand).filter(Boolean)
  const subtitle = brands.length ? brands.join(' · ') : `${items.length} variações`

  // Supermercado só aparece se todas as marcas forem do mesmo
  const superIds = [...new Set(items.map(i => i.supermarket_id).filter(Boolean))]
  const supermarket = superIds.length === 1 ? getSupermarket(superIds[0]) : null

  const inList = items.some(i => isInList(i.product_name))
  const anyNoBarcode = items.some(i => !i.barcode)

  const [editingMin, setEditingMin] = useState(false)
  const [minDraft, setMinDraft] = useState(String(min))
  const [chooser, setChooser] = useState(null) // 'add' | 'sub' | 'del' | 'edit'

  function startEditMin() {
    setMinDraft(String(min))
    setEditingMin(true)
  }
  function saveMin() {
    const val = Math.max(0, parseInt(minDraft, 10) || 0)
    // Aplica o mesmo mínimo a todas as marcas do grupo
    items.forEach(i => onUpdateMinQty(i.id, val))
    setEditingMin(false)
  }
  function handleMinKey(e) {
    if (e.key === 'Enter') saveMin()
    if (e.key === 'Escape') setEditingMin(false)
  }

  function pick(item) {
    if (chooser === 'add') onUpdateQty(item.id, Number(item.current_qty) + 1)
    else if (chooser === 'sub') onUpdateQty(item.id, Math.max(0, Number(item.current_qty) - 1))
    else if (chooser === 'del') onDelete(item.id)
    else if (chooser === 'edit') onEdit(item)
    setChooser(null)
  }

  const chooserTitle = {
    add: 'Qual marca repor?',
    sub: 'Qual marca consumir?',
    del: 'Qual marca excluir?',
    edit: 'Qual marca editar?',
  }[chooser]

  return (
    <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', background: 'var(--surface)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>

        <button
          onClick={() => setChooser('edit')}
          title="Editar item"
          style={{
            width: 44, height: 44, borderRadius: 10, flexShrink: 0,
            background: 'var(--blue-50)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: 'none', cursor: 'pointer', padding: 0, fontFamily: 'inherit',
          }}
        >
          <span style={{ fontSize: 18, fontWeight: 700, color: 'var(--blue-700)' }}>
            {group.displayName[0]}
          </span>
        </button>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', textTransform: 'capitalize', marginBottom: 3, display: 'flex', alignItems: 'center', gap: 6 }}>
            {group.displayName.toLowerCase()}
            <span style={{ fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 10, background: 'var(--blue-50)', color: 'var(--blue-700)' }}>
              {items.length} marcas
            </span>
          </div>

          <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'capitalize', marginBottom: 3 }}>
            {subtitle.toLowerCase()}
          </div>

          {supermarket && (
            <div style={{ marginBottom: 3 }}>
              <span style={{
                display: 'inline-block', whiteSpace: 'nowrap',
                fontSize: 10, fontWeight: 700, padding: '1px 7px', borderRadius: 10,
                background: supermarket.color, color: '#fff',
              }}>
                {supermarket.name}
              </span>
            </div>
          )}

          {editingMin ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>mínimo:</span>
              <input
                autoFocus type="number" inputMode="numeric" min="0"
                value={minDraft}
                onChange={e => setMinDraft(e.target.value)}
                onFocus={e => e.target.select()}
                onBlur={saveMin}
                onKeyDown={handleMinKey}
                style={{
                  width: 52, fontSize: 12, fontFamily: 'inherit',
                  border: '1.5px solid var(--blue-500)', borderRadius: 6,
                  padding: '2px 6px', outline: 'none', background: 'var(--bg)', color: 'var(--text)',
                }}
              />
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{unit}</span>
            </div>
          ) : min === 0 ? (
            <button
              onClick={startEditMin}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                fontSize: 11, color: 'var(--blue-700)', fontFamily: 'inherit',
                padding: 0, textDecoration: 'underline', textDecorationStyle: 'dotted',
              }}
            >
              Definir quantidade mínima
            </button>
          ) : (
            <button
              onClick={startEditMin}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                fontSize: 11, color: 'var(--text-muted)', fontFamily: 'inherit',
                padding: 0, display: 'flex', alignItems: 'center', gap: 4,
              }}
            >
              mínimo: {min} {unit}
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            </button>
          )}
        </div>

        {isLow && (
          inList ? (
            <span style={{
              fontSize: 11, fontWeight: 700, padding: '4px 10px',
              background: '#dcfce7', color: '#15803d',
              border: '1px solid #bbf7d0', borderRadius: 20,
              flexShrink: 0, whiteSpace: 'nowrap',
            }}>
              ✓ Na lista
            </span>
          ) : (
            <button
              onClick={() => onAddToList(items.find(i => Number(i.min_qty) > Number(i.current_qty)) || items[0])}
              title="Adicionar à lista de compras"
              style={{
                fontSize: 11, fontWeight: 700, padding: '4px 10px',
                background: 'var(--blue-50)', color: 'var(--blue-700)',
                border: '1px solid var(--blue-100)', borderRadius: 20,
                fontFamily: 'inherit', cursor: 'pointer',
                flexShrink: 0, whiteSpace: 'nowrap',
              }}
            >
              + Lista
            </button>
          )
        )}

        {anyNoBarcode && (
          <button
            onClick={() => onScanBarcode(items.filter(i => !i.barcode))}
            title="Escanear código de barras"
            style={{
              fontSize: 11, fontWeight: 700, padding: '4px 10px',
              background: 'var(--gold-light)', color: 'var(--gold)',
              border: '1px solid var(--gold-mid)', borderRadius: 20,
              fontFamily: 'inherit', cursor: 'pointer',
              flexShrink: 0, whiteSpace: 'nowrap',
            }}
          >
            📷 Código
          </button>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <button onClick={() => setChooser('add')} title="Repor" style={qtyBtn}>+</button>
          <span className="tabular" style={{ fontSize: 14, fontWeight: 700, minWidth: 18, textAlign: 'center', color: isLow ? '#e53e3e' : 'var(--text)' }}>
            {current}
          </span>
          <button onClick={() => setChooser('sub')} title="Consumir" style={qtyBtn}>−</button>
        </div>

        <button
          onClick={() => setChooser('del')}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--border-strong)', padding: 4 }}
          onMouseEnter={e => e.currentTarget.style.color = '#e53e3e'}
          onMouseLeave={e => e.currentTarget.style.color = 'var(--border-strong)'}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
        </button>
      </div>

      {min > 0 && (
        <div style={{ height: 5, background: 'var(--border)', borderRadius: 99, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${pct}%`, background: barColor, borderRadius: 99, transition: 'width 0.3s, background 0.3s' }} />
        </div>
      )}

      {chooser && (
        <div
          onClick={() => setChooser(null)}
          style={{
            position: 'fixed', inset: 0, zIndex: 100,
            background: 'rgba(0,0,0,0.45)',
            display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
          }}
        >
          <div onClick={e => e.stopPropagation()} style={{
            width: '100%', maxWidth: 480, background: 'var(--surface)',
            borderRadius: 'var(--radius-lg) var(--radius-lg) 0 0', padding: '24px 20px 32px',
          }}>
            <div style={{ marginBottom: 20 }}>
              <span style={{ fontSize: 17, fontWeight: 700, color: 'var(--text)', textTransform: 'capitalize' }}>
                {group.displayName.toLowerCase()}
              </span>
              <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>{chooserTitle}</div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {items.map(item => (
                <button
                  key={item.id}
                  onClick={() => pick(item)}
                  style={{
                    width: '100%', padding: '12px 16px',
                    background: chooser === 'del' ? '#fef2f2' : 'var(--blue-50)',
                    border: `1.5px solid ${chooser === 'del' ? '#fecaca' : 'var(--blue-100)'}`,
                    borderRadius: 'var(--radius-sm)',
                    fontSize: 14, color: 'var(--text)', cursor: 'pointer',
                    fontFamily: 'inherit', textAlign: 'left',
                  }}
                >
                  <div style={{ fontWeight: 600, textTransform: 'capitalize' }}>
                    {(item.brand || item.product_name).toLowerCase()}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                    Estoque: {item.current_qty} {item.unit}
                  </div>
                </button>
              ))}
            </div>

            <button
              onClick={() => setChooser(null)}
              style={{
                width: '100%', marginTop: 16, padding: '12px 0',
                background: 'none', border: '1.5px solid var(--border)',
                borderRadius: 'var(--radius-sm)',
                fontSize: 14, fontWeight: 600, color: 'var(--text-2)',
                cursor: 'pointer', fontFamily: 'inherit',
              }}
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function AddPantryModal({ onClose, onAdd, onRecordPrice, onLookupBarcode, onSaveBarcode, supermarkets, prefill }) {
  const [name, setName] = useState(() => {
    if (!prefill?.name) return ''
    let n = prefill.fromLocal ? prefill.name : stripSizeFromName(prefill.name).toUpperCase()
    if (!prefill.fromLocal && prefill.quantity && prefill.unit) n += ` - ${prefill.quantity}${prefill.unit}`
    return n
  })
  const [brand, setBrand] = useState(prefill?.brand || '')
  const [minQty, setMinQty] = useState(1)
  const [currentQty, setCurrentQty] = useState(0)
  const [unit, setUnit] = useState('UN')
  const [supermarketId, setSupermarketId] = useState('')
  const [price, setPrice] = useState(0)
  const [barcode, setBarcode] = useState(prefill?.barcode || null)
  const [barcodeInput, setBarcodeInput] = useState(prefill?.barcode || '')
  const [barcodeStatus, setBarcodeStatus] = useState(prefill?.name ? 'found' : null)
  const [loading, setLoading] = useState(false)
  const [confirmNoPrice, setConfirmNoPrice] = useState(false)

  async function handleBarcodeSearch() {
    const code = barcodeInput.trim().replace(/\D/g, '')
    if (!code) return
    setBarcodeStatus('loading')
    const local = await onLookupBarcode(code)
    if (local) {
      handleBarcodeResult({ ...local, barcode: code })
      setBarcodeStatus('found')
      return
    }
    const info = await fetchProductByBarcode(code)
    if (info?.name) {
      handleBarcodeResult({ ...info, barcode: code })
      setBarcodeStatus('found')
    } else {
      setBarcode(code)
      setBarcodeStatus('notfound')
    }
  }

  function handleBarcodeResult(info) {
    if (info.name) {
      let displayName = info.fromLocal ? info.name : stripSizeFromName(info.name).toUpperCase()
      if (!info.fromLocal && info.quantity && info.unit) displayName += ` - ${info.quantity}${info.unit}`
      setName(displayName)
    }
    if (info.brand) setBrand(info.brand)
    if (info.barcode) setBarcode(info.barcode)
  }

  function handleSubmit(e) {
    e.preventDefault()
    if (!name.trim()) return
    if (Number(price) <= 0 && !confirmNoPrice) {
      setConfirmNoPrice(true)
      return
    }
    doSave()
  }

  async function doSave() {
    setLoading(true)
    await onAdd({
      product_name: name.trim().toUpperCase(),
      brand: brand.trim() || null,
      min_qty: minQty,
      current_qty: currentQty,
      unit,
      supermarket_id: supermarketId || null,
      barcode,
    })
    if (Number(price) > 0 && supermarketId) {
      await onRecordPrice([{ nome: name.trim().toUpperCase(), valor_unitario: Number(price) }], supermarketId)
    }
    if (barcode) await onSaveBarcode(barcode, name.trim().toUpperCase(), brand.trim() || null)
    setLoading(false)
    onClose()
  }

  return (
    <div onClick={onClose} style={{ position: 'absolute', inset: 0, zIndex: 50, background: 'rgba(26,22,20,0.5)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', padding: 16 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: 'var(--surface)', borderRadius: 'var(--radius-lg)', width: '100%', maxWidth: 480, padding: '24px 24px 32px' }}>
        <h2 style={{ fontSize: 17, fontWeight: 700, marginBottom: 18, color: 'var(--text)' }}>Adicionar à despensa</h2>

        {/* Campo de digitação de código de barras */}
        <div style={{ marginBottom: 12 }}>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              type="tel"
              inputMode="numeric"
              value={barcodeInput}
              onChange={e => { setBarcodeInput(e.target.value); setBarcodeStatus(null) }}
              onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleBarcodeSearch())}
              placeholder="Digitar código de barras"
              style={{ ...inputStyle, flex: 1 }}
              onFocus={e => e.target.style.borderColor = 'var(--blue-500)'}
              onBlur={e => e.target.style.borderColor = 'var(--border)'}
            />
            <button
              type="button"
              onClick={handleBarcodeSearch}
              disabled={barcodeStatus === 'loading' || !barcodeInput.trim()}
              style={{
                padding: '10px 14px', borderRadius: 'var(--radius-sm)', border: 'none',
                background: 'var(--blue-700)', color: '#fff',
                fontFamily: 'inherit', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                flexShrink: 0, opacity: (!barcodeInput.trim() || barcodeStatus === 'loading') ? 0.5 : 1,
              }}
            >
              {barcodeStatus === 'loading' ? '...' : 'Buscar'}
            </button>
          </div>
          {barcodeStatus === 'found' && (
            <p style={{ fontSize: 11, color: '#15803d', marginTop: 4 }}>✓ Produto encontrado — campos preenchidos automaticamente.</p>
          )}
          {barcodeStatus === 'notfound' && (
            <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>Produto não encontrado — preencha o nome manualmente.</p>
          )}
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <input autoFocus value={name} onChange={e => setName(e.target.value)} placeholder="Nome do produto" style={inputStyle} onFocus={e => e.target.style.borderColor = 'var(--blue-500)'} onBlur={e => e.target.style.borderColor = 'var(--border)'} />
          <input value={brand} onChange={e => setBrand(e.target.value)} placeholder="Marca (opcional)" style={inputStyle} onFocus={e => e.target.style.borderColor = 'var(--blue-500)'} onBlur={e => e.target.style.borderColor = 'var(--border)'} />

          <div>
            <label style={labelStyle}>Supermercado</label>
            {supermarkets.length === 0 ? (
              <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                Nenhum cadastrado — toque no logo no topo do app para adicionar um.
              </p>
            ) : (
              <select value={supermarketId} onChange={e => setSupermarketId(e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}>
                <option value="">Nenhum</option>
                {supermarkets.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            )}
          </div>

          <div>
            <label style={labelStyle}>Preço (opcional)</label>
            <input
              type="number" min="0" step="0.01" inputMode="decimal"
              value={price} onChange={e => setPrice(e.target.value)}
              placeholder="R$ 0,00"
              style={inputStyle}
              onFocus={e => { e.target.style.borderColor = 'var(--blue-500)'; e.target.select() }}
              onBlur={e => e.target.style.borderColor = 'var(--border)'}
            />
            {Number(price) > 0 && !supermarketId && (
              <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                Selecione um supermercado para esse preço entrar no Radar de Preços.
              </p>
            )}
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Qtd. atual</label>
              <input type="number" inputMode="numeric" min="0" value={currentQty} onChange={e => setCurrentQty(Number(e.target.value))} style={{ ...inputStyle, textAlign: 'center' }} onFocus={e => { e.target.style.borderColor = 'var(--blue-500)'; e.target.select() }} onBlur={e => e.target.style.borderColor = 'var(--border)'} />
            </div>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Qtd. mínima</label>
              <input type="number" inputMode="numeric" min="0" value={minQty} onChange={e => setMinQty(Number(e.target.value))} style={{ ...inputStyle, textAlign: 'center' }} onFocus={e => { e.target.style.borderColor = 'var(--blue-500)'; e.target.select() }} onBlur={e => e.target.style.borderColor = 'var(--border)'} />
            </div>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Unidade</label>
              <select value={unit} onChange={e => setUnit(e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}>
                {['UN', 'KG', 'G', 'L', 'ML', 'CX', 'PCT'].map(u => <option key={u}>{u}</option>)}
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
            <button type="button" onClick={onClose} style={btnSec}>Cancelar</button>
            <button type="submit" disabled={loading} style={btnPri}>{loading ? 'Salvando...' : 'Adicionar'}</button>
          </div>
        </form>
      </div>

      {confirmNoPrice && (
        <div
          onClick={() => setConfirmNoPrice(false)}
          style={{
            position: 'absolute', inset: 0, zIndex: 60,
            background: 'rgba(26,22,20,0.5)',
            display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
            padding: 16,
          }}
        >
          <div onClick={e => e.stopPropagation()} style={{ background: 'var(--surface)', borderRadius: 'var(--radius-lg)', width: '100%', maxWidth: 480, padding: '24px 24px 28px' }}>
            <p style={{ fontSize: 14, color: 'var(--text)', marginBottom: 20, lineHeight: 1.5 }}>
              Você não informou o preço. Cadastrar mesmo assim, sem preço?
            </p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setConfirmNoPrice(false)} style={btnSec}>Voltar</button>
              <button onClick={() => { setConfirmNoPrice(false); doSave() }} style={btnPri}>Sim, cadastrar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function EditPantryModal({ item, onClose, onSave, onRecordPrice, onSaveBarcode, supermarkets }) {
  const [name, setName] = useState(item.product_name)
  const [brand, setBrand] = useState(item.brand || '')
  const [minQty, setMinQty] = useState(Number(item.min_qty))
  const [currentQty, setCurrentQty] = useState(Number(item.current_qty))
  const [unit, setUnit] = useState(item.unit || 'UN')
  const [supermarketId, setSupermarketId] = useState(item.supermarket_id || '')
  const [price, setPrice] = useState('')
  const [barcode, setBarcode] = useState(item.barcode || '')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    if (!name.trim()) return
    setLoading(true)
    const cleanBarcode = barcode.trim().replace(/\D/g, '') || null
    await onSave(item.id, {
      product_name: name.trim().toUpperCase(),
      brand: brand.trim() || null,
      min_qty: minQty,
      current_qty: currentQty,
      unit,
      supermarket_id: supermarketId || null,
      barcode: cleanBarcode,
    })
    if (Number(price) > 0 && supermarketId) {
      await onRecordPrice([{ nome: name.trim().toUpperCase(), valor_unitario: Number(price) }], supermarketId)
    }
    if (cleanBarcode) await onSaveBarcode(cleanBarcode, name.trim().toUpperCase(), brand.trim() || null)
    setLoading(false)
    onClose()
  }

  return (
    <div onClick={onClose} style={{ position: 'absolute', inset: 0, zIndex: 50, background: 'rgba(26,22,20,0.5)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', padding: 16 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: 'var(--surface)', borderRadius: 'var(--radius-lg)', width: '100%', maxWidth: 480, padding: '24px 24px 32px' }}>
        <h2 style={{ fontSize: 17, fontWeight: 700, marginBottom: 18, color: 'var(--text)' }}>Editar item</h2>

        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
          <ProductAvatar productName={name || item.product_name} size={72} borderRadius={16} editable />
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <input autoFocus value={name} onChange={e => setName(e.target.value)} placeholder="Nome do produto" style={inputStyle} onFocus={e => e.target.style.borderColor = 'var(--blue-500)'} onBlur={e => e.target.style.borderColor = 'var(--border)'} />
          <input value={brand} onChange={e => setBrand(e.target.value)} placeholder="Marca (opcional)" style={inputStyle} onFocus={e => e.target.style.borderColor = 'var(--blue-500)'} onBlur={e => e.target.style.borderColor = 'var(--border)'} />

          <div>
            <label style={labelStyle}>Código de barras (opcional)</label>
            <input
              type="tel" inputMode="numeric"
              value={barcode} onChange={e => setBarcode(e.target.value)}
              placeholder="Digitar código de barras"
              style={inputStyle}
              onFocus={e => e.target.style.borderColor = 'var(--blue-500)'}
              onBlur={e => e.target.style.borderColor = 'var(--border)'}
            />
          </div>

          <div>
            <label style={labelStyle}>Supermercado</label>
            {supermarkets.length === 0 ? (
              <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                Nenhum cadastrado — toque no logo no topo do app para adicionar um.
              </p>
            ) : (
              <select value={supermarketId} onChange={e => setSupermarketId(e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}>
                <option value="">Nenhum</option>
                {supermarkets.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            )}
          </div>

          {item.source !== 'nfce' && (
            <div>
              <label style={labelStyle}>Registrar novo preço (opcional)</label>
              <input
                type="number" min="0" step="0.01" inputMode="decimal"
                value={price} onChange={e => setPrice(e.target.value)}
                placeholder="R$ 0,00"
                style={inputStyle}
                onFocus={e => { e.target.style.borderColor = 'var(--blue-500)'; e.target.select() }}
                onBlur={e => e.target.style.borderColor = 'var(--border)'}
              />
              {Number(price) > 0 && !supermarketId && (
                <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                  Selecione um supermercado para esse preço entrar no Radar de Preços.
                </p>
              )}
            </div>
          )}

          <div style={{ display: 'flex', gap: 10 }}>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Qtd. atual</label>
              <input type="number" inputMode="numeric" min="0" value={currentQty} onChange={e => setCurrentQty(Number(e.target.value))} style={{ ...inputStyle, textAlign: 'center' }} onFocus={e => { e.target.style.borderColor = 'var(--blue-500)'; e.target.select() }} onBlur={e => e.target.style.borderColor = 'var(--border)'} />
            </div>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Qtd. mínima</label>
              <input type="number" inputMode="numeric" min="0" value={minQty} onChange={e => setMinQty(Number(e.target.value))} style={{ ...inputStyle, textAlign: 'center' }} onFocus={e => { e.target.style.borderColor = 'var(--blue-500)'; e.target.select() }} onBlur={e => e.target.style.borderColor = 'var(--border)'} />
            </div>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Unidade</label>
              <select value={unit} onChange={e => setUnit(e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}>
                {['UN', 'KG', 'G', 'L', 'ML', 'CX', 'PCT'].map(u => <option key={u}>{u}</option>)}
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
            <button type="button" onClick={onClose} style={btnSec}>Cancelar</button>
            <button type="submit" disabled={loading} style={btnPri}>{loading ? 'Salvando...' : 'Salvar'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}

const inputStyle = { border: '1.5px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '10px 12px', fontSize: 14, fontFamily: 'inherit', color: 'var(--text)', background: 'var(--bg)', outline: 'none', width: '100%', transition: 'border-color 0.15s' }
const labelStyle = { fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.4px', display: 'block', marginBottom: 4 }
const qtyBtn = { width: 28, height: 28, borderRadius: '50%', border: '1.5px solid var(--border)', background: 'var(--bg)', cursor: 'pointer', fontFamily: 'inherit', fontSize: 16, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-2)' }
const btnSec = { flex: 1, padding: '12px', border: '1.5px solid var(--border)', borderRadius: 'var(--radius-sm)', background: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 14, fontWeight: 600, color: 'var(--text-2)' }
const btnPri = { flex: 2, padding: '12px', border: 'none', borderRadius: 'var(--radius-sm)', background: 'var(--blue-700)', cursor: 'pointer', fontFamily: 'inherit', fontSize: 14, fontWeight: 700, color: '#fff' }

function Spinner() {
  return <div style={{ width: 32, height: 32, borderRadius: '50%', border: '3px solid var(--border)', borderTopColor: 'var(--blue-700)', animation: 'spin 0.8s linear infinite' }}><style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style></div>
}

function ModalSpinner() {
  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 50, background: 'rgba(10,15,10,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Spinner />
    </div>
  )
}
