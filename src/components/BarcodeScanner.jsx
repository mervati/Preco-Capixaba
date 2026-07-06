import { useEffect, useRef, useState } from 'react'
import Quagga from '@ericblade/quagga2'
import { BrowserMultiFormatOneDReader } from '@zxing/browser'
import { fetchProductByBarcode } from '../lib/productLookup'

const CONFIRMATIONS_NEEDED = 2

// iOS não tem BarcodeDetector nativo e se sai mal com o motor do Quagga2 —
// usa ZXing lá. Android e desktop leem melhor com o Quagga2.
function isIOS() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
}

const QUAGGA_READERS = ['ean_reader', 'ean_8_reader', 'upc_reader', 'upc_e_reader', 'code_128_reader', 'code_39_reader']

export default function BarcodeScanner({ onClose, onResult }) {
  const useQuagga = useRef(!isIOS()).current
  const viewportRef = useRef(null)
  const controlsRef = useRef(null)
  const startedRef = useRef(false)
  const tallyRef = useRef({})
  const processingRef = useRef(false)
  const [status, setStatus] = useState('scanning')
  const [cameraError, setCameraError] = useState(false)
  const [manualCode, setManualCode] = useState('')

  useEffect(() => {
    let cancelled = false

    function handleCode(code) {
      if (cancelled || processingRef.current) return
      tallyRef.current[code] = (tallyRef.current[code] || 0) + 1
      if (tallyRef.current[code] >= CONFIRMATIONS_NEEDED) {
        processingRef.current = true
        processCode(code)
      }
    }

    let quaggaHandler

    if (useQuagga) {
      Quagga.init({
        inputStream: {
          type: 'LiveStream',
          target: viewportRef.current,
          constraints: { facingMode: 'environment' },
        },
        locator: { patchSize: 'medium', halfSample: true },
        numOfWorkers: 0,
        locate: true,
        decoder: { readers: QUAGGA_READERS },
      }, (err) => {
        if (cancelled) return
        if (err) {
          setCameraError(true)
          return
        }
        Quagga.start()
        startedRef.current = true
        quaggaHandler = result => handleCode(result.codeResult.code)
        Quagga.onDetected(quaggaHandler)
      })
    } else {
      const reader = new BrowserMultiFormatOneDReader()
      reader.decodeFromConstraints(
        { video: { facingMode: 'environment' } },
        viewportRef.current,
        (result, _error, controls) => {
          controlsRef.current = controls
          if (result) handleCode(result.getText())
        }
      ).catch(() => setCameraError(true))
    }

    return () => {
      cancelled = true
      if (useQuagga) {
        if (quaggaHandler) Quagga.offDetected(quaggaHandler)
        if (startedRef.current) {
          Quagga.stop()
          startedRef.current = false
        }
      } else {
        controlsRef.current?.stop()
      }
    }
  }, [])

  async function processCode(code) {
    if (useQuagga) {
      if (startedRef.current) {
        Quagga.stop()
        startedRef.current = false
      }
    } else {
      controlsRef.current?.stop()
    }
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
                  {useQuagga ? (
                    <div ref={viewportRef} className="barcode-viewport" style={{ width: '100%', height: '100%', position: 'relative' }} />
                  ) : (
                    <video ref={viewportRef} muted playsInline style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  )}
                  <div style={{
                    position: 'absolute', top: '35%', left: '10%', right: '10%', bottom: '35%',
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
                <p style={{ fontSize: 13, color: 'var(--text-muted)', textAlign: 'center', padding: '10px 20px 14px' }}>
                  Aponte para o código de barras do produto
                </p>
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
              <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)', marginBottom: 4 }}>Produto não encontrado</p>
              <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Preencha o nome manualmente.</p>
            </div>
            <button onClick={onClose} style={{ color: 'var(--blue-700)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 600, fontFamily: 'inherit' }}>
              Fechar
            </button>
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        .barcode-viewport video, .barcode-viewport canvas {
          position: absolute; top: 0; left: 0; width: 100%; height: 100%; object-fit: cover;
        }
      `}</style>
    </div>
  )
}
