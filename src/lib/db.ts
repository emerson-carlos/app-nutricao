import Dexie, { type EntityTable } from 'dexie'
import type { Alimento } from './alimentos'
import type { Perfil } from './calc'
import type { TipoTreino, Treino } from './treino'

export const REFEICOES = ['Café da manhã', 'Lanche da manhã', 'Almoço', 'Lanche da tarde', 'Jantar', 'Ceia'] as const
export type Refeicao = (typeof REFEICOES)[number]

export interface Registro {
  id?: number
  data: string // AAAA-MM-DD
  refeicao: Refeicao
  alimentoId: number
  gramas: number
  // Como a porção foi informada, para mostrar do jeito que você digitou.
  medida?: { nome: string; quantidade: number }
  criadoEm: number
}

export interface Agua {
  data: string
  ml: number
}

// Medida caseira de um alimento (ex.: 1 colher de sopa de arroz = 25 g).
export interface Medida {
  id?: number
  alimentoId: number
  nome: string
  gramas: number
  fonte: string
}

// Alimento cadastrado por você a partir do rótulo. Guardado por 100 g, como os da TACO.
// O id é um número grande (Date.now()) para nunca coincidir com os ids da TACO.
export interface AlimentoProprio extends Alimento {
  criadoEm: number
}

// Plano da semana: o que você pretende treinar em cada dia (0 = domingo). Sem tipos = descanso.
export interface DiaDoPlano {
  dia: number
  tipos: TipoTreino[]
}

export interface PerfilSalvo extends Perfil {
  id: 'eu'
  atualizadoEm: number
}

export const db = new Dexie('app-nutricao') as Dexie & {
  perfil: EntityTable<PerfilSalvo, 'id'>
  registros: EntityTable<Registro, 'id'>
  agua: EntityTable<Agua, 'data'>
  medidas: EntityTable<Medida, 'id'>
  alimentosProprios: EntityTable<AlimentoProprio, 'id'>
  treinos: EntityTable<Treino, 'id'>
  plano: EntityTable<DiaDoPlano, 'dia'>
}

db.version(1).stores({
  perfil: 'id',
  registros: '++id, data, alimentoId',
  agua: 'data',
  medidas: '++id, alimentoId',
})

db.version(2).stores({
  alimentosProprios: 'id, nome',
})

db.version(3).stores({
  treinos: '++id, data',
  plano: 'dia',
})

export function hojeISO(d = new Date()): string {
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000)
  return local.toISOString().slice(0, 10)
}

export function deslocarDia(data: string, dias: number): string {
  const d = new Date(data + 'T12:00:00')
  d.setDate(d.getDate() + dias)
  return hojeISO(d)
}

export async function exportarBackup(): Promise<string> {
  const [perfil, registros, agua, medidas, alimentosProprios, treinos, plano] = await Promise.all([
    db.perfil.toArray(),
    db.registros.toArray(),
    db.agua.toArray(),
    db.medidas.toArray(),
    db.alimentosProprios.toArray(),
    db.treinos.toArray(),
    db.plano.toArray(),
  ])
  return JSON.stringify({ app: 'app-nutricao', versao: 3, exportadoEm: new Date().toISOString(), perfil, registros, agua, medidas, alimentosProprios, treinos, plano })
}

export async function importarBackup(texto: string): Promise<void> {
  const dados = JSON.parse(texto)
  if (dados?.app !== 'app-nutricao') throw new Error('Este arquivo não é um backup do app.')
  const tabelas = [db.perfil, db.registros, db.agua, db.medidas, db.alimentosProprios, db.treinos, db.plano]
  await db.transaction('rw', tabelas, async () => {
    await Promise.all(tabelas.map((t) => t.clear()))
    await db.perfil.bulkPut(dados.perfil ?? [])
    await db.registros.bulkPut(dados.registros ?? [])
    await db.agua.bulkPut(dados.agua ?? [])
    await db.medidas.bulkPut(dados.medidas ?? [])
    await db.alimentosProprios.bulkPut(dados.alimentosProprios ?? [])
    await db.treinos.bulkPut(dados.treinos ?? [])
    await db.plano.bulkPut(dados.plano ?? [])
  })
}
