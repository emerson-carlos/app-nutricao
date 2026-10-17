import Dexie, { type EntityTable } from 'dexie'
import type { Perfil } from './calc'

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

export interface PerfilSalvo extends Perfil {
  id: 'eu'
  atualizadoEm: number
}

export const db = new Dexie('app-nutricao') as Dexie & {
  perfil: EntityTable<PerfilSalvo, 'id'>
  registros: EntityTable<Registro, 'id'>
  agua: EntityTable<Agua, 'data'>
  medidas: EntityTable<Medida, 'id'>
}

db.version(1).stores({
  perfil: 'id',
  registros: '++id, data, alimentoId',
  agua: 'data',
  medidas: '++id, alimentoId',
})

export function hojeISO(d = new Date()): string {
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000)
  return local.toISOString().slice(0, 10)
}

export async function exportarBackup(): Promise<string> {
  const [perfil, registros, agua, medidas] = await Promise.all([
    db.perfil.toArray(),
    db.registros.toArray(),
    db.agua.toArray(),
    db.medidas.toArray(),
  ])
  return JSON.stringify({ app: 'app-nutricao', versao: 1, exportadoEm: new Date().toISOString(), perfil, registros, agua, medidas })
}

export async function importarBackup(texto: string): Promise<void> {
  const dados = JSON.parse(texto)
  if (dados?.app !== 'app-nutricao') throw new Error('Este arquivo não é um backup do app.')
  await db.transaction('rw', [db.perfil, db.registros, db.agua, db.medidas], async () => {
    await Promise.all([db.perfil.clear(), db.registros.clear(), db.agua.clear(), db.medidas.clear()])
    await db.perfil.bulkPut(dados.perfil ?? [])
    await db.registros.bulkPut(dados.registros ?? [])
    await db.agua.bulkPut(dados.agua ?? [])
    await db.medidas.bulkPut(dados.medidas ?? [])
  })
}
