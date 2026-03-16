const CAMPOS_PROMPT = {
  passagens: `
  "campos": {
    "cia": "nome da companhia aérea (ex: LATAM, Gol, TAP)",
    "voo": "número do voo (ex: LA3040)",
    "escala": true ou false,
    "bagagem": true ou false (bagagem despachada inclusa no preço),
    "duracao": "duração total do voo (ex: 10h30)"
  }`,
  hotel: `
  "campos": {
    "estrelas": número inteiro de 1 a 5,
    "cafe_manha": true ou false,
    "bairro": "bairro ou região do hotel",
    "regime": "tipo de regime (ex: B&B, Meia Pensão, All Inclusive)"
  }`,
  carro: `
  "campos": {
    "categoria": "categoria do veículo (ex: Econômico, Intermediário, SUV)",
    "transmissao": "Automático ou Manual",
    "cobertura": true ou false (cobertura total inclusa),
    "dias": número de dias de locação
  }`,
  passeios: `
  "campos": {
    "duracao_horas": número de horas,
    "inclui_transporte": true ou false,
    "idioma": "idioma do passeio (ex: Português, Inglês)"
  }`,
  seguro: `
  "campos": {
    "cobertura_medica": valor numérico da cobertura médica em USD,
    "cobertura_bagagem": true ou false,
    "franquia": "valor ou descrição da franquia"
  }`,
  translados: `
  "campos": {
    "tipo": "tipo de translado (ex: Transfer privativo, Shuttle)",
    "percurso": "descrição do percurso (ex: Aeroporto → Hotel)"
  }`,
  restaurantes: `
  "campos": {
    "tipo_cozinha": "tipo de cozinha (ex: Italiana, Japonesa)",
    "preco_medio_pessoa": valor numérico médio por pessoa
  }`,
  gastos_diarios: `
  "campos": {
    "por_dia": valor numérico estimado por pessoa por dia,
    "num_dias": número de dias
  }`,
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' })
  }

  const { url, tipo } = req.body

  if (!url || !url.startsWith('http')) {
    return res.status(400).json({ error: 'URL inválida' })
  }

  // Busca conteúdo legível da página via Jina AI Reader
  let pageText
  try {
    const jinaRes = await fetch(`https://r.jina.ai/${url}`, {
      headers: { Accept: 'text/plain' },
    })
    pageText = await jinaRes.text()
  } catch {
    return res.status(502).json({ error: 'Não foi possível acessar a página' })
  }

  // Limita tokens (~8k caracteres)
  const truncated = pageText.slice(0, 8000)
  const camposPrompt = CAMPOS_PROMPT[tipo] ?? '"campos": {}'

  const prompt = `Você é um assistente especializado em extrair informações de páginas de viagem.

A partir do conteúdo abaixo, extraia as informações e retorne APENAS um JSON válido, sem explicações.

Tipo de categoria: ${tipo}

Retorne exatamente neste formato (use null para campos não encontrados):
{
  "name": "nome descritivo e conciso da opção (ex: LATAM - Voo direto GRU→LIS - 23/06)",
  "value": valor numérico total (apenas o número, sem símbolo de moeda),${camposPrompt},
  "url": "${url}"
}

Conteúdo da página:
${truncated}`

  // Chama Gemini
  let parsed
  try {
    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
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
    const text = geminiData.candidates?.[0]?.content?.parts?.[0]?.text

    if (!text) throw new Error('Resposta vazia do Gemini')
    parsed = JSON.parse(text)
  } catch (err) {
    return res.status(500).json({ error: 'Não foi possível extrair os dados da página' })
  }

  return res.json({ data: parsed })
}
