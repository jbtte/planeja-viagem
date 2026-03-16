export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const { destination, num_people, num_days } = req.body
  if (!destination) return res.status(400).json({ error: 'Destino obrigatório' })

  const prompt = `Você é um especialista em viagens para turistas brasileiros.

Estime o custo médio diário por pessoa em ${destination}, em 2026, para uma viagem de ${num_days ?? 7} dias com ${num_people ?? 2} pessoas.

Considere: alimentação (refeições em restaurantes médios), transporte local (metrô, ônibus, táxi ocasional), entradas em atrações turísticas e pequenas compras/souvenirs. NÃO inclua hospedagem nem passagens aéreas.

Retorne APENAS JSON válido:
{
  "por_dia": valor numérico em BRL (use câmbio atual aproximado se necessário),
  "moeda_local": "nome da moeda local",
  "notas": "observação curta sobre o custo de vida local e o que está incluso na estimativa"
}`

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
  } catch {
    return res.status(500).json({ error: 'Erro ao conectar com o Gemini' })
  }

  if (geminiData.error) {
    return res.status(500).json({ error: geminiData.error.message })
  }

  const text = geminiData.candidates?.[0]?.content?.parts?.[0]?.text
  const jsonMatch = text?.match(/\{[\s\S]*\}/)
  if (!jsonMatch) return res.status(500).json({ error: 'Gemini não retornou dados válidos' })

  try {
    return res.json({ data: JSON.parse(jsonMatch[0]) })
  } catch {
    return res.status(500).json({ error: 'Erro ao interpretar resposta do Gemini' })
  }
}
