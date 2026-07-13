import { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './AuthContext'

const ProductImageContext = createContext()
const BUCKET = 'product-images'

// Memória de foto por nome de produto — funciona igual nfce_products/barcode_products:
// casa pelo nome, então a mesma foto aparece na Despensa, na Lista e no Radar de Preços.
export function ProductImageProvider({ children }) {
  const { user } = useAuth()
  const [images, setImages] = useState({})

  useEffect(() => {
    if (user) fetchImages()
  }, [user])

  async function fetchImages() {
    const { data } = await supabase
      .from('product_images')
      .select('product_name, image_url')
    if (data) {
      const map = {}
      for (const row of data) map[row.product_name] = row.image_url
      setImages(map)
    }
  }

  function getImage(productName) {
    if (!productName) return null
    return images[productName.trim().toUpperCase()] || null
  }

  async function setProductImage(productName, file) {
    const name = productName.trim().toUpperCase()
    const ext = (file.name.split('.').pop() || 'jpg').toLowerCase()
    const path = `${user.id}/${crypto.randomUUID()}.${ext}`

    const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, file, {
      cacheControl: '31536000',
    })
    if (upErr) throw upErr

    const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(path)
    const url = pub.publicUrl

    const { error: dbErr } = await supabase.from('product_images').upsert(
      { user_id: user.id, product_name: name, image_url: url },
      { onConflict: 'user_id,product_name' }
    )
    if (dbErr) throw dbErr

    setImages(prev => ({ ...prev, [name]: url }))
    return url
  }

  return (
    <ProductImageContext.Provider value={{ getImage, setProductImage }}>
      {children}
    </ProductImageContext.Provider>
  )
}

export function useProductImages() {
  return useContext(ProductImageContext)
}
