// Proxy serverless para buscar itens de NFC-e do SEFAZ-ES
// Evita bloqueio de CORS ao fazer a requisição server-side

export default async function handler(req, res) {
  const { url } = req.query

  if (!url) {
    return res.status(400).json({ error: 'URL da NFC-e não informada' })
  }

  // Só aceita URLs do SEFAZ-ES por segurança
  if (!url.startsWith('https://nfce.sefaz.es.gov.br')) {
    return res.status(403).json({ error: 'URL não permitida' })
  }

  try {
    const response = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; PrecoCapixaba/1.0)' },
    })

    if (!response.ok) {
      return res.status(502).json({ error: 'SEFAZ não respondeu' })
    }

    const html = await response.text()
    const items = parseNFCeHtml(html)

    return res.status(200).json({ items })
  } catch (err) {
    return res.status(500).json({ error: 'Erro ao consultar SEFAZ' })
  }
}

// Parser do HTML da NFC-e do SEFAZ-ES
function parseNFCeHtml(html) {
  const items = []

  // A tabela de produtos na página do SEFAZ-ES tem padrão específico
  // Cada linha de produto tem: descrição, quantidade, unidade, valor unitário, valor total
  const rowRegex = /<tr[^>]*class="[^"]*Item[^"]*"[^>]*>([\s\S]*?)<\/tr>/gi
  const tdRegex = /<td[^>]*>([\s\S]*?)<\/td>/gi

  let rowMatch
  while ((rowMatch = rowRegex.exec(html)) !== null) {
    const rowHtml = rowMatch[1]
    const tds = []
    let tdMatch

    const tempRegex = /<td[^>]*>([\s\S]*?)<\/td>/gi
    while ((tdMatch = tempRegex.exec(rowHtml)) !== null) {
      const text = tdMatch[1].replace(/<[^>]+>/g, '').trim()
      tds.push(text)
    }

    if (tds.length >= 5) {
      const valorUnitario = parseFloat(tds[3].replace(',', '.')) || 0
      const valorTotal = parseFloat(tds[4].replace(',', '.')) || 0
      const quantidade = parseFloat(tds[1].replace(',', '.')) || 1

      items.push({
        nome: tds[0].toUpperCase(),
        quantidade,
        valor_unitario: valorUnitario,
        valor_total: valorTotal,
      })
    }
  }

  // Fallback: tenta padrão alternativo do SEFAZ-ES
  if (items.length === 0) {
    const altRegex = /class="col-xs-8[^"]*"[^>]*>([\s\S]*?)<\/span>/gi
    let alt
    while ((alt = altRegex.exec(html)) !== null) {
      const nome = alt[1].replace(/<[^>]+>/g, '').trim()
      if (nome) items.push({ nome: nome.toUpperCase(), quantidade: 1, valor_unitario: 0, valor_total: 0 })
    }
  }

  return items
}
