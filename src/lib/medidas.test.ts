import { describe, expect, it } from 'vitest'
import { ALIMENTOS, buscarAlimentos } from './alimentos'
import { medidaPadrao, medidasIBGE } from './medidas'

describe('medidas do IBGE', () => {
  it('traz a colher de sopa de arroz cozido', () => {
    const arroz = ALIMENTOS.find((a) => a.nome === 'Arroz, tipo 1, cozido')!
    expect(medidasIBGE(arroz.id)).toContainEqual({ nome: 'Colher de sopa', gramas: 25, desc: 'Arroz cozido - colher de sopa cheia' })
  })

  it('abre o pão francês na unidade', () => {
    const pao = ALIMENTOS.find((a) => a.nome === 'Pão, trigo, francês')!
    const medidas = medidasIBGE(pao.id)
    expect(medidas[medidaPadrao(medidas)]).toMatchObject({ nome: 'Unidade', gramas: 50 })
  })

  it('não mede alimento cru que o IBGE só mede pronto', () => {
    const cru = ALIMENTOS.find((a) => a.nome === 'Arroz, tipo 1, cru')!
    expect(medidasIBGE(cru.id)).toEqual([])
    expect(medidaPadrao([])).toBe(-1)
  })

  it('mede purê de batata pela batata cozida', () => {
    expect(medidasIBGE(91)).toContainEqual({ nome: 'Colher de sopa de purê', gramas: 45, desc: 'Purê de batata - colher de sopa cheia' })
    expect(buscarAlimentos('pure batata')[0].id).toBe(91)
  })

  it('só aponta para alimentos que existem e com peso positivo', () => {
    const ids = new Set(ALIMENTOS.map((a) => a.id))
    for (const a of ALIMENTOS) for (const m of medidasIBGE(a.id)) expect(m.gramas).toBeGreaterThan(0)
    expect(ALIMENTOS.filter((a) => medidasIBGE(a.id).length).length).toBeGreaterThan(300)
    expect(ids.size).toBe(ALIMENTOS.length)
  })
})
