export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const { category, options, destination, numPeople, currency } = req.body

  const visible = (options ?? []).filter(o => o.status !== 'descartado')
  if (visible.length < 2) {
    return res.status(400).json({ error: 'Adicione pelo menos 2 opções para comparar.' })
  }

  const optionsText = visible.map((opt, i) => {
    const lines = []
    const label = opt.status === 'selecionado' ? `Opção ${i + 1} ⭐ (selecionada)` : `Opção ${i + 1}`
    lines.push(`${label}: ${opt.name}`)
    if (opt.value) lines.push(`  Valor: ${opt.value} ${currency}`)
    if (opt.campos && Object.keys(opt.campos).length > 0) {
      lines.push(`  Detalhes: ${JSON.stringify(opt.campos, null, 2)}`)
    }
    if (opt.notes) lines.push(`  Observações: ${opt.notes}`)
    return lines.join('\n')
  }).join('\n\n')

  const prompt = `Você é um consultor especializado em planejamento de viagens. Analise e compare as opções abaixo para a categoria "${category.name}" de uma viagem para ${destination} (${numPeople} pessoa${numPeople !== 1 ? 's' : ''}).

Moeda: ${currency}

${optionsText}

Faça uma comparação clara e objetiva em português. Estruture sua resposta assim:

1. **Comparação de preço** — qual é mais barata, qual é mais cara, diferença em %, se os preços estão dentro do esperado para ${destination}

2. **Comparação de atributos** — analise os detalhes específicos de cada opção (ex: tempo de escala, localização do bairro, café da manhã incluso, cobertura do seguro, etc.). Seja específico com os dados disponíveis.

3. **Custo-benefício** — qual oferece mais pelo preço considerando o contexto da viagem

4. **Recomendação** — qual você escolheria e por quê, em 2-3 linhas diretas

Use emojis com moderação. Seja direto, como um amigo que entende de viagens.`

  let geminiData
  try {
    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(30000),
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
        }),
      }
    )
    geminiData = await geminiRes.json()
  } catch {
    return res.status(500).json({ error: 'Erro ao conectar com o Gemini' })
  }

  if (geminiData.error) {
    return res.status(500).json({ error: geminiData.error.message })
  }

  const text = geminiData.candidates?.[0]?.content?.parts?.[0]?.text
  if (!text) return res.status(500).json({ error: 'Gemini não retornou análise' })

  return res.json({ comparison: text })
}
