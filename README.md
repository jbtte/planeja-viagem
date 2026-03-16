# Planeja Viagem

Organizador de viagens focado no processo real de planejamento — comparar opções, estimar custos e saber exatamente o que já está fechado.

## O problema que resolve

A maioria dos apps de viagem te força a decidir cedo demais. Na prática, você pesquisa várias passagens antes de fechar uma, compara hotéis, avalia opções de carro — tudo ao mesmo tempo, com incerteza. Este app foi construído para esse fluxo.

## Funcionalidades

- **Múltiplas opções por categoria** — adicione várias passagens, hotéis ou passeios e compare lado a lado
- **Duplo orçamento** — veja separadamente o total estimado (melhor opção por categoria) e o que já está comprometido (categorias fechadas)
- **Campos por tipo** — cada categoria tem atributos relevantes: passagens têm cia/voo/escala/bagagem; hotel tem estrelas/bairro/café da manhã; carro tem categoria/câmbio/cobertura etc.
- **Status por categoria** — cada item tem seu próprio ciclo: pesquisando → fechado → reabrir se necessário
- **Gastos diários calculados** — informe o valor por dia e o número de dias, o total é calculado automaticamente
- **Multi-moeda** — defina a moeda e cotação da viagem
- **Login com Google** — dados ficam salvos por usuário

## Stack

- React + Vite
- Supabase (banco de dados + autenticação Google)
- React Router
- Deploy na Vercel

## Rodando localmente

**Pré-requisitos:** Node.js 20+

```bash
# Instalar dependências
npm install

# Configurar variáveis de ambiente
cp .env.example .env
# Edite .env com suas chaves do Supabase

# Rodar
npm run dev
```

## Configuração do Supabase

1. Crie um projeto em [supabase.com](https://supabase.com)
2. Execute o schema em SQL Editor:

```bash
supabase/schema.sql
```

3. Ative o provider Google em Authentication → Providers → Google
4. Configure as variáveis no `.env`:

```
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=sua-chave-aqui
```

## Deploy na Vercel

1. Importe o repositório na [Vercel](https://vercel.com)
2. Adicione as variáveis de ambiente (`VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`)
3. Deploy automático a cada push no `main`
