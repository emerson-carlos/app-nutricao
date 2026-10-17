// Cálculos de metas. Fontes e justificativas em docs/fontes.md.

export type Sexo = 'masculino' | 'feminino'
export type Objetivo = 'perder' | 'manter' | 'ganhar' | 'recomposicao'

export interface Perfil {
  sexo: Sexo
  nascimento: string // AAAA-MM-DD
  alturaCm: number
  pesoKg: number
  objetivo: Objetivo
  modoDiscreto: boolean
}

export interface Metas {
  basal: number
  gastoBase: number
  kcal: number
  proteinaG: number
  gorduraG: number
  carboidratoG: number
  fibraG: number
  gorduraSaturadaMaxG: number
  aguaBeberMl: number
}

export const OBJETIVOS: Record<Objetivo, { nome: string; descricao: string }> = {
  perder: { nome: 'Perder gordura', descricao: 'Cerca de 15% abaixo do seu gasto, com proteína alta.' },
  recomposicao: {
    nome: 'Perder gordura e ganhar músculo',
    descricao: 'Déficit pequeno (10%) com proteína alta. Funciona bem para quem está começando a treinar.',
  },
  manter: { nome: 'Manter o peso', descricao: 'Comer o mesmo que você gasta.' },
  ganhar: { nome: 'Ganhar massa', descricao: 'Cerca de 8% acima do seu gasto, para ganhar músculo com pouca gordura.' },
}

// Fator sobre o gasto do dia, por objetivo (ver docs/fontes.md, item 4).
const FATOR_KCAL: Record<Objetivo, number> = { perder: 0.85, recomposicao: 0.9, manter: 1, ganhar: 1.08 }
// Proteína em g por kg de peso (ISSN 2017; lado alto no déficit).
const PROTEINA_G_KG: Record<Objetivo, number> = { perder: 2.0, recomposicao: 2.0, manter: 1.6, ganhar: 1.8 }

export function idadeEmAnos(nascimento: string, hoje = new Date()): number {
  const n = new Date(nascimento + 'T00:00:00')
  let idade = hoje.getFullYear() - n.getFullYear()
  const m = hoje.getMonth() - n.getMonth()
  if (m < 0 || (m === 0 && hoje.getDate() < n.getDate())) idade--
  return idade
}

// Mifflin-St Jeor (Am J Clin Nutr 1990;51:241-247).
export function metabolismoBasal(sexo: Sexo, pesoKg: number, alturaCm: number, idade: number): number {
  const base = 10 * pesoKg + 6.25 * alturaCm - 5 * idade
  return sexo === 'masculino' ? base + 5 : base - 161
}

export function calcularMetas(p: Perfil, hoje = new Date()): Metas {
  const idade = idadeEmAnos(p.nascimento, hoje)
  const basal = metabolismoBasal(p.sexo, p.pesoKg, p.alturaCm, idade)
  // Sedentário, sem exercício: os treinos são somados à parte quando registrados.
  const gastoBase = basal * 1.2
  const kcal = Math.max(basal, gastoBase * FATOR_KCAL[p.objetivo])
  const proteinaG = p.pesoKg * PROTEINA_G_KG[p.objetivo]
  const gorduraG = (kcal * 0.25) / 9 // 25% das calorias (faixa OMS: até 30%)
  const carboidratoG = Math.max(0, (kcal - proteinaG * 4 - gorduraG * 9) / 4)
  // EFSA 2010: água total 2,5 L (homens) ou 2,0 L (mulheres); cerca de 20% vem da comida.
  const aguaTotalMl = p.sexo === 'masculino' ? 2500 : 2000
  return {
    basal: Math.round(basal),
    gastoBase: Math.round(gastoBase),
    kcal: Math.round(kcal),
    proteinaG: Math.round(proteinaG),
    gorduraG: Math.round(gorduraG),
    carboidratoG: Math.round(carboidratoG),
    fibraG: 25, // OMS 2023: pelo menos 25 g por dia
    gorduraSaturadaMaxG: Math.round((kcal * 0.1) / 9), // OMS: menos de 10% das calorias
    aguaBeberMl: Math.round((aguaTotalMl * 0.8) / 50) * 50,
  }
}
