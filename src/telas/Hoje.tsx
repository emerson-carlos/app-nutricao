import { useLiveQuery } from 'dexie-react-hooks'
import { Apple, ChevronLeft, ChevronRight, Coffee, Cookie, GlassWater, Minus, Moon, Plus, Soup, UtensilsCrossed, X, type LucideIcon } from 'lucide-react'
import { useState, type CSSProperties } from 'react'
import { calcularMetas } from '../lib/calc'
import { alimento, nutrientesDe, somar, ZERO, type Alimento, type Nutrientes } from '../lib/alimentos'
import { db, hojeISO, REFEICOES, type PerfilSalvo, type Refeicao, type Registro } from '../lib/db'
import { AdicionarAlimento } from './AdicionarAlimento'
import type { Avisar } from '../App'

const COPO_ML = 250

const ICONES: Record<Refeicao, LucideIcon> = {
  'Café da manhã': Coffee,
  'Lanche da manhã': Apple,
  Almoço: UtensilsCrossed,
  'Lanche da tarde': Cookie,
  Jantar: Soup,
  Ceia: Moon,
}

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
const fracao = (valor: number, meta: number) => Math.min(1, meta > 0 ? valor / meta : 0)

// Faixa de ±10% em volta da meta: as estimativas não têm precisão maior que isso.
function faixa(valor: number, meta: number): string {
  if (valor < meta * 0.9) return 'Abaixo da faixa'
  if (valor > meta * 1.1) return 'Acima da faixa'
  return 'Dentro da faixa'
}

function Barra({ valor, meta, classe }: { valor: number; meta: number; classe?: string }) {
  return (
    <div className={`barra ${classe ?? ''}`} aria-hidden="true">
      <span style={{ transform: `scaleX(${fracao(valor, meta)})` }} />
    </div>
  )
}

// Anel de calorias: o número no centro é o que falta (ou o que passou) da meta do dia.
function Anel({ valor, meta }: { valor: number; meta: number }) {
  const restam = meta - valor
  return (
    <div className="anel">
      <svg viewBox="0 0 148 148" aria-hidden="true">
        <circle className="anel-trilho" cx="74" cy="74" r="62" />
        <circle className="anel-progresso" cx="74" cy="74" r="62" pathLength="100" strokeDasharray="100" strokeDashoffset={100 - fracao(valor, meta) * 100} />
      </svg>
      <p className="anel-centro">
        <strong>{fmt(Math.abs(restam))}</strong>
        <span>{restam >= 0 ? 'kcal restantes' : 'kcal além da meta'}</span>
      </p>
    </div>
  )
}

interface Props {
  perfil: PerfilSalvo
  avisar: Avisar
}

export function Hoje({ perfil, avisar }: Props) {
  const [data, setData] = useState(hojeISO())
  const [adicionarEm, setAdicionarEm] = useState<Refeicao | null>(null)
  const registros = useLiveQuery(() => db.registros.where('data').equals(data).sortBy('criadoEm'), [data], [] as Registro[])
  const agua = useLiveQuery(() => db.agua.get(data), [data])
  const metas = calcularMetas(perfil)
  const discreto = perfil.modoDiscreto
  const ehHoje = data === hojeISO()

  // Um registro cujo alimento não existe mais (ex.: backup antigo) fica de fora em vez de quebrar a tela.
  const porRefeicao = new Map<Refeicao, { r: Registro; a: Alimento }[]>()
  let total: Nutrientes = ZERO
  for (const r of registros) {
    const a = alimento(r.alimentoId)
    if (!a) continue
    total = somar(total, nutrientesDe(a, r.gramas))
    porRefeicao.set(r.refeicao, [...(porRefeicao.get(r.refeicao) ?? []), { r, a }])
  }
  const aguaMl = agua?.ml ?? 0

  async function mudarAgua(delta: number) {
    const ml = Math.max(0, aguaMl + delta)
    await db.agua.put({ data, ml })
    avisar(`Água: ${(ml / 1000).toLocaleString('pt-BR')} L`)
  }

  async function remover(r: Registro) {
    await db.registros.delete(r.id!)
    avisar(`${alimento(r.alimentoId)?.nome ?? 'Alimento'} removido.`, () => db.registros.add(r))
  }

  const linhas: { nome: string; cor: string; valor: number; meta: number; tipo: 'meta' | 'minimo' | 'maximo' }[] = [
    { nome: 'Proteína', cor: 'var(--prot)', valor: total.prot, meta: metas.proteinaG, tipo: 'meta' },
    { nome: 'Carboidrato', cor: 'var(--carb)', valor: total.carb, meta: metas.carboidratoG, tipo: 'meta' },
    { nome: 'Gordura', cor: 'var(--gord)', valor: total.gord, meta: metas.gorduraG, tipo: 'meta' },
    { nome: 'Fibras', cor: 'var(--fibra)', valor: total.fibra, meta: metas.fibraG, tipo: 'minimo' },
    { nome: 'Gordura saturada', cor: 'var(--sat)', valor: total.sat, meta: metas.gorduraSaturadaMaxG, tipo: 'maximo' },
  ]

  return (
    <>
      <header className="cabecalho">
        <div className="dia">
          <h1>{nomeDoDia(data)}</h1>
          <small>{new Date(data + 'T12:00:00').toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' })}</small>
        </div>
        <button type="button" className="botao botao-icone botao-fantasma" aria-label="Dia anterior" onClick={() => setData(deslocarDia(data, -1))}>
          <ChevronLeft size={24} aria-hidden="true" />
        </button>
        <button type="button" className="botao botao-icone botao-fantasma" aria-label="Próximo dia" disabled={ehHoje} onClick={() => setData(deslocarDia(data, 1))}>
          <ChevronRight size={24} aria-hidden="true" />
        </button>
      </header>

      <section className="cartao" aria-labelledby="t-resumo">
        <h2 id="t-resumo" className="visualmente-oculto">
          Resumo do dia
        </h2>
        {discreto ? (
          <div className="discreto-linhas">
            <p>
              Calorias <span className="faixa">{faixa(total.kcal, metas.kcal)}</span>
            </p>
            <p>
              Proteína <span className="faixa">{total.prot >= metas.proteinaG * 0.9 ? 'Meta atingida' : 'Ainda falta um pouco'}</span>
            </p>
          </div>
        ) : (
          <>
            <div className="resumo-topo">
              <Anel valor={total.kcal} meta={metas.kcal} />
              <dl className="resumo-numeros">
                <div>
                  <dt>Consumido</dt>
                  <dd>{fmt(total.kcal)} kcal</dd>
                </div>
                <div>
                  <dt>Meta do dia</dt>
                  <dd>{fmt(metas.kcal)} kcal</dd>
                </div>
              </dl>
            </div>
            <div className="nutrientes">
              {linhas.map((l) => (
                <div className="nutriente" key={l.nome} style={{ '--cor': l.cor } as CSSProperties}>
                  <p className="rotulo">
                    <span>{l.nome}</span>
                    <span>
                      {fmt(l.valor)} {l.tipo === 'minimo' ? 'de pelo menos' : l.tipo === 'maximo' ? 'de no máximo' : 'de'} {fmt(l.meta)} g
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
        <div className="agua-topo">
          <h2 id="t-agua">
            <GlassWater size={22} aria-hidden="true" />
            Água
          </h2>
          <p>
            {discreto ? (
              <>
                <strong>{Math.round(aguaMl / COPO_ML)}</strong> de {Math.round(metas.aguaBeberMl / COPO_ML)} copos
              </>
            ) : (
              <>
                <strong>{(aguaMl / 1000).toLocaleString('pt-BR')} L</strong> de {(metas.aguaBeberMl / 1000).toLocaleString('pt-BR')} L
              </>
            )}
          </p>
        </div>
        <Barra valor={aguaMl} meta={metas.aguaBeberMl} classe="agua" />
        <div className="agua-linha">
          <button type="button" className="botao botao-icone" aria-label="Tirar um copo de água" disabled={aguaMl === 0} onClick={() => mudarAgua(-COPO_ML)}>
            <Minus size={22} aria-hidden="true" />
          </button>
          <button type="button" className="botao botao-agua" onClick={() => mudarAgua(COPO_ML)}>
            <Plus size={20} aria-hidden="true" />1 copo (250 ml)
          </button>
        </div>
      </section>

      <section className="cartao" aria-labelledby="t-refeicoes">
        <h2 id="t-refeicoes">Refeições</h2>
        <ul className="refeicoes">
          {REFEICOES.map((ref) => {
            const itens = porRefeicao.get(ref) ?? []
            const kcal = itens.reduce((s, { r, a }) => s + nutrientesDe(a, r.gramas).kcal, 0)
            const Icone = ICONES[ref]
            return (
              <li className="refeicao" key={ref}>
                <div className="refeicao-topo">
                  <span className="refeicao-icone" aria-hidden="true">
                    <Icone size={20} />
                  </span>
                  <div className="refeicao-titulo">
                    <h3>{ref}</h3>
                    <small>{itens.length === 0 ? 'Nada registrado' : discreto ? `${itens.length} ${itens.length === 1 ? 'item' : 'itens'}` : `${fmt(kcal)} kcal`}</small>
                  </div>
                  <button type="button" className="botao botao-icone botao-suave" onClick={() => setAdicionarEm(ref)} aria-label={`Adicionar alimento em ${ref}`}>
                    <Plus size={22} aria-hidden="true" />
                  </button>
                </div>
                {itens.length > 0 && (
                  <ul className="itens">
                    {itens.map(({ r, a }) => {
                      const porcao = r.medida ? `${r.medida.quantidade.toLocaleString('pt-BR')} × ${r.medida.nome} (${fmt(r.gramas)} g)` : `${fmt(r.gramas)} g`
                      return (
                        <li key={r.id}>
                          <span className="item-texto">
                            {a.nome}
                            <small>
                              {porcao}
                              {!discreto && `, ${fmt(nutrientesDe(a, r.gramas).kcal)} kcal`}
                            </small>
                          </span>
                          <button type="button" className="botao botao-icone botao-fantasma" aria-label={`Remover ${a.nome}`} onClick={() => remover(r)}>
                            <X size={20} aria-hidden="true" />
                          </button>
                        </li>
                      )
                    })}
                  </ul>
                )}
              </li>
            )
          })}
        </ul>
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
