import { useEffect, useRef, useState } from 'react'
import { Html5Qrcode } from 'html5-qrcode'
import { usePantry } from '../contexts/PantryContext'
import { useSupermarket } from '../contexts/SupermarketContext'
import { useList } from '../contexts/ListContext'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { MOCK_ITEMS, MOCK_EMITENTE, isMockUrl } from '../lib/mockNFCe'

export default function QRScanner({ onClose, onScanBarcodes }) {
  const { user } = useAuth()
  const { addItemsBatchToPantry, pantryItems } = usePantry()
  const { supermarkets, findOrCreateSupermarket, recordPrices } = useSupermarket()
  const { fetchPriceIndex } = useList()
  const scannerRef = useRef(null)
  const startedRef = useRef(false)
  const fileInputRef = useRef(null)
  const [status, setStatus] = useState('scanning')
  const [cameraError, setCameraError] = useState(false)
  const [message, setMessage] = useState('')
  const [count, setCount] = useState(0)
  const [pendingItems, setPendingItems] = useState(null)
  const [marketName, setMarketName] = useState('')
  const [emissionDate, setEmissionDate] = useState(null)
  const [manualUrl, setManualUrl] = useState('')
  const [newItems, setNewItems] = useState([])

  useEffect(() => {
    // Detector nativo do navegador quando disponível — ajuda a ler o QR denso da NFC-e
    const scanner = new Html5Qrcode('qr-reader', {
      experimentalFeatures: { useBarCodeDetectorIfSupported: true },
    })
    scannerRef.current = scanner

    const config = { fps: 10, qrbox: { width: 260, height: 260 } }
    const onOk = () => { startedRef.current = true }

    // Tenta resolução alta primeiro; se o celular recusar, cai para menor e por fim a padrão.
    // Assim a câmera sempre abre, e quando dá, abre em resolução melhor (lê QR denso).
    const tiers = [
      { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } },
      { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
      { facingMode: 'environment' },
    ]

    function tryStart(i) {
      scanner.start(tiers[i], config, (decoded) => handleScan(decoded), () => {})
        .then(onOk)
        .catch(() => {
          if (i + 1 < tiers.length) tryStart(i + 1)
          else setCameraError(true)
        })
    }
    tryStart(0)

    return () => {
      if (startedRef.current) {
        scanner.stop().catch(() => {})
      }
    }
  }, [])

  async function stopScanner() {
    if (startedRef.current && scannerRef.current?.isScanning) {
      await scannerRef.current.stop().catch(() => {})
      startedRef.current = false
    }
  }

  async function handleScan(url) {
    if (status !== 'scanning') return
    setStatus('loading')
    setMessage('Lendo nota fiscal...')
    await stopScanner()
    processUrl(url)
  }

  // Lê o QR a partir de uma FOTO — resolução muito maior que o vídeo, ideal p/ QR denso da NFC-e
  async function handleFile(e) {
    const file = e.target.files?.[0]
    if (!file || status !== 'scanning') return
    setStatus('loading')
    setMessage('Lendo foto da nota...')
    await stopScanner()
    try {
      const decoded = await decodeImageFile(file)
      if (!decoded) throw new Error()
      processUrl(decoded)
    } catch {
      setStatus('error')
      setMessage('Não consegui ler o QR nessa foto. Fotografe SÓ o QR Code, preenchendo a tela, bem focado e iluminado.')
    }
  }

  // Decodifica o QR de uma imagem: usa o detector nativo (Android) e, se não houver, o leitor JS
  async function decodeImageFile(file) {
    // 1) Detector nativo do navegador — mais confiável (Android/Chrome)
    if ('BarcodeDetector' in window) {
      try {
        const detector = new window.BarcodeDetector({ formats: ['qr_code'] })
        const bitmap = await createImageBitmap(file)
        const codes = await detector.detect(bitmap)
        bitmap.close?.()
        if (codes && codes.length) return codes[0].rawValue
      } catch { /* cai para o fallback */ }
    }
    // 2) Fallback: leitor em JavaScript (iPhone/Safari)
    const fileScanner = new Html5Qrcode('qr-file-reader', {
      experimentalFeatures: { useBarCodeDetectorIfSupported: true },
    })
    try {
      const decoded = await fileScanner.scanFile(file, false)
      return decoded
    } finally {
      await fileScanner.clear().catch(() => {})
    }
  }

  async function handleMock() {
    if (status !== 'scanning') return
    setStatus('loading')
    setMessage('Simulando leitura de nota...')
    await stopScanner()
    processUrl('https://nfce.sefaz.es.gov.br/MOCK')
  }

  async function handleManualSubmit(e) {
    e.preventDefault()
    if (!manualUrl.trim() || status !== 'scanning') return
    setStatus('loading')
    setMessage('Lendo nota fiscal...')
    await stopScanner()
    processUrl(manualUrl.trim())
  }

  async function processUrl(url) {
    try {
      let items, emitente
      if (isMockUrl(url)) {
        await new Promise(r => setTimeout(r, 1400))
        items = MOCK_ITEMS.map(i => ({
          nome: i.nome,
          quantidade: i.quantidade,
          valor_unitario: i.valorUnitario,
          valor_total: i.valorTotal,
        }))
        emitente = MOCK_EMITENTE
      } else {
        const res = await fetch(`/api/sefaz?url=${encodeURIComponent(url)}`)
        if (!res.ok) throw new Error()
        const data = await res.json()
        items = data.items
        emitente = data.emitente
        if (data.emissionDate) setEmissionDate(data.emissionDate)
      }
      setPendingItems(items)
      setMarketName(emitente || '')
      setStatus('confirm')
    } catch {
      setStatus('error')
      setMessage('Não foi possível ler a nota. Tente novamente.')
    }
  }

  async function handleConfirmImport() {
    setStatus('loading')
    setMessage('Importando itens...')
    try {
      const supermarket = await findOrCreateSupermarket(marketName)
      const created = await addItemsBatchToPantry(pendingItems, supermarket?.id || null)

      // Salva no histórico de compras (primeiro, para obter o id da compra)
      const snapshot = pendingItems.map(item => {
        const known = pantryItems.find(
          p => p.product_name.trim().toUpperCase() === item.nome.trim().toUpperCase()
        )
        return {
          nome: item.nome,
          marca: known?.brand || null,
          quantidade: item.quantidade,
          preco_unit: item.valor_unitario,
        }
      })
      const total = pendingItems.reduce((s, i) => s + Number(i.valor_total), 0)
      const { data: trip } = await supabase.from('shopping_trips').insert({
        user_id: user.id,
        supermarket: marketName.trim() || null,
        total,
        items: snapshot,
        purchased_at: emissionDate || null,
      }).select().single()

      // Preços ficam vinculados à compra — apagar a compra apaga esses preços em cascata
      if (supermarket) {
        await recordPrices(pendingItems, supermarket.id, trip?.id || null)
        await fetchPriceIndex()
      }

      setCount(pendingItems.length)

      // Se houver produtos novos (todos sem código de barras), pergunta se quer
      // cadastrar os códigos agora ou depois. Senão, fecha normalmente.
      if (created && created.length > 0) {
        // Anexa o valor unitário da nota a cada item novo (para exibir no scanner)
        const enriched = created.map(c => {
          const p = pendingItems.find(pi => pi.nome.trim().toUpperCase() === (c.nfce_name || c.product_name))
          return { ...c, _unitPrice: p?.valor_unitario ?? null }
        })
        setNewItems(enriched)
        setStatus('askbarcodes')
      } else {
        setStatus('success')
        setTimeout(onClose, 2200)
      }
    } catch {
      setStatus('error')
      setMessage('Não foi possível importar os itens. Tente novamente.')
    }
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: 'absolute', inset: 0, zIndex: 50,
        background: 'rgba(10,15,10,0.85)',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'flex-end',
        padding: 16,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: 'var(--surface)', borderRadius: 'var(--radius-lg)',
          width: '100%', maxWidth: 420, maxHeight: '85vh',
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 0', flexShrink: 0 }}>
          <div style={{ width: 36, height: 4, background: 'var(--border)', borderRadius: 99 }} />
        </div>

        <div style={{ padding: '12px 20px 6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
          <span style={{ fontWeight: 700, fontSize: 16, color: 'var(--text)' }}>Escanear NFC-e</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 22, color: 'var(--text-muted)', lineHeight: 1 }}>×</button>
        </div>

        <div style={{ overflowY: 'auto', flex: 1 }}>

        {status === 'scanning' && (
          <>
            {cameraError ? (
              <div style={{ padding: '20px', textAlign: 'center' }}>
                <div style={{ fontSize: 36, marginBottom: 10 }}>📷</div>
                <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16, lineHeight: 1.5 }}>
                  Câmera não disponível neste dispositivo ou permissão negada.
                </p>
              </div>
            ) : (
              <div id="qr-reader" style={{ width: '100%' }} />
            )}

            <div style={{ padding: '12px 20px 24px', textAlign: 'center' }}>
              {!cameraError && (
                <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 10 }}>
                  Aponte para o QR Code da nota fiscal do ES
                </p>
              )}

              {/* Ler por foto — mais confiável para o QR denso da NFC-e */}
              <button
                onClick={() => fileInputRef.current?.click()}
                style={{
                  background: 'var(--blue-700)', color: '#fff',
                  border: 'none', borderRadius: 20,
                  padding: '10px 22px', fontSize: 13, fontWeight: 700,
                  fontFamily: 'inherit', cursor: 'pointer', marginBottom: 10,
                }}
              >
                📷 Tirar foto do QR
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                style={{ display: 'none' }}
                onChange={handleFile}
              />

              <div>
                <button
                  onClick={handleMock}
                  style={{
                    background: 'var(--blue-50)', color: 'var(--blue-700)',
                    border: '1px solid var(--blue-100)', borderRadius: 20,
                    padding: '9px 20px', fontSize: 13, fontWeight: 600,
                    fontFamily: 'inherit', cursor: 'pointer',
                  }}
                >
                  🧪 Testar com nota fictícia
                </button>
              </div>
            </div>

            {/* Alvo oculto para decodificar o QR a partir da foto */}
            <div id="qr-file-reader" style={{ display: 'none' }} />

            <div style={{ padding: '0 20px 20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '4px 0 12px' }}>
                <span style={{ flex: 1, height: 1, background: 'var(--border)' }} />
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>ou cole o link da nota</span>
                <span style={{ flex: 1, height: 1, background: 'var(--border)' }} />
              </div>
              <form onSubmit={handleManualSubmit} style={{ display: 'flex', gap: 8 }}>
                <input
                  value={manualUrl}
                  onChange={e => setManualUrl(e.target.value)}
                  placeholder="Link da NFC-e (o mesmo do QR Code)"
                  style={{
                    flex: 1, border: '1.5px solid var(--border)', borderRadius: 'var(--radius-sm)',
                    padding: '10px 12px', fontSize: 14, fontFamily: 'inherit',
                    color: 'var(--text)', background: 'var(--bg)', outline: 'none',
                  }}
                  onFocus={e => e.target.style.borderColor = 'var(--blue-500)'}
                  onBlur={e => e.target.style.borderColor = 'var(--border)'}
                />
                <button
                  type="submit"
                  disabled={!manualUrl.trim()}
                  style={{
                    padding: '10px 16px', border: 'none', borderRadius: 'var(--radius-sm)',
                    background: manualUrl.trim() ? 'var(--blue-700)' : 'var(--border)',
                    color: '#fff', fontFamily: 'inherit', fontSize: 13, fontWeight: 700,
                    cursor: manualUrl.trim() ? 'pointer' : 'default',
                  }}
                >
                  Importar
                </button>
              </form>
            </div>
          </>
        )}

        {status === 'confirm' && (
          <div style={{ padding: '16px 20px 24px', display: 'flex', flexDirection: 'column', gap: 12 }}>
            <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
              {pendingItems.length} {pendingItems.length === 1 ? 'item lido' : 'itens lidos'}.
              {marketName ? ' Confirme o supermercado:' : ' De qual supermercado é essa nota?'}
            </p>

            <input
              autoFocus
              value={marketName}
              onChange={e => setMarketName(e.target.value)}
              placeholder="Nome do supermercado"
              style={{
                border: '1.5px solid var(--border)', borderRadius: 'var(--radius-sm)',
                padding: '11px 14px', fontSize: 14, fontFamily: 'inherit',
                color: 'var(--text)', background: 'var(--bg)', outline: 'none', width: '100%',
              }}
              onFocus={e => e.target.style.borderColor = 'var(--blue-500)'}
              onBlur={e => e.target.style.borderColor = 'var(--border)'}
            />

            {supermarkets.length > 0 && (
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {supermarkets.map(s => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setMarketName(s.name)}
                    style={{
                      padding: '6px 14px', borderRadius: 20, fontSize: 13, fontWeight: 500,
                      fontFamily: 'inherit', cursor: 'pointer', border: '1.5px solid',
                      borderColor: marketName === s.name ? s.color : 'var(--border)',
                      background: marketName === s.name ? s.color : 'none',
                      color: marketName === s.name ? '#fff' : 'var(--text-2)',
                    }}
                  >
                    {s.name}
                  </button>
                ))}
              </div>
            )}

            <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
              <button
                onClick={() => { setMarketName(''); handleConfirmImport() }}
                style={{
                  flex: 1, padding: '12px', border: '1.5px solid var(--border)',
                  borderRadius: 'var(--radius-sm)', background: 'none', cursor: 'pointer',
                  fontFamily: 'inherit', fontSize: 13, fontWeight: 600, color: 'var(--text-2)',
                }}
              >
                Importar sem preço
              </button>
              <button
                onClick={handleConfirmImport}
                disabled={!marketName.trim()}
                style={{
                  flex: 2, padding: '12px', border: 'none',
                  borderRadius: 'var(--radius-sm)',
                  background: marketName.trim() ? 'var(--blue-700)' : 'var(--border)',
                  cursor: marketName.trim() ? 'pointer' : 'default',
                  fontFamily: 'inherit', fontSize: 14, fontWeight: 700, color: '#fff',
                }}
              >
                Importar
              </button>
            </div>
          </div>
        )}

        {status === 'askbarcodes' && (
          <div style={{ padding: '24px 24px 32px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
            <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'var(--blue-50)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="var(--blue-700)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <div style={{ textAlign: 'center' }}>
              <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)', marginBottom: 6 }}>
                {count} itens salvos na despensa!
              </p>
              <p style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.5 }}>
                {newItems.length} {newItems.length === 1 ? 'produto novo está' : 'produtos novos estão'} sem código de barras.
                Quer cadastrar {newItems.length === 1 ? 'o código' : 'os códigos'} agora?
              </p>
            </div>
            <div style={{ display: 'flex', gap: 10, width: '100%', marginTop: 4 }}>
              <button
                onClick={onClose}
                style={{
                  flex: 1, padding: '12px', border: '1.5px solid var(--border)',
                  borderRadius: 'var(--radius-sm)', background: 'none', cursor: 'pointer',
                  fontFamily: 'inherit', fontSize: 13, fontWeight: 600, color: 'var(--text-2)',
                }}
              >
                Depois
              </button>
              <button
                onClick={() => { onScanBarcodes?.(newItems); onClose() }}
                style={{
                  flex: 2, padding: '12px', border: 'none', borderRadius: 'var(--radius-sm)',
                  background: 'var(--blue-700)', cursor: 'pointer',
                  fontFamily: 'inherit', fontSize: 14, fontWeight: 700, color: '#fff',
                }}
              >
                📷 Escanear agora
              </button>
            </div>
          </div>
        )}

        {(status === 'loading' || status === 'success' || status === 'error') && (
          <div style={{ padding: '32px 24px 40px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
            {status === 'loading' && (
              <div style={{ width: 48, height: 48, borderRadius: '50%', border: '3px solid var(--border)', borderTopColor: 'var(--blue-700)', animation: 'spin 0.8s linear infinite' }} />
            )}
            {status === 'success' && (
              <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'var(--blue-50)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="var(--blue-700)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
            )}
            {status === 'error' && (
              <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'var(--rose-50)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26 }}>!</div>
            )}
            <div style={{ textAlign: 'center' }}>
              <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)', marginBottom: 4 }}>
                {status === 'loading' && (message || 'Importando itens...')}
                {status === 'success' && `${count} itens salvos na despensa!`}
                {status === 'error' && 'Erro ao ler nota'}
              </p>
              {status === 'error' && <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>{message}</p>}
            </div>
            {status === 'error' && (
              <button onClick={onClose} style={{ color: 'var(--blue-700)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 600, fontFamily: 'inherit' }}>
                Fechar
              </button>
            )}
          </div>
        )}
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
