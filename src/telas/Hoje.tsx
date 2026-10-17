import { useLiveQuery } from 'dexie-react-hooks'
import { Apple, ChevronDown, ChevronLeft, ChevronRight, Coffee, Cookie, GlassWater, Minus, Moon, Plus, Soup, UtensilsCrossed, X, type LucideIcon } from 'lucide-react'
import { useState, type CSSProperties } from 'react'
import { calcularMetas } from '../lib/calc'
import { alimento, nutrientesDe, somar, ZERO, type Alimento, type Nutrientes } from '../lib/alimentos'
import { db, deslocarDia, hojeISO, REFEICOES, type PerfilSalvo, type Refeicao, type Registro } from '../lib/db'
import { aguaExtraMl, gastoTreino, type Treino } from '../lib/treino'
import { AdicionarAlimento } from './AdicionarAlimento'
import type { Avisar } from '../App'

// Tamanhos de copo mais comuns. O último escolhido fica salvo neste aparelho.
const COPOS = [200, 250, 300, 400, 500]
const OUTRO = 0

function lerCopo(): number {
  try {
    const v = Number(localStorage.getItem('copo-ml'))
    return v > 0 ? v : 250
  } catch {
    return 250
  }
}

function salvarCopo(ml: number) {
  try {
    localStorage.setItem('copo-ml', String(ml))
  } catch {
    // sem armazenamento (aba anônima): só não lembra o tamanho
  }
}

const ICONES: Record<Refeicao, LucideIcon> = {
  'Café da manhã': Coffee,
  'Lanche da manhã': Apple,
  Almoço: UtensilsCrossed,
  'Lanche da tarde': Cookie,
  Jantar: Soup,
  Ceia: Moon,
}

function nomeDoDia(data: string): string {
  const hoje = hojeISO()
  if (data === hoje) return 'Hoje'
  if (data === deslocarDia(hoje, -1)) return 'Ontem'
  return new Date(data + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long' })
}

const fmt = (n: number) => Math.round(n).toLocaleString('pt-BR')
const fmt1 = (n: number) => n.toLocaleString('pt-BR', { maximumFractionDigits: 1 })
const fracao = (valor: number, meta: number) => Math.min(1, meta > 0 ? valor / meta : 0)

// Faixa de ±10% em volta da meta: as estimativas não têm precisão maior que isso.
function faixa(valor: number, meta: number): string {
  if (valor < meta * 0.9) return 'Abaixo da faixa'
  if (valor > meta * 1.1) return 'Acima da faixa'
  return 'Dentro da faixa'
}

// Saldo em palavras neutras: abaixo do gasto é o déficit planejado, acima não é erro.
function Saldo({ saldo }: { saldo: number }) {
  if (Math.abs(saldo) < 1) return <>Igual ao gasto</>
  return (
    <>
      {fmt(Math.abs(saldo))} kcal<small>{saldo < 0 ? 'abaixo do gasto' : 'acima do gasto'}</small>
    </>
  )
}

function kcalDe(r: Registro): number {
  const a = alimento(r.alimentoId)
  return a ? nutrientesDe(a, r.gramas).kcal : 0
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
  const treinos = useLiveQuery(() => db.treinos.where('data').equals(data).toArray(), [data], [] as Treino[])
  // Os 7 dias antes do dia aberto, para a média da semana (o dia em andamento puxaria a média para baixo).
  const anteriores = useLiveQuery(
    async () => {
      const inicio = deslocarDia(data, -7)
      const fim = deslocarDia(data, -1)
      const [regs, trs] = await Promise.all([
        db.registros.where('data').between(inicio, fim, true, true).toArray(),
        db.treinos.where('data').between(inicio, fim, true, true).toArray(),
      ])
      return { regs, trs }
    },
    [data],
    { regs: [] as Registro[], trs: [] as Treino[] },
  )
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
  const treinoKcal = treinos.reduce((s, t) => s + gastoTreino(t, perfil.pesoKg), 0)
  const aguaExtra = aguaExtraMl(treinos.reduce((s, t) => s + t.minutos, 0))
  const metaAgua = metas.aguaBeberMl + aguaExtra
  const gastoDia = metas.gastoBase + treinoKcal

  // Média só dos dias com refeição registrada: dia sem registro não quer dizer dia sem comer.
  const comidoPorDia = new Map<string, number>()
  for (const r of anteriores.regs) comidoPorDia.set(r.data, (comidoPorDia.get(r.data) ?? 0) + kcalDe(r))
  const diasMedia = [...comidoPorDia.keys()]
  const mediaComido = diasMedia.reduce((s, d) => s + comidoPorDia.get(d)!, 0) / (diasMedia.length || 1)
  const mediaGasto =
    metas.gastoBase + anteriores.trs.filter((t) => comidoPorDia.has(t.data)).reduce((s, t) => s + gastoTreino(t, perfil.pesoKg), 0) / (diasMedia.length || 1)
  const [copo, setCopo] = useState(lerCopo)
  const [modoOutro, setModoOutro] = useState(() => !COPOS.includes(lerCopo()))
  const [outro, setOutro] = useState(() => String(lerCopo()))
  const opcaoCopo = modoOutro ? OUTRO : copo
  const copoMl = modoOutro ? Number(outro) || 0 : copo

  function escolherCopo(ml: number) {
    if (ml === OUTRO) {
      setModoOutro(true)
      setOutro(String(copo))
      return
    }
    setModoOutro(false)
    setCopo(ml)
    salvarCopo(ml)
  }

  async function mudarAgua(delta: number) {
    const ml = Math.max(0, aguaMl + delta)
    await db.agua.put({ data, ml })
    avisar(`Água: ${(ml / 1000).toLocaleString('pt-BR')} L`)
  }

  async function remover(r: Registro) {
    await db.registros.delete(r.id!)
    avisar(`${alimento(r.alimentoId)?.nome ?? 'Alimento'} removido.`, () => db.registros.add(r))
  }

  const linhas: { chave: keyof Nutrientes; nome: string; cor: string; valor: number; meta: number; tipo: 'meta' | 'minimo' | 'maximo' }[] = [
    { chave: 'prot', nome: 'Proteína', cor: 'var(--prot)', valor: total.prot, meta: metas.proteinaG, tipo: 'meta' },
    { chave: 'carb', nome: 'Carboidrato', cor: 'var(--carb)', valor: total.carb, meta: metas.carboidratoG, tipo: 'meta' },
    { chave: 'gord', nome: 'Gordura', cor: 'var(--gord)', valor: total.gord, meta: metas.gorduraG, tipo: 'meta' },
    { chave: 'fibra', nome: 'Fibras', cor: 'var(--fibra)', valor: total.fibra, meta: metas.fibraG, tipo: 'minimo' },
    { chave: 'sat', nome: 'Gordura saturada', cor: 'var(--sat)', valor: total.sat, meta: metas.gorduraSaturadaMaxG, tipo: 'maximo' },
  ]

  // De onde veio cada nutriente: soma por alimento (o mesmo alimento em duas refeições vira uma linha).
  function origem(chave: keyof Nutrientes) {
    const porAlimento = new Map<number, { nome: string; gramas: number; valor: number }>()
    for (const itens of porRefeicao.values())
      for (const { r, a } of itens) {
        const atual = porAlimento.get(a.id) ?? { nome: a.nome, gramas: 0, valor: 0 }
        atual.gramas += r.gramas
        atual.valor += nutrientesDe(a, r.gramas)[chave]
        porAlimento.set(a.id, atual)
      }
    return [...porAlimento.values()].filter((x) => x.valor >= 0.05).sort((x, y) => y.valor - x.valor)
  }

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
            <p>
              Treino <span className="faixa">{treinos.length ? 'Registrado' : 'Nenhum'}</span>
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
              <p className="ajuda">Toque num nutriente para ver de quais alimentos ele veio.</p>
              {linhas.map((l) => {
                const fontes = origem(l.chave)
                return (
                  <details className="nutriente" key={l.nome} style={{ '--cor': l.cor } as CSSProperties}>
                    <summary>
                      <span className="rotulo">
                        <span>{l.nome}</span>
                        <span>
                          {fmt(l.valor)} {l.tipo === 'minimo' ? 'de pelo menos' : l.tipo === 'maximo' ? 'de no máximo' : 'de'} {fmt(l.meta)} g
                          <ChevronDown size={18} aria-hidden="true" className="seta" />
                        </span>
                      </span>
                      <Barra valor={l.valor} meta={l.meta} />
                    </summary>
                    {fontes.length === 0 ? (
                      <p className="origem-vazia">Nenhum alimento registrado com {l.nome.toLowerCase()} hoje.</p>
                    ) : (
                      <ol className="origem" aria-label={`De onde veio ${l.nome.toLowerCase()}`}>
                        {fontes.map((f) => (
                          <li key={f.nome}>
                            <span>
                              {f.nome}
                              <small>{fmt(f.gramas)} g</small>
                            </span>
                            <span>
                              {fmt1(f.valor)} g<small>{Math.round((f.valor / l.valor) * 100)}%</small>
                            </span>
                          </li>
                        ))}
                      </ol>
                    )}
                  </details>
                )
              })}
            </div>
          </>
        )}
      </section>

      {!discreto && (
        <section className="cartao" aria-labelledby="t-balanco">
          <h2 id="t-balanco">Balanço</h2>
          <dl className="metas-lista">
            <dt>Comido</dt>
            <dd>{fmt(total.kcal)} kcal</dd>
            <dt>Gasto do dia, sem treino</dt>
            <dd>{fmt(metas.gastoBase)} kcal</dd>
            <dt>Treino</dt>
            <dd>{treinos.length ? `+${fmt(treinoKcal)} kcal` : 'Nenhum'}</dd>
            <dt>Saldo</dt>
            <dd>
              <Saldo saldo={total.kcal - gastoDia} />
            </dd>
          </dl>
          {ehHoje && (
            <p className="ajuda" style={{ marginTop: 8 }}>
              O dia ainda não acabou, então o saldo muda conforme você registra.
            </p>
          )}
          <h3 className="balanco-semana">Média dos 7 dias anteriores</h3>
          {diasMedia.length === 0 ? (
            <p className="ajuda">Registre as refeições por alguns dias para ver a média.</p>
          ) : (
            <>
              <dl className="metas-lista">
                <dt>Comido</dt>
                <dd>{fmt(mediaComido)} kcal</dd>
                <dt>Gasto, com treino</dt>
                <dd>{fmt(mediaGasto)} kcal</dd>
                <dt>Saldo</dt>
                <dd>
                  <Saldo saldo={mediaComido - mediaGasto} />
                </dd>
              </dl>
              <p className="ajuda" style={{ marginTop: 8 }}>
                {diasMedia.length === 1 ? 'Conta só 1 dia, o único com refeições registradas.' : `Conta os ${diasMedia.length} dias com refeições registradas.`} A média
                diz mais que um dia sozinho.
              </p>
            </>
          )}
        </section>
      )}

      <section className="cartao" aria-labelledby="t-agua">
        <div className="agua-topo">
          <h2 id="t-agua">
            <GlassWater size={22} aria-hidden="true" />
            Água
          </h2>
          <p>
            {discreto ? (
              <>
                <strong>{Math.round(aguaMl / (copoMl || 250))}</strong> de {Math.round(metaAgua / (copoMl || 250))} copos
              </>
            ) : (
              <>
                <strong>{(aguaMl / 1000).toLocaleString('pt-BR')} L</strong> de {(metaAgua / 1000).toLocaleString('pt-BR')} L
              </>
            )}
          </p>
        </div>
        <Barra valor={aguaMl} meta={metaAgua} classe="agua" />
        {aguaExtra > 0 && <p className="ajuda agua-extra">Inclui {fmt(aguaExtra)} ml a mais pelo treino.</p>}
        <fieldset className="copos">
          <legend>Tamanho do copo</legend>
          <div className="chips">
            {[...COPOS, OUTRO].map((ml) => (
              <label className="chip" key={ml}>
                <input type="radio" name="copo" checked={opcaoCopo === ml} onChange={() => escolherCopo(ml)} />
                {ml === OUTRO ? 'Outro' : `${ml} ml`}
              </label>
            ))}
          </div>
          {opcaoCopo === OUTRO && (
            <div className="campo copo-outro">
              <label htmlFor="copo-outro">Quantidade (ml)</label>
              <input
                id="copo-outro"
                inputMode="numeric"
                autoComplete="off"
                value={outro}
                onChange={(e) => {
                  const v = e.target.value.replace(/\D/g, '').slice(0, 4)
                  setOutro(v)
                  if (Number(v) > 0) {
                    setCopo(Number(v))
                    salvarCopo(Number(v))
                  }
                }}
              />
            </div>
          )}
        </fieldset>
        <div className="agua-linha">
          <button type="button" className="botao botao-icone" aria-label={`Tirar ${copoMl} ml de água`} disabled={aguaMl === 0 || copoMl === 0} onClick={() => mudarAgua(-copoMl)}>
            <Minus size={22} aria-hidden="true" />
          </button>
          <button
            type="button"
            className="botao botao-agua"
            aria-label={copoMl > 0 ? `Adicionar ${copoMl} ml de água` : undefined}
            disabled={copoMl === 0}
            onClick={() => mudarAgua(copoMl)}
          >
            <Plus size={20} aria-hidden="true" />
            {copoMl > 0 ? `${copoMl} ml` : 'Informe os ml'}
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
