import { useRef, useState } from 'react'
import { useProductImages } from '../contexts/ProductImageContext'

// Avatar de produto: mostra a foto salva (memória por nome) ou a inicial como antes.
// Com editable=true, toca pra tirar/escolher foto — a imagem passa a valer em
// Despensa, Lista e Preços, pois todos casam pelo mesmo nome de produto.
export default function ProductAvatar({ productName, size = 44, editable = false, borderRadius = 10 }) {
  const { getImage, setProductImage } = useProductImages()
  const fileRef = useRef(null)
  const [uploading, setUploading] = useState(false)
  const image = getImage(productName)

  async function handleFile(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file || !productName?.trim()) return
    setUploading(true)
    try {
      await setProductImage(productName, file)
    } catch {
      alert('Não consegui salvar a foto. Tente novamente.')
    } finally {
      setUploading(false)
    }
  }

  const box = {
    width: size, height: size, borderRadius, flexShrink: 0,
    background: 'var(--blue-50)', display: 'flex', alignItems: 'center', justifyContent: 'center',
    border: 'none', padding: 0, fontFamily: 'inherit', position: 'relative', overflow: 'hidden',
    cursor: editable ? 'pointer' : 'default',
  }

  const content = uploading ? (
    <div style={{ width: size * 0.4, height: size * 0.4, borderRadius: '50%', border: '2px solid var(--blue-200)', borderTopColor: 'var(--blue-700)', animation: 'spin 0.8s linear infinite' }} />
  ) : image ? (
    <img src={image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
  ) : (
    <span style={{ fontSize: size * 0.4, fontWeight: 700, color: 'var(--blue-700)' }}>
      {productName?.[0]?.toUpperCase() || '?'}
    </span>
  )

  if (!editable) {
    return <div style={box}>{content}</div>
  }

  return (
    <>
      <button type="button" onClick={() => fileRef.current?.click()} style={box} title="Adicionar/alterar foto">
        {content}
        {!uploading && (
          <div style={{
            position: 'absolute', bottom: 0, right: 0, width: '38%', height: '38%',
            background: 'var(--blue-700)', color: '#fff', display: 'flex',
            alignItems: 'center', justifyContent: 'center', borderRadius: '50% 0 0 0',
            fontSize: size * 0.18,
          }}>
            📷
          </div>
        )}
      </button>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        capture="environment"
        style={{ display: 'none' }}
        onChange={handleFile}
      />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </>
  )
}
