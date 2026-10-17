import { describe, expect, it } from 'vitest'
import { alimento, alimentoDoRotulo, buscarAlimentos, GRUPO_PROPRIO, registrarProprios } from './alimentos'

describe('alimento pelo rótulo', () => {
  // Rótulo típico de whey: porção de 30 g com 120 kcal e 24 g de proteína.
  const whey = alimentoDoRotulo({ nome: ' Whey baunilha ', porcaoG: 30, kcal: 120, prot: 24, carb: 3, gord: 1.5, sat: 0.9, fibra: 0, sodio: 60 }, 1_700_000_000_000)

  it('converte a porção para 100 g', () => {
    expect(whey).toMatchObject({ nome: 'Whey baunilha', grupo: GRUPO_PROPRIO, kcal: 400, prot: 80, carb: 10, gord: 5, sat: 3, sodio: 200 })
  })

  it('entra na busca e no cálculo depois de registrado', () => {
    registrarProprios([whey])
    expect(alimento(whey.id)?.nome).toBe('Whey baunilha')
    expect(buscarAlimentos('whey')[0].id).toBe(whey.id)
    registrarProprios([])
    expect(alimento(whey.id)).toBeUndefined()
    expect(alimento(1)?.nome).toBe('Arroz, integral, cozido')
  })
})
