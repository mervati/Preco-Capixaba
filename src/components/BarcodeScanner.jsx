import { useEffect, useRef, useState } from 'react'
import { createWorker, PSM } from 'tesseract.js'
import { fetchProductByBarcode } from '../lib/productLookup'

// Confere o dígito verificador do EAN-13/EAN-8 pra saber se o número lido faz sentido
function isValidEAN13(code) {
  if (!/^\d{13}$/.test(code)) return false
  const digits = code.split('').map(Number)
  const sum = digits.slice(0, 12).reduce((acc, d, i) => acc + d * (i % 2 === 0 ? 1 : 3), 0)
  return (10 - (sum % 10)) % 10 === digits[12]
}

function isValidEAN8(code) {
  if (!/^\d{8}$/.test(code)) return false
  const digits = code.split('').map(Number)
  const sum = digits.slice(0, 7).reduce((acc, d, i) => acc + d * (i % 2 === 0 ? 3 : 1), 0)
  return (10 - (sum % 10)) % 10 === digits[7]
}

function isValidBarcode(code) {
  if (code.length === 8) return isValidEAN8(code)
  if (code.length === 12) return isValidEAN13('0' + code)
  if (code.length === 13) return isValidEAN13(code)
  return false
}

// A foto pode trazer outros números na embalagem (peso, validade) — prioriza
// o trecho que passa na conferência do dígito verificador
function extractBarcode(text) {
  const candidates = [...new Set(text.match(/\d{8,14}/g) || [])]
  const valid = candidates.filter(isValidBarcode)
  if (valid.length) return valid.sort((a, b) => b.length - a.length)[0]
  const plausible = candidates.filter(c => [8, 12, 13].includes(c.length))
  return plausible.sort((a, b) => b.length - a.length)[0] || null
}

export default function BarcodeScanner({ onClose, onResult }) {
  const videoRef = useRef(null)
  const streamRef = useRef(null)
  const workerRef = useRef(null)
  const [status, setStatus] = useState('scanning')
  const [cameraError, setCameraError] = useState(false)
  const [manualCode, setManualCode] = useState('')

  useEffect(() => {
    navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
      .then(stream => {
        streamRef.current = stream
        const video = videoRef.current
        if (!video) return
        video.srcObject = stream
        video.setAttribute('playsinline', 'true')
        video.muted = true
        video.play().catch(() => {})
      })
      .catch(() => setCameraError(true))

    return () => {
      streamRef.current?.getTracks().forEach(t => t.stop())
      workerRef.current?.terminate()
    }
  }, [])

  async function getWorker() {
    if (workerRef.current) return workerRef.current
    const worker = await createWorker('eng')
    await worker.setParameters({
      tessedit_char_whitelist: '0123456789',
      tessedit_pageseg_mode: PSM.SPARSE_TEXT,
    })
    workerRef.current = worker
    return worker
  }

  async function handleCapture() {
    const video = videoRef.current
    if (!video || video.videoWidth === 0) return

    setStatus('loading')

    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    canvas.getContext('2d').drawImage(video, 0, 0)

    try {
      const worker = await getWorker()
      const { data } = await worker.recognize(canvas)
      const code = extractBarcode(data.text)
      if (code) {
        await processCode(code)
      } else {
        setStatus('notfound')
      }
    } catch {
      setStatus('notfound')
    }
  }

  async function processCode(code) {
    setStatus('loading')
    const info = await fetchProductByBarcode(code)
    if (info?.name) {
      onResult(info)
      onClose()
    } else {
      setStatus('notfound')
    }
  }

  function handleManualSubmit(e) {
    e.preventDefault()
    if (!manualCode.trim()) return
    processCode(manualCode.trim())
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: 'absolute', inset: 0, zIndex: 60,
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
        <div style={{ padding: '12px 20px 6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontWeight: 700, fontSize: 16, color: 'var(--text)' }}>Escanear código de barras</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 22, color: 'var(--text-muted)', lineHeight: 1 }}>×</button>
        </div>

        {(status === 'scanning' || status === 'loading') && (
          <>
            {cameraError ? (
              <div style={{ padding: '20px', textAlign: 'center' }}>
                <div style={{ fontSize: 36, marginBottom: 10 }}>📷</div>
                <p style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.5 }}>
                  Câmera não disponível neste dispositivo ou permissão negada.
                </p>
              </div>
            ) : (
              <>
                <div style={{ width: '100%', height: 220, position: 'relative', overflow: 'hidden', background: '#000' }}>
                  <video ref={videoRef} autoPlay muted playsInline style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  <div style={{
                    position: 'absolute', top: '25%', left: '8%', right: '8%', bottom: '25%',
                    border: '2px solid rgba(255,255,255,0.8)', borderRadius: 8,
                  }} />
                  {status === 'loading' && (
                    <div style={{
                      position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <div style={{ width: 40, height: 40, borderRadius: '50%', border: '3px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', animation: 'spin 0.8s linear infinite' }} />
                    </div>
                  )}
                </div>
                <p style={{ fontSize: 13, color: 'var(--text-muted)', textAlign: 'center', padding: '10px 20px 4px' }}>
                  Centralize os números abaixo do código de barras
                </p>
                <div style={{ padding: '4px 20px 14px' }}>
                  <button
                    onClick={handleCapture}
                    disabled={status === 'loading'}
                    style={{
                      width: '100%', padding: '12px', border: 'none', borderRadius: 'var(--radius-sm)',
                      background: 'var(--blue-700)', color: '#fff', fontFamily: 'inherit',
                      fontSize: 14, fontWeight: 700, cursor: status === 'loading' ? 'default' : 'pointer',
                      opacity: status === 'loading' ? 0.6 : 1,
                    }}
                  >
                    📸 Capturar
                  </button>
                </div>
              </>
            )}

            <div style={{ padding: '0 20px 20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '4px 0 12px' }}>
                <span style={{ flex: 1, height: 1, background: 'var(--border)' }} />
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>ou digite o código</span>
                <span style={{ flex: 1, height: 1, background: 'var(--border)' }} />
              </div>
              <form onSubmit={handleManualSubmit} style={{ display: 'flex', gap: 8 }}>
                <input
                  value={manualCode}
                  onChange={e => setManualCode(e.target.value.replace(/\D/g, ''))}
                  inputMode="numeric"
                  placeholder="Números do código de barras"
                  style={{
                    flex: 1, border: '1.5px solid var(--border)', borderRadius: 'var(--radius-sm)',
                    padding: '10px 12px', fontSize: 14, fontFamily: 'inherit',
                    color: 'var(--text)', background: 'var(--bg)', outline: 'none',
                  }}
                />
                <button
                  type="submit"
                  disabled={!manualCode.trim()}
                  style={{
                    padding: '10px 16px', border: 'none', borderRadius: 'var(--radius-sm)',
                    background: manualCode.trim() ? 'var(--blue-700)' : 'var(--border)',
                    color: '#fff', fontFamily: 'inherit', fontSize: 13, fontWeight: 700,
                    cursor: manualCode.trim() ? 'pointer' : 'default',
                  }}
                >
                  Buscar
                </button>
              </form>
            </div>
          </>
        )}

        {status === 'notfound' && (
          <div style={{ padding: '32px 24px 40px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
            <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'var(--rose-50)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26 }}>?</div>
            <div style={{ textAlign: 'center' }}>
              <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)', marginBottom: 4 }}>Não conseguimos identificar</p>
              <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Tente capturar de novo com mais luz, ou digite os números.</p>
            </div>
            <button onClick={() => setStatus('scanning')} style={{ color: 'var(--blue-700)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 600, fontFamily: 'inherit' }}>
              Tentar de novo
            </button>
          </div>
        )}
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
