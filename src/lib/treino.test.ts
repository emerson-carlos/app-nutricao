import { describe, expect, it } from 'vitest'
import { aguaExtraMl, descreverExercicio, gastoTreino, metEsteira } from './treino'

describe('esteira', () => {
  it('usa a faixa do Compendium sem inclinação', () => {
    expect(metEsteira(5)).toBe(3.8) // 3,1 mph: faixa 3,0 a 3,4 mph
    expect(metEsteira(4.8)).toBe(3.5) // 2,98 mph ainda está na faixa 2,5 a 2,9
    expect(metEsteira(6)).toBe(4.8)
    expect(metEsteira(8.5)).toBe(8.3)
  })

  it('soma a inclinação pela equação do ACSM', () => {
    // 5 km/h = 83,3 m/min; 5% → 1,8 × 83,3 × 0,05 / 3,5 ≈ 2,14 MET a mais
    expect(metEsteira(5, 5)).toBeCloseTo(5.94, 1)
  })

  it('acima de 8,9 km/h usa a equação de corrida', () => {
    // 10 km/h = 166,7 m/min → (3,5 + 33,3) / 3,5 ≈ 10,5
    expect(metEsteira(10)).toBeCloseTo(10.5, 1)
  })

  it('conta só o gasto extra do exemplo do plano', () => {
    // 5 km/h por 30 min, 70 kg: (3,8 − 1) × 70 × 0,5 = 98 kcal
    expect(gastoTreino({ tipo: 'esteira', minutos: 30, velocidadeKmh: 5 }, 70)).toBeCloseTo(98)
  })
})

describe('calistenia', () => {
  it('gasta pouco, como o plano avisa', () => {
    const kcal = gastoTreino({ tipo: 'calistenia', minutos: 30, intensidade: 'moderada' }, 80)
    expect(kcal).toBeCloseTo(112) // (3,8 − 1) × 80 × 0,5
  })
})

describe('água e textos', () => {
  it('soma cerca de 600 ml por hora, de 50 em 50', () => {
    expect(aguaExtraMl(60)).toBe(600)
    expect(aguaExtraMl(30)).toBe(300)
    expect(aguaExtraMl(25)).toBe(250)
  })

  it('descreve séries e repetições', () => {
    expect(descreverExercicio({ nome: 'Flexão', series: 3, repeticoes: 10 })).toBe('Flexão: 3 × 10')
    expect(descreverExercicio({ nome: 'Prancha' })).toBe('Prancha')
  })
})
