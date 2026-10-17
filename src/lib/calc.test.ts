import { describe, expect, it } from 'vitest'
import { calcularMetas, idadeEmAnos, metabolismoBasal, type Perfil } from './calc'

const hoje = new Date('2026-10-17T12:00:00')

describe('idadeEmAnos', () => {
  it('conta o aniversário só quando ele já passou', () => {
    expect(idadeEmAnos('1996-10-17', hoje)).toBe(30)
    expect(idadeEmAnos('1996-10-18', hoje)).toBe(29)
  })
})

describe('metabolismoBasal (Mifflin-St Jeor)', () => {
  it('bate com a fórmula publicada', () => {
    // 10*70 + 6,25*175 - 5*30 + 5 = 1648,75
    expect(metabolismoBasal('masculino', 70, 175, 30)).toBeCloseTo(1648.75)
    // 10*60 + 6,25*165 - 5*30 - 161 = 1320,25
    expect(metabolismoBasal('feminino', 60, 165, 30)).toBeCloseTo(1320.25)
  })
})

describe('calcularMetas', () => {
  const base: Perfil = {
    sexo: 'masculino',
    nascimento: '1996-01-01',
    alturaCm: 175,
    pesoKg: 70,
    objetivo: 'perder',
    modoDiscreto: false,
  }

  it('aplica déficit para perder gordura', () => {
    const m = calcularMetas(base, hoje)
    expect(m.basal).toBe(1649)
    expect(m.gastoBase).toBe(1979)
    expect(m.kcal).toBe(1682)
    expect(m.proteinaG).toBe(140)
  })

  it('fecha as calorias com proteína, gordura e carboidrato', () => {
    const m = calcularMetas(base, hoje)
    const total = m.proteinaG * 4 + m.gorduraG * 9 + m.carboidratoG * 4
    expect(Math.abs(total - m.kcal)).toBeLessThan(15)
  })

  it('nunca fica abaixo do metabolismo basal', () => {
    const m = calcularMetas({ ...base, pesoKg: 45, alturaCm: 150 }, hoje)
    expect(m.kcal).toBeGreaterThanOrEqual(m.basal)
  })

  it('muda as metas quando o objetivo muda', () => {
    const perder = calcularMetas(base, hoje)
    const ganhar = calcularMetas({ ...base, objetivo: 'ganhar' }, hoje)
    expect(ganhar.kcal).toBeGreaterThan(perder.kcal)
  })

  it('usa a referência de água da EFSA', () => {
    expect(calcularMetas(base, hoje).aguaBeberMl).toBe(2000)
    expect(calcularMetas({ ...base, sexo: 'feminino' }, hoje).aguaBeberMl).toBe(1600)
  })
})
