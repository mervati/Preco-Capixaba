import { useEffect, useRef, useState } from 'react'
import { fetchProductByBarcode } from '../lib/productLookup'

// BarcodeDetector é a API nativa do navegador (usa Vision no iOS, ML Kit no Android)
// — mesma tecnologia que apps nativos da App Store. Disponível no Safari iOS 17+.
const HAS_NATIVE = typeof BarcodeDetector !== 'undefined'

// Nativo é preciso — aceita na primeira leitura. Quagga2/ZXing têm falsos positivos,
// então exigem confirmação dupla antes de processar.
const CONFIRMATIONS_NEEDED = HAS_NATIVE ? 1 : 2

const NATIVE_FORMATS = ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'code_39', 'code_93']
const QUAGGA_READERS  = ['ean_reader', 'ean_8_reader', 'upc_reader', 'upc_e_reader', 'code_128_reader', 'code_39_reader']

function isIOS() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
}

export default function BarcodeScanner({ onClose, onResult, lookupLocal, captureOnly = false, subtitle, progress, initialName, initialBrand, quantity, unit, unitPrice }) {
  const videoRef   = useRef(null)
  const streamRef  = useRef(null)
  const controlsRef = useRef(null)
  const quaggaModRef = useRef(null)
  const startedRef = useRef(false)
  const tallyRef   = useRef({})
  const processingRef = useRef(false)

  const [status, setStatus]       = useState('scanning')
  const [cameraError, setCameraError] = useState(false)
  const [manualCode, setManualCode]   = useState('')

  // Edição de nome/marca durante a captura (fluxo de ligar código a item existente).
  // Só aparece quando initialName é passado. Refs mantêm o valor atual acessível
  // dentro do loop da câmera (que captura o closure inicial).
  const editable = captureOnly && initialName !== undefined
  const [editName, setEditName]   = useState(initialName || '')
  const [editBrand, setEditBrand] = useState(initialBrand || '')
  const [capturedCode, setCapturedCode] = useState('')
  const nameRef  = useRef(editName)
  const brandRef = useRef(editBrand)
  nameRef.current  = editName
  brandRef.current = editBrand

  useEffect(() => {
    let cancelled = false

    function handleCode(code) {
      if (cancelled || processingRef.current || !code) return
      tallyRef.current[code] = (tallyRef.current[code] || 0) + 1
      if (tallyRef.current[code] >= CONFIRMATIONS_NEEDED) {
        processingRef.current = true
        processCode(code)
      }
    }

    async function startNative() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment', width: { ideal: 640 }, height: { ideal: 480 } },
        })
        if (cancelled) { stream.getTracks().forEach(t => t.stop()); return }
        streamRef.current = stream
        const video = videoRef.current
        video.srcObject = stream
        await video.play()

        const detector = new BarcodeDetector({ formats: NATIVE_FORMATS })

        // Loop contínuo sem RAF — dispara próxima detecção imediatamente
        // após a anterior terminar, sem esperar o próximo frame do display
        async function loop() {
          while (!cancelled && !processingRef.current) {
            try {
              const barcodes = await detector.detect(video)
              if (barcodes.length > 0 && !cancelled && !processingRef.current) {
                handleCode(barcodes[0].rawValue)
                return
              }
            } catch { /* ignora frames inválidos */ }
          }
        }
        loop()
      } catch {
        if (!cancelled) setCameraError(true)
      }
    }

    async function startQuagga() {
      const { default: Quagga } = await import('@ericblade/quagga2')
      if (cancelled) return
      quaggaModRef.current = Quagga
      Quagga.init({
        inputStream: {
          type: 'LiveStream',
          target: videoRef.current,
          constraints: { facingMode: 'environment' },
        },
        locator: { patchSize: 'medium', halfSample: true },
        numOfWorkers: 0,
        locate: true,
        decoder: { readers: QUAGGA_READERS },
      }, err => {
        if (cancelled) return
        if (err) { setCameraError(true); return }
        Quagga.start()
        startedRef.current = true
        Quagga.onDetected(r => handleCode(r.codeResult.code))
      })
    }

    async function startZXing() {
      const { BrowserMultiFormatOneDReader } = await import('@zxing/browser')
      if (cancelled) return
      const reader = new BrowserMultiFormatOneDReader()
      reader.decodeFromConstraints(
        { video: { facingMode: 'environment' } },
        videoRef.current,
        (result, _err, controls) => {
          controlsRef.current = controls
          if (result) handleCode(result.getText())
        }
      ).catch(() => { if (!cancelled) setCameraError(true) })
    }

    if (HAS_NATIVE)      startNative()
    else if (!isIOS())   startQuagga()
    else                 startZXing()

    return () => {
      cancelled = true
      streamRef.current?.getTracks().forEach(t => t.stop())
      if (quaggaModRef.current && startedRef.current) {
        quaggaModRef.current.stop()
        startedRef.current = false
      }
      controlsRef.current?.stop()
    }
  }, [])

  function stopCamera() {
    streamRef.current?.getTracks().forEach(t => t.stop())
    if (quaggaModRef.current && startedRef.current) {
      quaggaModRef.current.stop()
      startedRef.current = false
    }
    controlsRef.current?.stop()
  }

  async function processCode(code) {
    stopCamera()
    setStatus('loading')
    // Modo "só capturar": já sabemos o produto (item existente), só queremos o número.
    if (captureOnly) {
      if (editable) {
        // Escaneia primeiro, edita depois: para a câmera e mostra a tela de confirmação
        setCapturedCode(code)
        setStatus('editconfirm')
      } else {
        onResult({ barcode: code })
      }
      return
    }
    const localInfo = lookupLocal ? await lookupLocal(code) : null
    const info = localInfo || await fetchProductByBarcode(code)
    if (info?.name) {
      onResult({ ...info, barcode: code })
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

  // Quagga usa uma div com canvas interno; os outros usam <video> direto
  const useQuaggaViewport = !HAS_NATIVE && !isIOS()

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
          width: '100%', maxWidth: 420, maxHeight: '85vh',
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
        }}
      >
        <div style={{ padding: '12px 20px 6px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexShrink: 0 }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--text)' }}>Escanear código de barras</div>
            {progress && (
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', marginTop: 3, textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                {progress}
              </div>
            )}
            {subtitle && (
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--blue-700)', marginTop: 1, textTransform: 'capitalize' }}>
                {subtitle}
              </div>
            )}
            {(quantity != null || unitPrice != null) && (
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                {quantity != null && `${quantity} ${(unit || 'UN').toLowerCase()}`}
                {quantity != null && unitPrice != null && ' · '}
                {unitPrice != null && `R$ ${Number(unitPrice).toFixed(2).replace('.', ',')}/un`}
              </div>
            )}
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 22, color: 'var(--text-muted)', lineHeight: 1, flexShrink: 0, marginLeft: 8 }}>×</button>
        </div>

        <div style={{ overflowY: 'auto', flex: 1 }}>
          {(status === 'scanning' || status === 'loading') && (
            <>
              {cameraError ? (
                <div style={{ padding: '20px', textAlign: 'center' }}>
                  <div style={{ fontSize: 36, marginBottom: 10 }}>📷</div>
                  <p style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.5 }}>
                    Câmera não disponível ou permissão negada.
                  </p>
                </div>
              ) : (
                <>
                  <div style={{ width: '100%', height: 220, position: 'relative', overflow: 'hidden', background: '#000' }}>
                    {useQuaggaViewport ? (
                      <div ref={videoRef} className="barcode-viewport" style={{ width: '100%', height: '100%', position: 'relative' }} />
                    ) : (
                      <video ref={videoRef} muted playsInline style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    )}
                    {/* Mira */}
                    <div style={{
                      position: 'absolute', top: '20%', left: '8%', right: '8%', bottom: '20%',
                      border: '2px solid rgba(255,255,255,0.8)', borderRadius: 8,
                      boxShadow: '0 0 0 9999px rgba(0,0,0,0.4)',
                    }} />
                    <div style={{
                      position: 'absolute', top: '20%', left: '8%', right: '8%',
                      textAlign: 'center', paddingTop: 6,
                    }}>
                      <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)', letterSpacing: '0.5px' }}>
                        {HAS_NATIVE ? 'Detecção nativa ativa' : 'Aponte para o código'}
                      </span>
                    </div>
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

          {status === 'editconfirm' && (
            <div style={{ padding: '16px 20px 24px', display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 8,
                background: 'var(--blue-50)', border: '1px solid var(--blue-100)',
                borderRadius: 'var(--radius-sm)', padding: '10px 12px',
              }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--blue-700)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                <span style={{ fontSize: 13, color: 'var(--text-2)' }}>Código capturado — confira o produto:</span>
              </div>

              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.4px', display: 'block', marginBottom: 4 }}>Nome do produto</label>
                <input
                  autoFocus
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  placeholder="Nome do produto"
                  style={{ width: '100%', border: '1.5px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '10px 12px', fontSize: 14, fontFamily: 'inherit', color: 'var(--text)', background: 'var(--bg)', outline: 'none' }}
                  onFocus={e => e.target.style.borderColor = 'var(--blue-500)'}
                  onBlur={e => e.target.style.borderColor = 'var(--border)'}
                />
              </div>

              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.4px', display: 'block', marginBottom: 4 }}>Marca</label>
                <input
                  value={editBrand}
                  onChange={e => setEditBrand(e.target.value)}
                  placeholder="Marca (opcional)"
                  style={{ width: '100%', border: '1.5px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '10px 12px', fontSize: 14, fontFamily: 'inherit', color: 'var(--text)', background: 'var(--bg)', outline: 'none' }}
                  onFocus={e => e.target.style.borderColor = 'var(--blue-500)'}
                  onBlur={e => e.target.style.borderColor = 'var(--border)'}
                />
              </div>

              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.4px', display: 'block', marginBottom: 4 }}>Código de barras</label>
                <input
                  value={capturedCode}
                  onChange={e => setCapturedCode(e.target.value.replace(/\D/g, ''))}
                  inputMode="numeric"
                  placeholder="Números do código de barras"
                  style={{ width: '100%', border: '1.5px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '10px 12px', fontSize: 14, fontFamily: 'inherit', color: 'var(--text)', background: 'var(--bg)', outline: 'none' }}
                  onFocus={e => e.target.style.borderColor = 'var(--blue-500)'}
                  onBlur={e => e.target.style.borderColor = 'var(--border)'}
                />
              </div>

              <button
                onClick={() => onResult({ barcode: capturedCode, product_name: nameRef.current, brand: brandRef.current })}
                disabled={!capturedCode.trim()}
                style={{
                  marginTop: 4, padding: '12px', border: 'none', borderRadius: 'var(--radius-sm)',
                  background: capturedCode.trim() ? 'var(--blue-700)' : 'var(--border)',
                  color: '#fff', fontFamily: 'inherit', fontSize: 14, fontWeight: 700,
                  cursor: capturedCode.trim() ? 'pointer' : 'default',
                }}
              >
                Salvar e próximo →
              </button>
            </div>
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
