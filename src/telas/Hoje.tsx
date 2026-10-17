import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { calcularMetas } from '../lib/calc'
import { alimento, nutrientesDe, somar, ZERO, type Nutrientes } from '../lib/alimentos'
import { db, hojeISO, REFEICOES, type PerfilSalvo, type Refeicao, type Registro } from '../lib/db'
import { AdicionarAlimento } from './AdicionarAlimento'

const COPO_ML = 250

function deslocarDia(data: string, dias: number): string {
  const d = new Date(data + 'T12:00:00')
  d.setDate(d.getDate() + dias)
  return hojeISO(d)
}

function nomeDoDia(data: string): string {
  const hoje = hojeISO()
  if (data === hoje) return 'Hoje'
  if (data === deslocarDia(hoje, -1)) return 'Ontem'
  return new Date(data + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long' })
}

const fmt = (n: number) => Math.round(n).toLocaleString('pt-BR')
const pct = (valor: number, meta: number) => `${Math.min(100, meta > 0 ? (valor / meta) * 100 : 0)}%`

// Faixa de ±10% em volta da meta: as estimativas não têm precisão maior que isso.
function faixa(valor: number, meta: number): string {
  if (valor < meta * 0.9) return 'Abaixo da faixa'
  if (valor > meta * 1.1) return 'Acima da faixa'
  return 'Dentro da faixa'
}

function Barra({ valor, meta, classe }: { valor: number; meta: number; classe?: string }) {
  return (
    <div className={`barra ${classe ?? ''}`} aria-hidden="true">
      <span style={{ width: pct(valor, meta) }} />
    </div>
  )
}

interface Props {
  perfil: PerfilSalvo
  avisar: (texto: string) => void
}

export function Hoje({ perfil, avisar }: Props) {
  const [data, setData] = useState(hojeISO())
  const [adicionarEm, setAdicionarEm] = useState<Refeicao | null>(null)
  const registros = useLiveQuery(() => db.registros.where('data').equals(data).sortBy('criadoEm'), [data], [] as Registro[])
  const agua = useLiveQuery(() => db.agua.get(data), [data])
  const metas = calcularMetas(perfil)
  const discreto = perfil.modoDiscreto
  const ehHoje = data === hojeISO()

  const porRefeicao = new Map<Refeicao, Registro[]>()
  let total: Nutrientes = ZERO
  for (const r of registros) {
    const a = alimento(r.alimentoId)
    if (!a) continue
    total = somar(total, nutrientesDe(a, r.gramas))
    porRefeicao.set(r.refeicao, [...(porRefeicao.get(r.refeicao) ?? []), r])
  }
  const aguaMl = agua?.ml ?? 0
  const restam = metas.kcal - total.kcal

  async function mudarAgua(delta: number) {
    const ml = Math.max(0, aguaMl + delta)
    await db.agua.put({ data, ml })
    avisar(`Água: ${(ml / 1000).toLocaleString('pt-BR')} L`)
  }

  async function remover(r: Registro) {
    await db.registros.delete(r.id!)
    avisar(`${alimento(r.alimentoId)?.nome ?? 'Alimento'} removido.`)
  }

  const linhas: { nome: string; valor: number; meta: number; unidade: string; tipo: 'meta' | 'minimo' | 'maximo' }[] = [
    { nome: 'Proteína', valor: total.prot, meta: metas.proteinaG, unidade: 'g', tipo: 'meta' },
    { nome: 'Carboidrato', valor: total.carb, meta: metas.carboidratoG, unidade: 'g', tipo: 'meta' },
    { nome: 'Gordura', valor: total.gord, meta: metas.gorduraG, unidade: 'g', tipo: 'meta' },
    { nome: 'Fibras', valor: total.fibra, meta: metas.fibraG, unidade: 'g', tipo: 'minimo' },
    { nome: 'Gordura saturada', valor: total.sat, meta: metas.gorduraSaturadaMaxG, unidade: 'g', tipo: 'maximo' },
  ]

  return (
    <>
      <header className="cabecalho">
        <button type="button" className="botao botao-icone" aria-label="Dia anterior" onClick={() => setData(deslocarDia(data, -1))}>
          ‹
        </button>
        <div className="dia">
          <h1>{nomeDoDia(data)}</h1>
          <small>{new Date(data + 'T12:00:00').toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' })}</small>
        </div>
        <button
          type="button"
          className="botao botao-icone"
          aria-label="Próximo dia"
          disabled={ehHoje}
          style={ehHoje ? { visibility: 'hidden' } : undefined}
          onClick={() => setData(deslocarDia(data, 1))}
        >
          ›
        </button>
      </header>

      <section className="cartao" aria-labelledby="t-resumo">
        <h2 id="t-resumo">Resumo do dia</h2>
        {discreto ? (
          <p>
            Calorias: <span className="faixa">{faixa(total.kcal, metas.kcal)}</span>
            <br />
            Proteína: <span className="faixa">{total.prot >= metas.proteinaG * 0.9 ? 'Meta atingida' : 'Ainda falta um pouco'}</span>
          </p>
        ) : (
          <>
            <p className="restante">
              <strong>{fmt(Math.abs(restam))}</strong>
              <span>{restam >= 0 ? 'kcal restantes' : 'kcal além da meta'}</span>
            </p>
            <Barra valor={total.kcal} meta={metas.kcal} />
            <p className="ajuda" style={{ marginTop: 6, color: 'var(--tinta-suave)' }}>
              {fmt(total.kcal)} de {fmt(metas.kcal)} kcal
            </p>
            <div className="nutrientes">
              {linhas.map((l) => (
                <div className="nutriente" key={l.nome}>
                  <p className="rotulo">
                    <span>{l.nome}</span>
                    <span>
                      {fmt(l.valor)} {l.tipo === 'minimo' ? 'de pelo menos' : l.tipo === 'maximo' ? 'de no máximo' : 'de'} {fmt(l.meta)} {l.unidade}
                    </span>
                  </p>
                  <Barra valor={l.valor} meta={l.meta} />
                </div>
              ))}
            </div>
          </>
        )}
      </section>

      <section className="cartao" aria-labelledby="t-agua">
        <h2 id="t-agua">Água</h2>
        <p>
          {discreto
            ? `${Math.round(aguaMl / COPO_ML)} de ${Math.round(metas.aguaBeberMl / COPO_ML)} copos`
            : `${(aguaMl / 1000).toLocaleString('pt-BR')} de ${(metas.aguaBeberMl / 1000).toLocaleString('pt-BR')} L (cerca de ${Math.round(metas.aguaBeberMl / COPO_ML)} copos de 250 ml)`}
        </p>
        <div style={{ marginTop: 8 }}>
          <Barra valor={aguaMl} meta={metas.aguaBeberMl} classe="agua" />
        </div>
        <div className="agua-linha">
          <button type="button" className="botao botao-icone" aria-label="Tirar um copo de água" disabled={aguaMl === 0} onClick={() => mudarAgua(-COPO_ML)}>
            −
          </button>
          <button type="button" className="botao botao-agua" onClick={() => mudarAgua(COPO_ML)}>
            + 1 copo (250 ml)
          </button>
        </div>
      </section>

      <section className="cartao" aria-labelledby="t-refeicoes">
        <h2 id="t-refeicoes">Refeições</h2>
        {REFEICOES.map((ref) => {
          const itens = porRefeicao.get(ref) ?? []
          const kcal = itens.reduce((s, r) => s + nutrientesDe(alimento(r.alimentoId)!, r.gramas).kcal, 0)
          return (
            <div className="refeicao" key={ref}>
              <div className="refeicao-topo">
                <div>
                  <h3>{ref}</h3>
                  {itens.length > 0 && !discreto && <small>{fmt(kcal)} kcal</small>}
                </div>
                <button type="button" className="botao" onClick={() => setAdicionarEm(ref)} aria-label={`Adicionar alimento em ${ref}`}>
                  + Adicionar
                </button>
              </div>
              {itens.length > 0 && (
                <ul className="itens">
                  {itens.map((r) => {
                    const a = alimento(r.alimentoId)!
                    const porcao = r.medida ? `${r.medida.quantidade.toLocaleString('pt-BR')} × ${r.medida.nome} (${fmt(r.gramas)} g)` : `${fmt(r.gramas)} g`
                    return (
                      <li key={r.id}>
                        <span className="item-texto">
                          {a.nome}
                          <small>
                            {porcao}
                            {!discreto && ` · ${fmt(nutrientesDe(a, r.gramas).kcal)} kcal`}
                          </small>
                        </span>
                        <button type="button" className="botao botao-icone" aria-label={`Remover ${a.nome}`} onClick={() => remover(r)}>
                          ×
                        </button>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>
          )
        })}
      </section>

      {adicionarEm && (
        <AdicionarAlimento
          data={data}
          refeicao={adicionarEm}
          discreto={discreto}
          aoFechar={() => setAdicionarEm(null)}
          avisar={avisar}
        />
      )}
    </>
  )
}
