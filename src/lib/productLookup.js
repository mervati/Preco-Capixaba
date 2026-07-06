// Remove peso/volume do nome antes de buscar ("ARROZ 5KG" → "ARROZ")
function cleanName(name) {
  return name
    .toLowerCase()
    .replace(/\b\d+\s*(kg|g|ml|l|lt|un|pct|cx|unid)\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim()
}

export async function fetchProductInfo(productName) {
  try {
    const q = encodeURIComponent(cleanName(productName))
    const res = await fetch(
      `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${q}&search_simple=1&action=process&json=1&fields=brands&page_size=1`,
      { signal: AbortSignal.timeout(6000) }
    )
    if (!res.ok) return null
    const data = await res.json()
    const product = data.products?.[0]
    if (!product) return null
    return { brand: product.brands ? product.brands.split(',')[0].trim() : null }
  } catch {
    return null
  }
}

// A Open Food Facts é dividida por tipo de produto em bases separadas —
// comida, produtos em geral (limpeza etc.), cosméticos e ração de pet.
// Tenta cada uma até achar.
const BARCODE_DATABASES = [
  'world.openfoodfacts.org',
  'world.openproductsfacts.org',
  'world.openbeautyfacts.org',
  'world.openpetfoodfacts.org',
]

export async function fetchProductByBarcode(barcode) {
  for (const domain of BARCODE_DATABASES) {
    try {
      const res = await fetch(
        `https://${domain}/api/v2/product/${encodeURIComponent(barcode)}.json?fields=product_name,brands`,
        { signal: AbortSignal.timeout(6000) }
      )
      if (!res.ok) continue
      const data = await res.json()
      if (data.status !== 1 || !data.product) continue
      return {
        name: data.product.product_name || null,
        brand: data.product.brands ? data.product.brands.split(',')[0].trim() : null,
      }
    } catch {
      continue
    }
  }
  return null
}
