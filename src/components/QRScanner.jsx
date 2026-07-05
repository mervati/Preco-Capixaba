import { useEffect, useRef, useState } from 'react'
import { Html5Qrcode } from 'html5-qrcode'
import { useList } from '../contexts/ListContext'
import { MOCK_ITEMS, isMockUrl } from '../lib/mockNFCe'

export default function QRScanner({ onClose }) {
  const { addItemsBatch } = useList()
  const scannerRef = useRef(null)
  const [status, setStatus] = useState('scanning') // scanning | loading | success | error
  const [message, setMessage] = useState('')

  useEffect(() => {
    const scanner = new Html5Qrcode('qr-reader')
    scannerRef.current = scanner

    scanner.start(
      { facingMode: 'environment' },
      { fps: 10, qrbox: { width: 250, height: 250 } },
      (decodedText) => handleScan(decodedText),
      () => {}
    )

    return () => {
      scanner.isScanning && scanner.stop().catch(() => {})
    }
  }, [])

  async function handleScan(url) {
    if (status !== 'scanning') return
    setStatus('loading')
    setMessage('Lendo nota fiscal...')

    await scannerRef.current.stop().catch(() => {})

    try {
      let items

      if (isMockUrl(url)) {
        // Modo teste: usa dados mock
        await new Promise((r) => setTimeout(r, 1200))
        items = MOCK_ITEMS.map((i) => ({
          nome: i.nome,
          quantidade: i.quantidade,
          valor_unitario: i.valorUnitario,
          valor_total: i.valorTotal,
        }))
      } else {
        // Modo real: chama a função serverless
        const res = await fetch(`/api/sefaz?url=${encodeURIComponent(url)}`)
        if (!res.ok) throw new Error('Erro ao consultar SEFAZ')
        const data = await res.json()
        items = data.items
      }

      await addItemsBatch(items)
      setStatus('success')
      setMessage(`${items.length} itens importados da nota!`)
      setTimeout(onClose, 2000)
    } catch (err) {
      setStatus('error')
      setMessage('Não foi possível ler a nota. Tente novamente.')
    }
  }

  async function handleMockTest() {
    if (status !== 'scanning') return
    setStatus('loading')
    setMessage('Simulando leitura de nota...')
    await scannerRef.current.stop().catch(() => {})
    await handleScan('https://nfce.sefaz.es.gov.br/MOCK')
  }

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex flex-col items-center justify-center p-4">
      <div className="bg-white rounded-2xl overflow-hidden w-full max-w-sm">
        <div className="bg-green-600 px-4 py-3 flex justify-between items-center">
          <span className="text-white font-semibold">Escanear NFC-e</span>
          <button onClick={onClose} className="text-white/80 hover:text-white text-xl leading-none">&times;</button>
        </div>

        {status === 'scanning' && (
          <>
            <div id="qr-reader" className="w-full" />
            <div className="p-4 text-center">
              <p className="text-xs text-gray-500 mb-3">Aponte para o QR Code da nota fiscal do ES</p>
              <button
                onClick={handleMockTest}
                className="text-xs text-green-600 underline"
              >
                Testar com nota fictícia
              </button>
            </div>
          </>
        )}

        {(status === 'loading' || status === 'success' || status === 'error') && (
          <div className="p-8 flex flex-col items-center gap-4">
            {status === 'loading' && (
              <div className="w-10 h-10 border-4 border-green-500 border-t-transparent rounded-full animate-spin" />
            )}
            {status === 'success' && (
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center text-green-600 text-2xl">✓</div>
            )}
            {status === 'error' && (
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center text-red-500 text-2xl">!</div>
            )}
            <p className="text-sm text-gray-600 text-center">{message}</p>
            {status === 'error' && (
              <button
                onClick={onClose}
                className="text-sm text-green-600 underline"
              >
                Fechar
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
