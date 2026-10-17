// Gasto de exercício. Fontes e justificativas em docs/fontes.md (item 3).

export type TipoTreino = 'esteira' | 'calistenia'
export type Intensidade = 'leve' | 'moderada' | 'vigorosa'

export interface Exercicio {
  nome: string
  series?: number
  repeticoes?: number
}

export interface Treino {
  id?: number
  data: string // AAAA-MM-DD
  tipo: TipoTreino
  minutos: number
  velocidadeKmh?: number
  inclinacaoPct?: number
  intensidade?: Intensidade
  exercicios?: Exercicio[]
  criadoEm: number
}

export const TIPOS: Record<TipoTreino, string> = { calistenia: 'Calistenia', esteira: 'Esteira' }

// 2024 Adult Compendium: calistenia leve (02024), moderada (02022) e vigorosa (02020).
export const INTENSIDADES: Record<Intensidade, { nome: string; exemplo: string; met: number }> = {
  leve: { nome: 'Leve', exemplo: 'Prancha, abdominais, mobilidade. Dá para conversar normalmente.', met: 2.8 },
  moderada: { nome: 'Moderada', exemplo: 'Flexões, agachamentos, afundos num ritmo confortável. A respiração acelera.', met: 3.8 },
  vigorosa: { nome: 'Vigorosa', exemplo: 'Burpees, barras, circuito puxado. Fica difícil falar.', met: 7.5 },
}

// 2024 Adult Compendium, caminhada em esteira sem inclinação (códigos 17340 a 17367).
// A tabela é em milhas por hora: [velocidade máxima da faixa em mph, MET].
const ESTEIRA_MPH: [number, number][] = [
  [1.0, 2.1],
  [1.2, 2.3],
  [2.0, 2.8],
  [2.5, 3.0],
  [3.0, 3.5],
  [3.5, 3.8],
  [4.0, 4.8],
  [4.5, 5.8],
  [5.0, 6.8],
  [5.55, 8.3],
]
const KM_POR_MILHA = 1.609344

// MET da esteira. Até 8,9 km/h usa a tabela do Compendium e soma a inclinação pela parte vertical
// da equação de caminhada do ACSM (1,8 × velocidade × inclinação). Acima disso é corrida, e vale a
// equação de corrida do ACSM inteira: VO2 = 3,5 + 0,2 × v + 0,9 × v × inclinação (v em m/min).
export function metEsteira(velocidadeKmh: number, inclinacaoPct = 0): number {
  const v = (velocidadeKmh * 1000) / 60
  const g = Math.max(0, inclinacaoPct) / 100
  const mph = velocidadeKmh / KM_POR_MILHA
  const faixa = ESTEIRA_MPH.find(([max]) => mph < max)
  if (!faixa) return (3.5 + 0.2 * v + 0.9 * v * g) / 3.5
  return faixa[1] + (1.8 * v * g) / 3.5
}

export function metDe(t: Pick<Treino, 'tipo' | 'velocidadeKmh' | 'inclinacaoPct' | 'intensidade'>): number {
  if (t.tipo === 'esteira') return metEsteira(t.velocidadeKmh ?? 0, t.inclinacaoPct)
  return INTENSIDADES[t.intensidade ?? 'moderada'].met
}

// Só o gasto extra: desconta 1 MET, que você gastaria parado no mesmo tempo.
export function gastoTreino(t: Pick<Treino, 'tipo' | 'minutos' | 'velocidadeKmh' | 'inclinacaoPct' | 'intensidade'>, pesoKg: number): number {
  return Math.max(0, metDe(t) - 1) * pesoKg * (t.minutos / 60)
}

// Água a mais em dia de treino: cerca de 0,6 L por hora, o meio da faixa de 0,4 a 0,8 L/h do ACSM.
export function aguaExtraMl(minutos: number): number {
  return Math.round(((minutos / 60) * 600) / 50) * 50
}

export function descreverTreino(t: Treino): string {
  if (t.tipo === 'esteira') {
    const vel = (t.velocidadeKmh ?? 0).toLocaleString('pt-BR', { maximumFractionDigits: 1 })
    const inc = t.inclinacaoPct ? `, inclinação ${t.inclinacaoPct.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%` : ''
    return `${t.minutos} min a ${vel} km/h${inc}`
  }
  return `${t.minutos} min, intensidade ${INTENSIDADES[t.intensidade ?? 'moderada'].nome.toLowerCase()}`
}

export function descreverExercicio(e: Exercicio): string {
  if (e.series && e.repeticoes) return `${e.nome}: ${e.series} × ${e.repeticoes}`
  if (e.series) return `${e.nome}: ${e.series} ${e.series === 1 ? 'série' : 'séries'}`
  if (e.repeticoes) return `${e.nome}: ${e.repeticoes} repetições`
  return e.nome
}
