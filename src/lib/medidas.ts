import dados from '../data/medidas-ibge.json'

// Medida caseira de referência da POF 2008-2009 (IBGE), já ligada ao alimento da TACO.
// "desc" é a descrição que o IBGE usou para chegar ao peso, ex.: "Arroz cozido - colher de sopa cheia".
export interface MedidaIBGE {
  nome: string
  gramas: number
  desc: string
}

const tabela = dados as Record<string, MedidaIBGE[]>

// Alimentos de complementares.json usam as medidas do mesmo item do IBGE que um alimento da TACO.
// Tilápia: "Peixe de água doce", as mesmas do pintado grelhado (313) e cru (312).
const MESMAS_MEDIDAS: Record<number, number> = { 1001: 313, 1002: 312 }

export function medidasIBGE(alimentoId: number): MedidaIBGE[] {
  return tabela[String(MESMAS_MEDIDAS[alimentoId] ?? alimentoId)] ?? []
}

// Ordem de preferência para abrir o formulário já numa medida do dia a dia.
const PREFERIDAS = ['Unidade', 'Fatia', 'Filé', 'Bife', 'Colher de sopa', 'Concha', 'Copo americano', 'Colher de arroz/servir']

export function medidaPadrao(medidas: MedidaIBGE[]): number {
  for (const nome of PREFERIDAS) {
    const i = medidas.findIndex((m) => m.nome === nome)
    if (i >= 0) return i
  }
  return medidas.length ? 0 : -1
}
