import { describe, expect, it } from 'vitest'
import { CHAVES_GUIA, descreverPorcao, EXEMPLOS, fontesDe, montar } from './guia'

describe('guia de alimentos', () => {
  it('acha a porção de todos os alimentos da lista', () => {
    for (const c of CHAVES_GUIA) expect(fontesDe(c).length).toBeGreaterThan(8)
  })

  it('ordena pelo nutriente, do maior para o menor', () => {
    const prot = fontesDe('prot')
    expect(prot[0].n.prot).toBeGreaterThanOrEqual(prot[prot.length - 1].n.prot)
  })

  it('escreve a porção no plural', () => {
    expect(descreverPorcao('Colher de sopa', 3)).toBe('3 colheres de sopa')
    expect(descreverPorcao('Unidade', 2)).toBe('2 unidades')
    expect(descreverPorcao('Porção', 2)).toBe('2 porções')
    expect(descreverPorcao('Filé', 1)).toBe('1 filé')
  })

  it('monta os pratos de exemplo com todos os itens', () => {
    for (const [k, v] of Object.entries(EXEMPLOS)) {
      const { itens, total } = montar(v)
      expect(itens.length, k).toBe(v.length)
      console.log(k, Math.round(total.kcal), 'kcal', Math.round(total.prot), 'g prot', Math.round(total.carb), 'carb', Math.round(total.fibra), 'fibra', total.sat.toFixed(1), 'sat')
    }
  })
})
