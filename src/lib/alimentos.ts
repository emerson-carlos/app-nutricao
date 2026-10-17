import taco from '../data/taco.json'

// TACO 4ª edição (NEPA/Unicamp, 2011). Valores por 100 g da parte comestível.
export interface Alimento {
  id: number
  nome: string
  grupo: string
  kcal: number
  prot: number
  gord: number
  carb: number
  fibra: number | null
  sat: number | null
  sodio: number | null
}

export const ALIMENTOS = taco as Alimento[]
export const GRUPO_PROPRIO = 'Seus alimentos'
const porId = new Map(ALIMENTOS.map((a) => [a.id, a]))

export function alimento(id: number): Alimento | undefined {
  return porId.get(id)
}

function normalizar(t: string): string {
  return t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
}

let indice = ALIMENTOS.map((a) => ({ a, texto: normalizar(a.nome) }))

// Os alimentos cadastrados pelo rótulo ficam no banco do aparelho. O App chama esta
// função sempre que a lista muda, para que busca e cálculo os enxerguem como os da TACO.
export function registrarProprios(proprios: Alimento[]) {
  for (const [id, a] of porId) if (a.grupo === GRUPO_PROPRIO) porId.delete(id)
  for (const a of proprios) porId.set(a.id, a)
  indice = [...proprios, ...ALIMENTOS].map((a) => ({ a, texto: normalizar(a.nome) }))
}

export interface Rotulo {
  nome: string
  porcaoG: number
  kcal: number
  prot: number
  carb: number
  gord: number
  sat: number
  fibra: number
  sodio: number
}

// O rótulo brasileiro informa por porção; a TACO, por 100 g. Converte para 100 g.
export function alimentoDoRotulo(r: Rotulo, id: number): Alimento {
  const f = 100 / r.porcaoG
  const arred = (n: number) => Math.round(n * f * 10) / 10
  return {
    id,
    nome: r.nome.trim(),
    grupo: GRUPO_PROPRIO,
    kcal: arred(r.kcal),
    prot: arred(r.prot),
    gord: arred(r.gord),
    carb: arred(r.carb),
    fibra: arred(r.fibra),
    sat: arred(r.sat),
    sodio: arred(r.sodio),
  }
}

// Busca por todas as palavras digitadas, sem ligar para acentos. Nomes que começam
// com a primeira palavra aparecem primeiro.
export function buscarAlimentos(consulta: string, limite = 30): Alimento[] {
  const palavras = normalizar(consulta).split(/\s+/).filter(Boolean)
  if (palavras.length === 0) return []
  return indice
    .filter(({ texto }) => palavras.every((p) => texto.includes(p)))
    .sort((x, y) => Number(!x.texto.startsWith(palavras[0])) - Number(!y.texto.startsWith(palavras[0])) || x.texto.length - y.texto.length)
    .slice(0, limite)
    .map(({ a }) => a)
}

export interface Nutrientes {
  kcal: number
  prot: number
  gord: number
  carb: number
  fibra: number
  sat: number
}

export const ZERO: Nutrientes = { kcal: 0, prot: 0, gord: 0, carb: 0, fibra: 0, sat: 0 }

export function nutrientesDe(a: Alimento, gramas: number): Nutrientes {
  const f = gramas / 100
  return {
    kcal: a.kcal * f,
    prot: a.prot * f,
    gord: a.gord * f,
    carb: a.carb * f,
    fibra: (a.fibra ?? 0) * f,
    sat: (a.sat ?? 0) * f,
  }
}

export function somar(x: Nutrientes, y: Nutrientes): Nutrientes {
  return {
    kcal: x.kcal + y.kcal,
    prot: x.prot + y.prot,
    gord: x.gord + y.gord,
    carb: x.carb + y.carb,
    fibra: x.fibra + y.fibra,
    sat: x.sat + y.sat,
  }
}
