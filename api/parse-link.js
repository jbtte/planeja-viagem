const CAMPOS_PROMPT = {
  passagens: `
  "campos": {
    "cia": "nome da companhia aérea (ex: LATAM, Gol, TAP)",
    "voo": "número do voo (ex: LA3040)",
    "data_ida": "data de ida no formato YYYY-MM-DD",
    "data_volta": "data de volta no formato YYYY-MM-DD (null se só ida)",
    "duracao": "duração total do voo (ex: 10h30)",
    "bagagem": true ou false (bagagem despachada inclusa no preço),
    "por_pessoa": true ou false (o preço informado é por pessoa?),
    "num_parcelas": número de parcelas (null se à vista),
    "cancelamento_ate": "data limite para cancelamento gratuito no formato YYYY-MM-DD (null se não encontrado)",
    "escalas_ida": [{ "local": "cidade/aeroporto", "duracao": "2h30" }],
    "escalas_volta": [{ "local": "cidade/aeroporto", "duracao": "1h45" }]
  }`,
  hotel: `
  "campos": {
    "check_in": "data de check-in no formato YYYY-MM-DD",
    "check_out": "data de check-out no formato YYYY-MM-DD",
    "estrelas": número inteiro de 1 a 5,
    "cafe_manha": true ou false,
    "bairro": "bairro ou região do hotel",
    "regime": "tipo de regime (ex: B&B, Meia Pensão, All Inclusive)",
    "reserva_via": "nome do site ou 'Direto com o hotel'",
    "reservado": true ou false,
    "num_parcelas": número de parcelas (null se à vista),
    "cancelamento_ate": "data limite para cancelamento gratuito no formato YYYY-MM-DD (null se não encontrado)"
  }`,
  carro: `
  "campos": {
    "data_retirada": "data de retirada do carro no formato YYYY-MM-DD",
    "categoria": "categoria do veículo (ex: Econômico, Intermediário, SUV)",
    "transmissao": "Automático ou Manual",
    "cobertura": true ou false (cobertura total inclusa),
    "dias": número de dias de locação
  }`,
  passeios: `
  "campos": {
    "data": "data do passeio no formato YYYY-MM-DD",
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
    "data": "data do translado no formato YYYY-MM-DD",
    "tipo": "tipo de translado (ex: Transfer privativo, Shuttle)",
    "percurso": "descrição do percurso (ex: Aeroporto → Hotel)"
  }`,
  restaurantes: `
  "campos": {
    "data": "data da refeição no formato YYYY-MM-DD",
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

  const { url, content, tipo } = req.body

  let pageText
  let sourceUrl = url ?? ''

  if (content) {
    // Modo paste: conteúdo já veio do cliente
    pageText = content
  } else if (url && url.startsWith('http')) {
    // Modo link: busca via Jina AI Reader
    try {
      const jinaRes = await fetch(`https://r.jina.ai/${url}`, {
        headers: {
          'Accept': 'text/plain',
          'X-Return-Format': 'markdown',
          'X-No-Cache': 'true',
          'X-With-Generated-Alt': 'true',
        },
        signal: AbortSignal.timeout(30000),
      })
      pageText = await jinaRes.text()
    } catch {
      return res.status(502).json({ error: 'Não foi possível acessar a página' })
    }

    if (
      pageText.length < 200 ||
      pageText.toLowerCase().includes('captcha') ||
      pageText.toLowerCase().includes('access denied')
    ) {
      return res.status(422).json({
        error: 'Este site bloqueou a leitura automática. Use a opção "Colar página" — selecione tudo (Ctrl+A) e cole aqui.',
      })
    }
  } else {
    return res.status(400).json({ error: 'Informe uma URL ou cole o conteúdo da página' })
  }

  const truncated = pageText.slice(0, 12000)
  const camposPrompt = CAMPOS_PROMPT[tipo] ?? '"campos": {}'

  const prompt = `Você é um assistente especializado em extrair informações de páginas de viagem.

A partir do conteúdo abaixo, extraia as informações e retorne APENAS um JSON válido, sem markdown, sem explicações, sem blocos de código.

Tipo de categoria: ${tipo}

Retorne exatamente neste formato (use null para campos não encontrados):
{
  "name": "nome descritivo e conciso da opção (ex: Hotel Sheraton Lisboa - 5 noites)",
  "value": 1234.56,${camposPrompt},
  "url": "${sourceUrl}"
}

Conteúdo da página:
${truncated}`

  // Chama Gemini
  let geminiData
  try {
    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(20000),
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: 'application/json' },
        }),
      }
    )
    geminiData = await geminiRes.json()
  } catch (err) {
    console.error('Gemini fetch error:', err)
    return res.status(500).json({ error: 'Erro ao conectar com o Gemini' })
  }

  // Verifica erros da API do Gemini
  if (geminiData.error) {
    console.error('Gemini API error:', geminiData.error)
    return res.status(500).json({ error: `Gemini: ${geminiData.error.message}` })
  }

  const text = geminiData.candidates?.[0]?.content?.parts?.[0]?.text
  if (!text) {
    console.error('Gemini empty response:', JSON.stringify(geminiData))
    return res.status(500).json({ error: 'Gemini não retornou dados' })
  }

  // Extrai JSON mesmo que venha com markdown ao redor
  const jsonMatch = text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) {
    console.error('No JSON in Gemini response:', text)
    return res.status(500).json({ error: 'Resposta do Gemini não contém JSON válido' })
  }

  try {
    const parsed = JSON.parse(jsonMatch[0])
    return res.json({ data: parsed })
  } catch (err) {
    console.error('JSON parse error:', text)
    return res.status(500).json({ error: 'Não foi possível interpretar a resposta do Gemini' })
  }
}
