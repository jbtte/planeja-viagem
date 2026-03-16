import * as readline from 'readline'

const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
const ask = (q) => new Promise(resolve => rl.question(q, resolve))

const TIPOS = ['passagens', 'hotel', 'carro', 'passeios', 'seguro', 'translados', 'restaurantes', 'gastos_diarios']

const url = await ask('Cole o link: ')
if (!url.startsWith('http')) {
  console.error('URL inválida.')
  process.exit(1)
}

console.log(`\nTipos disponíveis: ${TIPOS.join(', ')}`)
const tipoInput = await ask('Tipo (Enter para hotel): ')
const tipo = TIPOS.includes(tipoInput.trim()) ? tipoInput.trim() : 'hotel'
rl.close()

console.log(`\nAnalisando: ${url}`)
console.log(`Tipo: ${tipo}\n`)

// Jina
console.log('1. Buscando conteúdo via Jina...')
const jinaRes = await fetch(`https://r.jina.ai/${url}`, {
  headers: { Accept: 'text/plain' },
  signal: AbortSignal.timeout(30000),
})
const pageText = await jinaRes.text()
console.log(`   ${pageText.length} caracteres lidos`)
if (pageText.length < 200) {
  console.error('   ERRO: conteúdo insuficiente — página provavelmente bloqueou o acesso')
  process.exit(1)
}
console.log(`   Prévia: ${pageText.slice(0, 300).replace(/\n/g, ' ')}...\n`)

// Gemini
console.log('2. Enviando para Gemini...')
const prompt = buildPrompt(url, tipo, pageText.slice(0, 10000))

const geminiRes = await fetch(
  `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
  {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: 'application/json' },
    }),
  }
)

const geminiData = await geminiRes.json()

if (geminiData.error) {
  console.error('   ERRO Gemini:', geminiData.error.message)
  process.exit(1)
}

const text = geminiData.candidates?.[0]?.content?.parts?.[0]?.text
if (!text) {
  console.error('   ERRO: resposta vazia do Gemini')
  console.error('   Raw:', JSON.stringify(geminiData, null, 2))
  process.exit(1)
}

const jsonMatch = text.match(/\{[\s\S]*\}/)
if (!jsonMatch) {
  console.error('   ERRO: sem JSON na resposta')
  console.error('   Raw:', text)
  process.exit(1)
}

const parsed = JSON.parse(jsonMatch[0])
console.log('\n✅ Resultado:\n')
console.log(JSON.stringify(parsed, null, 2))

// ----

function buildPrompt(url, tipo, content) {
  const CAMPOS = {
    passagens: `"cia", "voo", "escala" (bool), "bagagem" (bool), "duracao"`,
    hotel: `"estrelas" (int), "cafe_manha" (bool), "bairro", "regime"`,
    carro: `"categoria", "transmissao", "cobertura" (bool), "dias" (int)`,
    passeios: `"duracao_horas" (int), "inclui_transporte" (bool), "idioma"`,
    seguro: `"cobertura_medica" (number), "cobertura_bagagem" (bool), "franquia"`,
    translados: `"tipo", "percurso"`,
    restaurantes: `"tipo_cozinha", "preco_medio_pessoa" (number)`,
    gastos_diarios: `"por_dia" (number), "num_dias" (int)`,
  }

  return `Extraia informações desta página de viagem e retorne APENAS JSON válido.

Tipo: ${tipo}
Campos de "campos": { ${CAMPOS[tipo] ?? ''} }

Formato:
{
  "name": "nome descritivo da opção",
  "value": 1234.56,
  "campos": { ... },
  "url": "${url}"
}

Conteúdo:
${content}`
}
