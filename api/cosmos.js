// Proxy serverless para a API Cosmos/Bluesoft (busca de produto por código de barras)
// Mantém o token no servidor — nunca é exposto no navegador

export default async function handler(req, res) {
  const { code } = req.query

  if (!code || !/^\d+$/.test(code)) {
    return res.status(400).json({ error: 'Código de barras inválido' })
  }

  const token = process.env.COSMOS_API_TOKEN
  if (!token) {
    return res.status(500).json({ error: 'Token da Cosmos não configurado' })
  }

  try {
    const response = await fetch(`https://api.cosmos.bluesoft.com.br/gtins/${code}.json`, {
      headers: { 'X-Cosmos-Token': token },
    })

    if (response.status === 404) {
      return res.status(404).json({ error: 'Produto não encontrado' })
    }
    if (!response.ok) {
      return res.status(502).json({ error: 'Cosmos não respondeu' })
    }

    const data = await response.json()
    return res.status(200).json({
      name: data.description || null,
      brand: data.brand?.name || null,
    })
  } catch {
    return res.status(500).json({ error: 'Erro ao consultar a Cosmos' })
  }
}
