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

    // A nota pode ainda não estar disponível no portal (emitida há pouco ou em contingência)
    if (/n[ãa]o encontrada para a chave|nota n[ãa]o encontrada/i.test(html)) {
      return res.status(200).json({ items: [], notFound: true })
    }

    const items = parseNFCeHtml(html)
    const emitente = parseEmitente(html)
    const emissionDate = parseEmissionDate(html)

    const payload = { items, emitente, emissionDate }
    // Se não conseguiu extrair itens, devolve um trecho do HTML pra depurar o parser
    if (items.length === 0) payload._debug = sampleHtml(html)
    return res.status(200).json(payload)
  } catch (err) {
    return res.status(500).json({ error: 'Erro ao consultar SEFAZ' })
  }
}

// Limpa tags/entidades e normaliza espaços
function cleanText(s) {
  return (s || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&#160;|&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/\s+/g, ' ')
    .trim()
}

// Extrai o primeiro número (aceita formato brasileiro 1.234,56) de um texto
function parseNum(s) {
  const t = cleanText(s)
  const m = t.match(/\d{1,3}(?:\.\d{3})*(?:,\d+)?|\d+(?:[.,]\d+)?/)
  if (!m) return 0
  let v = m[0]
  if (v.includes(',')) v = v.replace(/\./g, '').replace(',', '.') // 1.234,56 -> 1234.56
  return parseFloat(v) || 0
}

// Pega o conteúdo do primeiro <span class="X">...</span> encontrado na linha
function pickSpan(row, cls) {
  const re = new RegExp(`class=["'][^"']*\\b${cls}\\b[^"']*["'][^>]*>([\\s\\S]*?)<\\/span>`, 'i')
  const m = re.exec(row)
  return m ? m[1] : null
}

// Parser do HTML da NFC-e — layout padrão das páginas de consulta da SEFAZ
// (spans com classes txtTit, Rqtd, RUN, RvlUnit e o total em .valor)
function parseNFCeHtml(html) {
  const items = []

  // Restringe à tabela de resultados quando existir
  const tableMatch = html.match(/<table[^>]*id=["']tabResult["'][^>]*>([\s\S]*?)<\/table>/i)
  const scope = tableMatch ? tableMatch[1] : html

  // Cada produto é uma linha; usamos o span do nome (txtTit) como âncora
  const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi
  let rowMatch
  while ((rowMatch = rowRegex.exec(scope)) !== null) {
    const row = rowMatch[1]
    const nameRaw = pickSpan(row, 'txtTit')
    if (!nameRaw) continue
    const nome = cleanText(nameRaw)
    if (!nome) continue

    const quantidade = parseNum(pickSpan(row, 'Rqtd')) || 1
    const valor_unitario = parseNum(pickSpan(row, 'RvlUnit'))
    const valor_total = parseNum(pickSpan(row, 'valor'))

    items.push({ nome: nome.toUpperCase(), quantidade, valor_unitario, valor_total })
  }

  // Fallback 1: linhas <tr class="...Item..."> com <td>s (layout antigo)
  if (items.length === 0) {
    const rowRe = /<tr[^>]*class="[^"]*Item[^"]*"[^>]*>([\s\S]*?)<\/tr>/gi
    let m
    while ((m = rowRe.exec(html)) !== null) {
      const tds = []
      const tdRe = /<td[^>]*>([\s\S]*?)<\/td>/gi
      let td
      while ((td = tdRe.exec(m[1])) !== null) tds.push(cleanText(td[1]))
      if (tds.length >= 5) {
        items.push({
          nome: tds[0].toUpperCase(),
          quantidade: parseNum(tds[1]) || 1,
          valor_unitario: parseNum(tds[3]),
          valor_total: parseNum(tds[4]),
        })
      }
    }
  }

  return items
}

// Devolve um recorte do corpo do HTML pra depuração do parser (o <head> não interessa)
function sampleHtml(html) {
  const bodyIdx = html.search(/<body/i)
  const start = bodyIdx >= 0 ? bodyIdx : 0
  // Corpo inteiro (até 12k) sem scripts/estilos, pra caber e ficar legível
  const body = html.slice(start, start + 40000)
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/\s+/g, ' ')
  return body.slice(0, 12000)
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
    /class=["'][^"']*txtTopo[^"']*["'][^>]*>([\s\S]*?)<\/(?:div|span|h4|td|b|strong)>/i,
    /<div[^>]*id=["']u20["'][^>]*>([\s\S]*?)<\/div>/i,
    /<strong>([^<]{3,80})<\/strong>\s*<br\s*\/?>\s*CNPJ/i,
    /<h4[^>]*>([\s\S]*?)<\/h4>/i,
  ]

  for (const regex of patterns) {
    const match = regex.exec(html)
    if (match) {
      const nome = cleanText(match[1])
      if (nome && nome.length >= 3) return nome
    }
  }
  return null
}
