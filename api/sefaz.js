// Proxy serverless para buscar itens de NFC-e do SEFAZ-ES
// Evita bloqueio de CORS ao fazer a requisição server-side

export default async function handler(req, res) {
  const { url } = req.query

  if (!url) {
    return res.status(400).json({ error: 'URL da NFC-e não informada' })
  }

  // Só aceita URLs da SEFAZ-ES por segurança — aceita qualquer subdomínio
  // (app., www2., nfce., ...) em http ou https, pois o QR do ES usa app.sefaz.es.gov.br
  let parsed
  try {
    parsed = new URL(url)
  } catch {
    return res.status(400).json({ error: 'URL inválida' })
  }
  const host = parsed.hostname.toLowerCase()
  const allowed = host === 'sefaz.es.gov.br' || host.endsWith('.sefaz.es.gov.br')
  if (!allowed) {
    return res.status(403).json({ error: 'URL não permitida' })
  }

  try {
    const response = await fetch(url, {
      headers: {
        // Alguns servidores da SEFAZ recusam User-Agent não-navegador
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'pt-BR,pt;q=0.9',
      },
    })

    if (!response.ok) {
      return res.status(502).json({ error: 'SEFAZ não respondeu' })
    }

    const html = await response.text()
    const items = parseNFCeHtml(html)
    const emitente = parseEmitente(html)
    const emissionDate = parseEmissionDate(html)

    return res.status(200).json({ items, emitente, emissionDate })
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

// Data de emissão da NFC-e — tenta vários padrões do HTML do SEFAZ-ES
function parseEmissionDate(html) {
  const patterns = [
    /emiss[aã]o[^:]*:?\s*(\d{2}\/\d{2}\/\d{4}\s+\d{2}:\d{2}:\d{2})/i,
    /emiss[aã]o[^:]*:?\s*(\d{2}\/\d{2}\/\d{4})/i,
    /(\d{2}\/\d{2}\/\d{4}\s+\d{2}:\d{2}:\d{2})/,
  ]
  for (const pattern of patterns) {
    const match = pattern.exec(html)
    if (match) {
      const raw = match[1].trim()
      const [datePart, timePart] = raw.split(/\s+/)
      const [day, month, year] = datePart.split('/')
      const iso = `${year}-${month}-${day}T${timePart || '12:00:00'}`
      const d = new Date(iso)
      if (!isNaN(d)) return d.toISOString()
    }
  }
  return null
}

// Best-effort: nome do supermercado emitente. A página do SEFAZ-ES não tem um
// seletor estável documentado, então tenta alguns padrões conhecidos e
// devolve null se nenhum bater — quem chama deve pedir confirmação ao usuário.
function parseEmitente(html) {
  const patterns = [
    /<div[^>]*id="u20"[^>]*>([\s\S]*?)<\/div>/i,
    /<strong>([^<]{3,80})<\/strong>\s*<br\s*\/?>\s*CNPJ/i,
    /<div[^>]*class="[^"]*txtTopo[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
  ]

  for (const regex of patterns) {
    const match = regex.exec(html)
    if (match) {
      const nome = match[1].replace(/<[^>]+>/g, '').trim()
      if (nome && nome.length >= 3) return nome
    }
  }
  return null
}
