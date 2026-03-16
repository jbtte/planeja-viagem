export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const { trip, categories } = req.body
  if (!trip || !categories) return res.status(400).json({ error: 'Dados da viagem obrigatórios' })

  // Monta texto estruturado da viagem para o Gemini
  const linhas = []

  linhas.push(`Destino: ${trip.destination}`)
  if (trip.start_date && trip.end_date) linhas.push(`Período: ${trip.start_date} a ${trip.end_date}`)
  linhas.push(`Pessoas: ${trip.num_people}`)
  linhas.push(`Moeda: ${trip.currency}`)
  linhas.push('')

  for (const cat of categories) {
    if (cat.status === 'descartado') continue
    const selectedOption = cat.options?.find(o => o.status === 'selecionado')
    const statusLabel = cat.status === 'fechado' ? '✅ Fechado' : '🔍 Em pesquisa'

    linhas.push(`[${cat.name}] ${statusLabel}`)
    if (selectedOption) {
      linhas.push(`  Opção: ${selectedOption.name}`)
      if (selectedOption.value) linhas.push(`  Valor: ${selectedOption.value} ${trip.currency}`)
      if (selectedOption.campos && Object.keys(selectedOption.campos).length > 0) {
        linhas.push(`  Detalhes: ${JSON.stringify(selectedOption.campos)}`)
      }
      if (selectedOption.notes) linhas.push(`  Obs: ${selectedOption.notes}`)
    } else {
      linhas.push('  (nenhuma opção selecionada)')
    }
    linhas.push('')
  }

  const dadosViagem = linhas.join('\n')

  const prompt = `Você é um assistente de viagens. Com base nos dados abaixo, gere um resumo da viagem formatado para WhatsApp.

Use emojis, negrito com asteriscos (*texto*) e deixe visualmente organizado. Escreva em português. Seja conciso mas completo. Destaque o que está fechado vs em pesquisa. Inclua o total gasto nas categorias fechadas no final.

Dados da viagem:
${dadosViagem}

Retorne APENAS o texto do resumo, sem explicações adicionais.`

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
  if (!text) return res.status(500).json({ error: 'Gemini não retornou texto' })

  return res.json({ summary: text })
}
