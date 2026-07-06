import { useEffect, useRef, useState } from 'react'
import { Html5Qrcode } from 'html5-qrcode'
import { usePantry } from '../contexts/PantryContext'
import { MOCK_ITEMS, isMockUrl } from '../lib/mockNFCe'

export default function QRScanner({ onClose }) {
  const { addItemsBatchToPantry } = usePantry()
  const scannerRef = useRef(null)
  const startedRef = useRef(false)
  const [status, setStatus] = useState('scanning')
  const [cameraError, setCameraError] = useState(false)
  const [message, setMessage] = useState('')
  const [count, setCount] = useState(0)

  useEffect(() => {
    const scanner = new Html5Qrcode('qr-reader')
    scannerRef.current = scanner

    scanner.start(
      { facingMode: 'environment' },
      { fps: 10, qrbox: { width: 240, height: 240 } },
      (decoded) => handleScan(decoded),
      () => {}
    ).then(() => {
      startedRef.current = true
    }).catch(() => {
      // Câmera negada ou indisponível — mostra só o botão de teste
      setCameraError(true)
    })

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

  async function handleMock() {
    if (status !== 'scanning') return
    setStatus('loading')
    setMessage('Simulando leitura de nota...')
    await stopScanner()
    processUrl('https://nfce.sefaz.es.gov.br/MOCK')
  }

  async function processUrl(url) {
    try {
      let items
      if (isMockUrl(url)) {
        await new Promise(r => setTimeout(r, 1400))
        items = MOCK_ITEMS.map(i => ({
          nome: i.nome,
          quantidade: i.quantidade,
          valor_unitario: i.valorUnitario,
          valor_total: i.valorTotal,
        }))
      } else {
        const res = await fetch(`/api/sefaz?url=${encodeURIComponent(url)}`)
        if (!res.ok) throw new Error()
        const data = await res.json()
        items = data.items
      }
      await addItemsBatchToPantry(items)
      setCount(items.length)
      setStatus('success')
      setTimeout(onClose, 2200)
    } catch {
      setStatus('error')
      setMessage('Não foi possível ler a nota. Tente novamente.')
    }
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 50,
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
          width: '100%', maxWidth: 420, overflow: 'hidden',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 0' }}>
          <div style={{ width: 36, height: 4, background: 'var(--border)', borderRadius: 99 }} />
        </div>

        <div style={{ padding: '12px 20px 6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontWeight: 700, fontSize: 16, color: 'var(--text)' }}>Escanear NFC-e</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 22, color: 'var(--text-muted)', lineHeight: 1 }}>×</button>
        </div>

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
          </>
        )}

        {status !== 'scanning' && (
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
                {status === 'loading' && 'Importando itens...'}
                {status === 'success' && `${count} itens salvos na despensa!`}
                {status === 'error' && 'Erro ao ler nota'}
              </p>
              <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>{message}</p>
            </div>
            {status === 'error' && (
              <button onClick={onClose} style={{ color: 'var(--blue-700)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 600, fontFamily: 'inherit' }}>
                Fechar
              </button>
            )}
          </div>
        )}
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
