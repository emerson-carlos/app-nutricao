import { alimento, nutrientesDe, somar, ZERO, type Nutrientes } from './alimentos'
import { medidasIBGE } from './medidas'

// Alimentos do dia a dia, cada um numa porção caseira do IBGE. Os números vêm da TACO;
// nada aqui é digitado à mão além de qual alimento e qual porção mostrar.
type Porcao = [id: number, medida: string, quantidade?: number]

const FONTES: Record<'prot' | 'carb' | 'fibra' | 'sat', Porcao[]> = {
  prot: [
    [410, 'Filé'],
    [377, 'Bife'],
    [317, 'Filé'],
    [301, 'Filé'],
    [326, 'Colher de arroz/servir'],
    [488, 'Unidade', 2],
    [277, 'Colher de sopa', 3],
    [461, 'Fatia'],
    [448, 'Copo americano'],
    [459, 'Colher de sopa', 2],
    [561, 'Concha'],
    [577, 'Concha'],
    [584, 'Fatia', 3],
  ],
  carb: [
    [3, 'Escumadeira'],
    [53, 'Unidade'],
    [88, 'Fatia', 2],
    [129, 'Colher de arroz/servir', 2],
    [91, 'Unidade'],
    [533, 'Porção'],
    [7, 'Colher de sopa', 3],
    [182, 'Unidade'],
    [561, 'Concha'],
    [62, 'Colher de arroz/servir', 2],
  ],
  fibra: [
    [561, 'Concha'],
    [577, 'Concha'],
    [200, 'Unidade'],
    [163, 'Colher de sopa', 2],
    [7, 'Colher de sopa', 3],
    [594, 'Colher de sopa'],
    [1, 'Escumadeira'],
    [52, 'Fatia', 2],
    [100, 'Pires'],
    [222, 'Unidade'],
    [226, 'Pedaço'],
    [109, 'Unidade'],
    [182, 'Unidade'],
  ],
  sat: [
    [381, 'Bife'],
    [261, 'Colher de chá'],
    [422, 'Gomo'],
    [467, 'Fatia', 2],
    [463, 'Fatia', 2],
    [443, 'Fatia', 2],
    [495, 'Porção'],
    [447, 'Colher de sopa'],
    [459, 'Colher de sopa', 2],
    [468, 'Colher de sopa'],
    [590, 'Pedaço'],
    [346, 'Bife'],
  ],
}

// "2 colher de sopa" vira "2 colheres de sopa": só a primeira palavra vai para o plural.
export function descreverPorcao(medida: string, quantidade: number): string {
  const [primeira, ...resto] = medida.toLowerCase().split(' ')
  const plural = quantidade === 1 ? primeira : primeira.endsWith('ão') ? primeira.slice(0, -2) + 'ões' : /[rz]$/.test(primeira) ? primeira + 'es' : primeira + 's'
  return [String(quantidade).replace('.', ','), plural, ...resto].join(' ')
}

// Pratos de exemplo montados com a regra de cada refeição. Os totais são calculados.
export const EXEMPLOS: Record<'cafe' | 'almoco' | 'lanche' | 'jantar', Porcao[]> = {
  cafe: [
    [53, 'Unidade'],
    [488, 'Unidade', 2],
    [461, 'Fatia'],
    [456, 'Colher de sopa', 2],
    [182, 'Unidade'],
  ],
  almoco: [
    [3, 'Escumadeira'],
    [561, 'Concha'],
    [410, 'Filé'],
    [100, 'Pires'],
    [109, 'Unidade'],
  ],
  lanche: [
    [448, 'Copo americano'],
    [456, 'Colher de sopa', 2],
    [226, 'Pedaço'],
  ],
  jantar: [
    [88, 'Fatia', 2],
    [377, 'Bife'],
    [100, 'Pires'],
    [157, 'Unidade'],
  ],
}

export function montar(porcoes: Porcao[]): { itens: Sugestao[]; total: Nutrientes } {
  const itens = porcoes.flatMap(([id, medida, quantidade = 1]) => {
    const a = alimento(id)
    const m = medidasIBGE(id).find((x) => x.nome === medida)
    if (!a || !m) return []
    const gramas = m.gramas * quantidade
    return [{ id, nome: a.nome, porcao: `${descreverPorcao(medida, quantidade)} (${Math.round(gramas)} g)`, gramas, n: nutrientesDe(a, gramas) }]
  })
  return { itens, total: itens.reduce((t, i) => somar(t, i.n), ZERO) }
}

export interface Sugestao {
  id: number
  nome: string
  porcao: string
  gramas: number
  n: Nutrientes
}

export function fontesDe(chave: keyof typeof FONTES): Sugestao[] {
  return FONTES[chave]
    .flatMap(([id, medida, quantidade = 1]) => {
      const a = alimento(id)
      const m = medidasIBGE(id).find((x) => x.nome === medida)
      if (!a || !m) return []
      const gramas = m.gramas * quantidade
      return [{ id, nome: a.nome, porcao: `${descreverPorcao(medida, quantidade)} (${Math.round(gramas)} g)`, gramas, n: nutrientesDe(a, gramas) }]
    })
    .sort((x, y) => y.n[chave] - x.n[chave])
}

export const CHAVES_GUIA = ['prot', 'carb', 'fibra', 'sat'] as const
