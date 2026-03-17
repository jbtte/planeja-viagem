import { createInterface } from 'readline'

const rl = createInterface({ input: process.stdin, output: process.stdout })
const ask = q => new Promise(resolve => rl.question(q, resolve))

const key = process.env.VITE_UNSPLASH_ACCESS_KEY
if (!key) {
  console.error('❌ VITE_UNSPLASH_ACCESS_KEY não encontrada no .env')
  process.exit(1)
}

const destination = await ask('Destino: ')
rl.close()

const url = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(destination + ' travel')}&orientation=portrait&per_page=3&client_id=${key}`

console.log('\n🔍 Buscando fotos para:', destination)

const res = await fetch(url)
const data = await res.json()

if (!res.ok) {
  console.error('❌ Erro da API:', data)
  process.exit(1)
}

if (!data.results?.length) {
  console.log('⚠️  Nenhuma foto encontrada')
  process.exit(0)
}

console.log(`\n✅ ${data.results.length} resultado(s) encontrado(s):\n`)
data.results.forEach((photo, i) => {
  console.log(`${i + 1}. ${photo.description ?? photo.alt_description ?? '(sem descrição)'}`)
  console.log(`   Fotógrafo: ${photo.user.name}`)
  console.log(`   URL: ${photo.urls.regular}\n`)
})
