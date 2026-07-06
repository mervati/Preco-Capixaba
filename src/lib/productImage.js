// Remove peso/volume do nome antes de buscar ("ARROZ 5KG" → "ARROZ")
function cleanName(name) {
  return name
    .toLowerCase()
    .replace(/\b\d+\s*(kg|g|ml|l|lt|un|pct|cx|unid)\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim()
}

export async function fetchProductImage(productName) {
  try {
    const q = encodeURIComponent(cleanName(productName))
    const res = await fetch(
      `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${q}&search_simple=1&action=process&json=1&fields=image_front_small_url&page_size=1`,
      { signal: AbortSignal.timeout(6000) }
    )
    if (!res.ok) return null
    const data = await res.json()
    return data.products?.[0]?.image_front_small_url || null
  } catch {
    return null
  }
}
