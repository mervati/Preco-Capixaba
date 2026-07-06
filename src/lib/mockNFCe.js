// Mock de uma NFC-e do ES para testes sem nota fiscal real
export const MOCK_NFCE_URL =
  'https://nfce.sefaz.es.gov.br/rest/p/qr?chNFe=32260600000000000000550010000000011000000010&nVersao=100&tpAmb=1&cIdToken=000001&cHashQRCode=MOCK'

export const MOCK_EMITENTE = 'Supermercado Teste'

export const MOCK_ITEMS = [
  { nome: 'ARROZ TIPO 1 5KG', quantidade: 1, unidade: 'UN', valorUnitario: 28.9, valorTotal: 28.9 },
  { nome: 'FEIJAO CARIOCA 1KG', quantidade: 2, unidade: 'UN', valorUnitario: 8.5, valorTotal: 17.0 },
  { nome: 'OLEO DE SOJA 900ML', quantidade: 1, unidade: 'UN', valorUnitario: 9.99, valorTotal: 9.99 },
  { nome: 'ACUCAR CRISTAL 1KG', quantidade: 1, unidade: 'UN', valorUnitario: 4.79, valorTotal: 4.79 },
  { nome: 'MACARRAO ESPAGUETE 500G', quantidade: 3, unidade: 'UN', valorUnitario: 3.49, valorTotal: 10.47 },
  { nome: 'MOLHO DE TOMATE 340G', quantidade: 2, unidade: 'UN', valorUnitario: 2.99, valorTotal: 5.98 },
  { nome: 'LEITE INTEGRAL 1L', quantidade: 6, unidade: 'UN', valorUnitario: 5.49, valorTotal: 32.94 },
  { nome: 'PAO DE FORMA 500G', quantidade: 1, unidade: 'UN', valorUnitario: 11.9, valorTotal: 11.9 },
  { nome: 'MARGARINA 500G', quantidade: 1, unidade: 'UN', valorUnitario: 7.89, valorTotal: 7.89 },
  { nome: 'SABAO EM PO 1KG', quantidade: 1, unidade: 'UN', valorUnitario: 13.5, valorTotal: 13.5 },
]

export function isMockUrl(url) {
  return url.includes('MOCK')
}
