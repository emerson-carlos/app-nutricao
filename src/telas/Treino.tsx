import { useLiveQuery } from 'dexie-react-hooks'
import { Dumbbell, Footprints, Plus, X, type LucideIcon } from 'lucide-react'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { db, deslocarDia, hojeISO, type DiaDoPlano, type PerfilSalvo } from '../lib/db'
import {
  aguaExtraMl,
  descreverExercicio,
  descreverTreino,
  gastoTreino,
  INTENSIDADES,
  TIPOS,
  type Exercicio,
  type Intensidade,
  type TipoTreino,
  type Treino as TreinoRegistrado,
} from '../lib/treino'
import type { Avisar } from '../App'

const fmt = (n: number) => Math.round(n).toLocaleString('pt-BR')
// Hora do registro, lida só ao salvar.
const agora = () => Date.now()
const numero = (t: string) => Number(t.replace(',', '.'))
const decimal = (t: string) => t.replace(/[^\d,.]/g, '')
const inteiro = (t: string) => t.replace(/\D/g, '')

const ICONES: Record<TipoTreino, LucideIcon> = { calistenia: Dumbbell, esteira: Footprints }
// A semana começa na segunda, como na rotina de treino; o número segue o getDay() (0 = domingo).
const DIAS: { dia: number; nome: string; curto: string }[] = [
  { dia: 1, nome: 'Segunda', curto: 'Seg' },
  { dia: 2, nome: 'Terça', curto: 'Ter' },
  { dia: 3, nome: 'Quarta', curto: 'Qua' },
  { dia: 4, nome: 'Quinta', curto: 'Qui' },
  { dia: 5, nome: 'Sexta', curto: 'Sex' },
  { dia: 6, nome: 'Sábado', curto: 'Sáb' },
  { dia: 0, nome: 'Domingo', curto: 'Dom' },
]

const diaDaSemana = (data: string) => new Date(data + 'T12:00:00').getDay()

function juntar(nomes: string[]): string {
  return nomes.length < 2 ? (nomes[0] ?? '') : `${nomes.slice(0, -1).join(', ')} e ${nomes.at(-1)}`
}

interface Props {
  perfil: PerfilSalvo
  avisar: Avisar
}

export function Treino({ perfil, avisar }: Props) {
  const hoje = hojeISO()
  const inicio = deslocarDia(hoje, -6)
  const discreto = perfil.modoDiscreto
  const [registrando, setRegistrando] = useState<TipoTreino | null>(null)
  const semana = useLiveQuery(() => db.treinos.where('data').between(inicio, hoje, true, true).sortBy('criadoEm'), [inicio, hoje], [] as TreinoRegistrado[])
  const salvo = useLiveQuery(() => db.plano.toArray(), [], [] as DiaDoPlano[])
  // A marcação muda na hora; o banco grava logo em seguida.
  const [marcado, setMarcado] = useState<DiaDoPlano[] | null>(null)
  const plano = marcado ?? salvo

  const tiposDoDia = (dia: number) => plano.find((p) => p.dia === dia)?.tipos ?? []
  const planoHoje = tiposDoDia(diaDaSemana(hoje))
  const treinosHoje = semana.filter((t) => t.data === hoje)
  const kcal = (t: TreinoRegistrado) => gastoTreino(t, perfil.pesoKg)

  async function alternarNoPlano(dia: number, tipo: TipoTreino) {
    const atuais = tiposDoDia(dia)
    const tipos = atuais.includes(tipo) ? atuais.filter((t) => t !== tipo) : [...atuais, tipo]
    setMarcado([...plano.filter((p) => p.dia !== dia), { dia, tipos }])
    await db.plano.put({ dia, tipos })
  }

  async function remover(t: TreinoRegistrado) {
    await db.treinos.delete(t.id!)
    avisar(`${TIPOS[t.tipo]} removida.`, () => db.treinos.add(t))
  }

  // Dias com treino nos últimos 7, do mais recente para o mais antigo.
  const dias = [...new Set(semana.map((t) => t.data))].sort().reverse()
  const minutosSemana = semana.reduce((s, t) => s + t.minutos, 0)
  const kcalSemana = semana.reduce((s, t) => s + kcal(t), 0)

  return (
    <>
      <header className="cabecalho">
        <div className="dia">
          <h1>Treino</h1>
          <small>{planoHoje.length ? `Hoje é dia de ${juntar(planoHoje.map((t) => TIPOS[t].toLowerCase()))}` : 'Hoje é dia de descanso no seu plano'}</small>
        </div>
      </header>

      <section className="cartao" aria-labelledby="t-treino-hoje">
        <h2 id="t-treino-hoje">Hoje</h2>
        {treinosHoje.length === 0 ? (
          <p className="ajuda" style={{ marginBottom: 16 }}>
            Nenhum treino registrado hoje.
          </p>
        ) : (
          <ul className="itens treinos">
            {treinosHoje.map((t) => (
              <ItemTreino key={t.id} treino={t} kcal={kcal(t)} discreto={discreto} aoRemover={() => remover(t)} />
            ))}
          </ul>
        )}
        <div className="botoes-treino">
          {(['calistenia', 'esteira'] as const).map((tipo) => {
            const Icone = ICONES[tipo]
            return (
              <button
                key={tipo}
                type="button"
                className={`botao ${planoHoje.includes(tipo) || (planoHoje.length === 0 && tipo === 'calistenia') ? 'botao-principal' : 'botao-suave'}`}
                aria-label={`Registrar ${TIPOS[tipo].toLowerCase()}`}
                onClick={() => setRegistrando(tipo)}
              >
                <Icone size={20} aria-hidden="true" />
                {TIPOS[tipo]}
              </button>
            )
          })}
        </div>
      </section>

      <section className="cartao" aria-labelledby="t-semana">
        <h2 id="t-semana">Últimos 7 dias</h2>
        {dias.length === 0 ? (
          <p className="ajuda">Nenhum treino nos últimos 7 dias.</p>
        ) : (
          <>
            {!discreto && (
              <p className="semana-total">
                {semana.length} {semana.length === 1 ? 'treino' : 'treinos'}, {fmt(minutosSemana)} min e cerca de {fmt(kcalSemana)} kcal a mais
              </p>
            )}
            <ul className="origem dias-treino">
              {dias.map((d) => {
                const doDia = semana.filter((t) => t.data === d)
                return (
                  <li key={d}>
                    <span>
                      {d === hoje ? 'Hoje' : new Date(d + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'numeric' })}
                      <small>{doDia.map((t) => `${TIPOS[t.tipo]} ${t.minutos} min`).join(', ')}</small>
                    </span>
                    {!discreto && <span>{fmt(doDia.reduce((s, t) => s + kcal(t), 0))} kcal</span>}
                  </li>
                )
              })}
            </ul>
          </>
        )}
      </section>

      <section className="cartao" aria-labelledby="t-plano">
        <h2 id="t-plano">Plano da semana</h2>
        <p className="ajuda" style={{ marginBottom: 12 }}>
          Marque o que o seu curso pede em cada dia. Dia sem marcação é descanso.
        </p>
        <ul className="plano">
          {DIAS.map(({ dia, nome, curto }) => (
            <li key={dia}>
              <span className="plano-dia" aria-hidden="true">
                {curto}
              </span>
              <fieldset>
                <legend className="visualmente-oculto">{nome}</legend>
                <div className="chips">
                  {(['calistenia', 'esteira'] as const).map((tipo) => (
                    <label className="chip chip-folha" key={tipo}>
                      <input type="checkbox" checked={tiposDoDia(dia).includes(tipo)} onChange={() => alternarNoPlano(dia, tipo)} />
                      {TIPOS[tipo]}
                    </label>
                  ))}
                </div>
              </fieldset>
            </li>
          ))}
        </ul>
      </section>

      <section className="cartao" aria-labelledby="t-bom-saber">
        <h2 id="t-bom-saber">Bom saber</h2>
        <ul className="lista-fontes">
          <li>O gasto é estimado pelo Compendium de Atividades Físicas 2024 e conta só o que o exercício somou ao que você gastaria parado.</li>
          <li>A calistenia gasta pouco. Ela serve para força e músculo; o déficit vem da comida. Por isso o treino entra como bônus, sem mudar a meta de calorias.</li>
          <li>Em dia de treino, a meta de água sobe cerca de 600 ml por hora de exercício (ACSM).</li>
          <li>Se aparecer uma dor muscular diferente da dor normal de treino, fraqueza ou urina escura, fale com seu médico. É um cuidado por causa do remédio de colesterol.</li>
        </ul>
      </section>

      {registrando && (
        <RegistrarTreino tipoInicial={registrando} perfil={perfil} aoFechar={() => setRegistrando(null)} avisar={avisar} />
      )}
    </>
  )
}

function ItemTreino({ treino, kcal, discreto, aoRemover }: { treino: TreinoRegistrado; kcal: number; discreto: boolean; aoRemover: () => void }) {
  const Icone = ICONES[treino.tipo]
  return (
    <li>
      <span className="refeicao-icone" aria-hidden="true">
        <Icone size={20} />
      </span>
      <span className="item-texto">
        {TIPOS[treino.tipo]}
        <small>
          {descreverTreino(treino)}
          {!discreto && `, ${fmt(kcal)} kcal`}
        </small>
        {treino.exercicios?.length ? <small>{treino.exercicios.map(descreverExercicio).join(' · ')}</small> : null}
      </span>
      <button type="button" className="botao botao-icone botao-fantasma" aria-label={`Remover ${TIPOS[treino.tipo].toLowerCase()}`} onClick={aoRemover}>
        <X size={20} aria-hidden="true" />
      </button>
    </li>
  )
}

interface LinhaExercicio {
  chave: number
  nome: string
  series: string
  repeticoes: string
}

function RegistrarTreino({ tipoInicial, perfil, aoFechar, avisar }: { tipoInicial: TipoTreino; perfil: PerfilSalvo; aoFechar: () => void; avisar: Avisar }) {
  const janela = useRef<HTMLDialogElement>(null)
  const hoje = hojeISO()
  const [tipo, setTipo] = useState(tipoInicial)
  const [data, setData] = useState(hoje)
  const [minutos, setMinutos] = useState('30')
  const [velocidade, setVelocidade] = useState('5')
  const [inclinacao, setInclinacao] = useState('0')
  const [intensidade, setIntensidade] = useState<Intensidade>('moderada')
  const [exercicios, setExercicios] = useState<LinhaExercicio[]>([])
  const [erro, setErro] = useState('')
  const proximaChave = useRef(0)

  useEffect(() => {
    janela.current?.showModal()
  }, [])

  // Começa com os valores do último treino do mesmo tipo: a rotina costuma se repetir.
  useEffect(() => {
    let ativo = true
    db.treinos.toArray().then((todos) => {
      if (!ativo) return
      const ultimo = todos.filter((t) => t.tipo === tipo).sort((a, b) => b.criadoEm - a.criadoEm)[0]
      if (!ultimo) return
      setMinutos(String(ultimo.minutos))
      if (ultimo.tipo === 'esteira') {
        setVelocidade(String(ultimo.velocidadeKmh ?? 5).replace('.', ','))
        setInclinacao(String(ultimo.inclinacaoPct ?? 0).replace('.', ','))
      } else {
        setIntensidade(ultimo.intensidade ?? 'moderada')
        setExercicios(
          (ultimo.exercicios ?? []).map((e) => ({ chave: proximaChave.current++, nome: e.nome, series: e.series ? String(e.series) : '', repeticoes: e.repeticoes ? String(e.repeticoes) : '' })),
        )
      }
    })
    return () => {
      ativo = false
    }
  }, [tipo])

  function fechar() {
    const el = janela.current
    if (!el) return
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return el.close()
    el.classList.add('saindo')
    setTimeout(() => el.close(), 220)
  }

  const treino: Pick<TreinoRegistrado, 'tipo' | 'minutos' | 'velocidadeKmh' | 'inclinacaoPct' | 'intensidade'> = {
    tipo,
    minutos: numero(minutos),
    ...(tipo === 'esteira' ? { velocidadeKmh: numero(velocidade), inclinacaoPct: numero(inclinacao) || 0 } : { intensidade }),
  }
  const valido = treino.minutos > 0 && (tipo === 'calistenia' || (treino.velocidadeKmh ?? 0) > 0)
  const kcal = valido ? gastoTreino(treino, perfil.pesoKg) : 0

  function mudarExercicio(chave: number, campo: keyof Omit<LinhaExercicio, 'chave'>, valor: string) {
    setExercicios((lista) => lista.map((e) => (e.chave === chave ? { ...e, [campo]: valor } : e)))
  }

  async function salvar(e: FormEvent) {
    e.preventDefault()
    if (!(treino.minutos > 0 && treino.minutos <= 600)) return setErro('Informe a duração em minutos.')
    if (tipo === 'esteira') {
      if (!((treino.velocidadeKmh ?? 0) >= 1 && (treino.velocidadeKmh ?? 0) <= 25)) return setErro('Informe a velocidade da esteira, entre 1 e 25 km/h.')
      if (!((treino.inclinacaoPct ?? 0) >= 0 && (treino.inclinacaoPct ?? 0) <= 20)) return setErro('A inclinação vai de 0 a 20%.')
    }
    if (!data || data > hoje) return setErro('Escolha hoje ou um dia que já passou.')
    const lista: Exercicio[] = exercicios
      .filter((x) => x.nome.trim())
      .map((x) => ({ nome: x.nome.trim(), series: Number(x.series) || undefined, repeticoes: Number(x.repeticoes) || undefined }))
    await db.treinos.add({ ...treino, data, exercicios: tipo === 'calistenia' && lista.length ? lista : undefined, criadoEm: agora() })
    avisar(`${TIPOS[tipo]} registrada.`)
    fechar()
  }

  return (
    <dialog
      ref={janela}
      className="janela"
      aria-labelledby="t-registrar"
      onClose={aoFechar}
      onCancel={(e) => {
        e.preventDefault()
        fechar()
      }}
    >
      <div className="janela-corpo">
        <div className="janela-topo">
          <h2 id="t-registrar">Registrar treino</h2>
          <button type="button" className="botao botao-icone botao-fantasma" aria-label="Fechar" onClick={fechar}>
            <X size={24} aria-hidden="true" />
          </button>
        </div>

        <form onSubmit={salvar} noValidate>
          <fieldset className="campo">
            <legend>Tipo</legend>
            <div className="chips">
              {(['calistenia', 'esteira'] as const).map((t) => (
                <label className="chip chip-folha" key={t}>
                  <input type="radio" name="tipo-treino" checked={tipo === t} onChange={() => setTipo(t)} />
                  {TIPOS[t]}
                </label>
              ))}
            </div>
          </fieldset>

          {erro && (
            <p className="erro" role="alert">
              {erro}
            </p>
          )}

          <div className="dupla">
            <div className="campo">
              <label htmlFor="treino-data">Dia</label>
              <input id="treino-data" type="date" max={hoje} value={data} onChange={(e) => setData(e.target.value)} />
            </div>
            <div className="campo">
              <label htmlFor="treino-minutos">{tipo === 'calistenia' ? 'Minutos ativos' : 'Minutos'}</label>
              <input id="treino-minutos" inputMode="numeric" autoComplete="off" value={minutos} onChange={(e) => setMinutos(inteiro(e.target.value).slice(0, 3))} />
            </div>
          </div>

          {tipo === 'esteira' ? (
            <div className="dupla">
              <div className="campo">
                <label htmlFor="treino-velocidade">Velocidade (km/h)</label>
                <input id="treino-velocidade" inputMode="decimal" autoComplete="off" value={velocidade} onChange={(e) => setVelocidade(decimal(e.target.value))} />
              </div>
              <div className="campo">
                <label htmlFor="treino-inclinacao">Inclinação (%)</label>
                <input id="treino-inclinacao" inputMode="decimal" autoComplete="off" value={inclinacao} onChange={(e) => setInclinacao(decimal(e.target.value))} />
              </div>
            </div>
          ) : (
            <>
              <p className="ajuda" style={{ marginTop: -8, marginBottom: 16 }}>
                Conte o tempo se exercitando. Descansos longos entre as séries ficam de fora.
              </p>
              <fieldset className="campo">
                <legend>Intensidade</legend>
                <div className="opcoes">
                  {(Object.keys(INTENSIDADES) as Intensidade[]).map((i) => (
                    <label className="opcao" key={i}>
                      <input type="radio" name="intensidade" checked={intensidade === i} onChange={() => setIntensidade(i)} />
                      <span>
                        {INTENSIDADES[i].nome}
                        <small>{INTENSIDADES[i].exemplo}</small>
                      </span>
                    </label>
                  ))}
                </div>
              </fieldset>

              <fieldset className="campo">
                <legend>Exercícios (opcional)</legend>
                {exercicios.map((x, n) => (
                  <div className="exercicio" key={x.chave}>
                    <div className="campo">
                      <label htmlFor={`ex-nome-${x.chave}`}>Exercício {n + 1}</label>
                      <input id={`ex-nome-${x.chave}`} autoComplete="off" value={x.nome} placeholder="Ex.: Flexão" onChange={(e) => mudarExercicio(x.chave, 'nome', e.target.value)} />
                    </div>
                    <div className="campo">
                      <label htmlFor={`ex-series-${x.chave}`}>Séries</label>
                      <input id={`ex-series-${x.chave}`} inputMode="numeric" autoComplete="off" value={x.series} onChange={(e) => mudarExercicio(x.chave, 'series', inteiro(e.target.value).slice(0, 2))} />
                    </div>
                    <div className="campo">
                      <label htmlFor={`ex-reps-${x.chave}`}>Repetições</label>
                      <input id={`ex-reps-${x.chave}`} inputMode="numeric" autoComplete="off" value={x.repeticoes} onChange={(e) => mudarExercicio(x.chave, 'repeticoes', inteiro(e.target.value).slice(0, 3))} />
                    </div>
                    <button
                      type="button"
                      className="botao botao-icone botao-fantasma"
                      aria-label={`Remover exercício ${n + 1}`}
                      onClick={() => setExercicios((lista) => lista.filter((e) => e.chave !== x.chave))}
                    >
                      <X size={20} aria-hidden="true" />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  className="botao botao-suave"
                  onClick={() => setExercicios((lista) => [...lista, { chave: proximaChave.current++, nome: '', series: '', repeticoes: '' }])}
                >
                  <Plus size={20} aria-hidden="true" />
                  Adicionar exercício
                </button>
                <p className="ajuda" style={{ marginTop: 8 }}>
                  Serve só para você acompanhar a evolução. O gasto vem do tempo e da intensidade.
                </p>
              </fieldset>
            </>
          )}

          {valido && !perfil.modoDiscreto && (
            <div className="previa" aria-live="polite" style={{ gridTemplateColumns: '1fr 1fr' }}>
              <div>
                <strong>{fmt(kcal)}</strong>kcal a mais
              </div>
              <div>
                <strong>+{fmt(aguaExtraMl(treino.minutos))} ml</strong>na meta de água
              </div>
            </div>
          )}

          <button type="submit" className="botao botao-principal largura-total">
            Salvar treino
          </button>
        </form>
      </div>
    </dialog>
  )
}
