// Remove peso/volume do nome antes de buscar ("ARROZ 5KG" → "ARROZ")
function cleanName(name) {
  return name
    .toLowerCase()
    .replace(/\b\d+\s*(kg|g|ml|l|lt|un|pct|cx|unid)\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim()
}

// Extrai peso/volume de um texto ("... 450ML ..." → { quantity: 450, unit: 'ML' })
function parseSize(text) {
  if (!text) return null
  const match = text.match(/(\d+(?:[.,]\d+)?)\s*(kg|ml|g|l)\b/i)
  if (!match) return null
  return {
    quantity: parseFloat(match[1].replace(',', '.')),
    unit: match[2].toUpperCase(),
  }
}

// A Cosmos costuma trazer a descrição comercial completa como nome
// ("PRODUTO X LEVE 450ML PAGUE 360ML") — corta tudo a partir do tamanho,
// que é normalmente onde o texto promocional começa
export function stripSizeFromName(name) {
  if (!name) return name
  const match = name.match(/(\d+(?:[.,]\d+)?)\s*(kg|ml|g|l)\b/i)
  if (!match) return name.trim()
  return name.slice(0, match.index).trim().replace(/[-–,]+$/, '').trim()
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
  // Cosmos tem cobertura bem melhor de produtos brasileiros — tenta primeiro
  try {
    const res = await fetch(`/api/cosmos?code=${encodeURIComponent(barcode)}`, { signal: AbortSignal.timeout(6000) })
    if (res.ok) {
      const info = await res.json()
      if (info.name) return { ...info, ...parseSize(info.name) }
    }
  } catch {
    // segue pra Open Food Facts
  }

  for (const domain of BARCODE_DATABASES) {
    try {
      const res = await fetch(
        `https://${domain}/api/v2/product/${encodeURIComponent(barcode)}.json?fields=product_name,brands,quantity`,
        { signal: AbortSignal.timeout(6000) }
      )
      if (!res.ok) continue
      const data = await res.json()
      if (data.status !== 1 || !data.product) continue
      return {
        name: data.product.product_name || null,
        brand: data.product.brands ? data.product.brands.split(',')[0].trim() : null,
        ...parseSize(data.product.quantity || data.product.product_name),
      }
    } catch {
      continue
    }
  }
  return null
}
