# Preço Certo

PWA de lista de compras com leitura de NFC-e do Espírito Santo, controle de despensa e comparação de preços entre supermercados.

## Funcionalidades

**Lista de compras**
- Lista única e automática — sem precisar criar ou escolher listas
- Sincroniza sozinha com a Despensa: quando um item acaba, entra na lista; quando é reposto, sai
- Cada item mostra o menor preço já visto e em qual supermercado
- Total estimado da compra, baseado nesses preços
- Escaneamento de NFC-e: aponta a câmera pro QR Code da nota, os produtos vão pra Despensa com a quantidade certa e o preço é gravado no supermercado identificado

**Despensa**
- Controle de estoque com quantidade atual e mínima por produto
- Alerta de itens acabando
- Botões de repor (+) e consumir (−), com confirmação ao zerar o último item
- Escaneamento de NFC-e diretamente pela Despensa
- Cadastro manual com nome, marca e supermercado, ou escaneando o código de barras do produto (busca automática na base brasileira Cosmos/Bluesoft e na Open Food Facts)

**Radar de Preços**
- Grade com todos os produtos já comprados, com o menor preço de cada
- Ao abrir um produto: gráfico de evolução do preço por supermercado, com data e variação percentual
- Seleção múltipla para excluir vários produtos de uma vez

**Supermercados**
- Cadastro e edição pelo menu do logo, no topo do app

## Tecnologias

React + Vite + Tailwind CSS, PWA (`vite-plugin-pwa`), [Supabase](https://supabase.com) (autenticação e banco de dados).

**Leitura de código de barras**

Motor principal: [`BarcodeDetector`](https://developer.mozilla.org/en-US/docs/Web/API/BarcodeDetector) — API nativa do navegador, sem dependência externa. No iOS 17+/26 usa o Vision framework da Apple (mesmo motor dos apps nativos). Fallbacks automáticos: [`@ericblade/quagga2`](https://github.com/ericblade/quagga2) para Android/desktop e [`@zxing/browser`](https://github.com/zxing-js/library) para iOS sem suporte nativo. Busca de produto por código: base brasileira [Cosmos/Bluesoft](https://cosmos.bluesoft.com.br) (consultada via proxy serverless para não expor o token) e [Open Food Facts](https://world.openfoodfacts.org) como fallback.

**Leitura de NFC-e**

[`html5-qrcode`](https://github.com/mebjas/html5-qrcode) faz a leitura do QR Code da nota fiscal. O link extraído é consultado via proxy serverless (`api/sefaz.js`) para contornar o bloqueio de CORS do SEFAZ-ES.

## Rodando localmente

1. Instale as dependências:
   ```
   npm install
   ```
2. Crie um `.env.local` com as credenciais do Supabase:
   ```
   VITE_SUPABASE_URL=...
   VITE_SUPABASE_ANON_KEY=...
   ```
3. Rode as migrações em `sql/schema.sql`, `sql/schema_v2.sql`, `sql/schema_v3.sql`, `sql/schema_v4.sql` e `sql/schema_v5.sql` (em ordem) no SQL Editor do Supabase.
4. Inicie o servidor de desenvolvimento:
   ```
   npm run dev
   ```

## Deploy

O deploy é feito na Vercel. `api/sefaz.js` é um proxy serverless que consulta o SEFAZ-ES pra ler os itens da NFC-e, evitando bloqueio de CORS.
