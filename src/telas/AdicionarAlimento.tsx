import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { buscarAlimentos, nutrientesDe, type Alimento } from '../lib/alimentos'
import { db, type Medida, type Refeicao } from '../lib/db'

interface Props {
  data: string
  refeicao: Refeicao
  discreto: boolean
  aoFechar: () => void
  avisar: (texto: string) => void
}

const fmt = (n: number) => Math.round(n).toLocaleString('pt-BR')
const numero = (t: string) => Number(t.replace(',', '.'))

export function AdicionarAlimento({ data, refeicao, discreto, aoFechar, avisar }: Props) {
  const janela = useRef<HTMLDialogElement>(null)
  const [busca, setBusca] = useState('')
  const [escolhido, setEscolhido] = useState<Alimento | null>(null)

  useEffect(() => {
    janela.current?.showModal()
  }, [])

  const resultados = useMemo(() => buscarAlimentos(busca), [busca])

  return (
    <dialog ref={janela} className="janela" aria-labelledby="t-adicionar" onClose={aoFechar}>
      <div className="janela-corpo">
        <div className="janela-topo">
          {escolhido && (
            <button type="button" className="botao botao-icone" aria-label="Voltar para a busca" onClick={() => setEscolhido(null)}>
              ‹
            </button>
          )}
          <h2 id="t-adicionar">{escolhido ? escolhido.nome : `Adicionar em ${refeicao}`}</h2>
          <button type="button" className="botao botao-icone" aria-label="Fechar" onClick={() => janela.current?.close()}>
            ×
          </button>
        </div>

        {escolhido ? (
          <Porcao
            alimento={escolhido}
            discreto={discreto}
            aoConfirmar={async (gramas, medida) => {
              await db.registros.add({ data, refeicao, alimentoId: escolhido.id, gramas, medida, criadoEm: Date.now() })
              avisar(`${escolhido.nome} adicionado em ${refeicao}.`)
              janela.current?.close()
            }}
          />
        ) : (
          <>
            <div className="campo">
              <label htmlFor="busca">Buscar alimento</label>
              <input id="busca" type="search" autoFocus autoComplete="off" value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Ex.: arroz cozido, banana, ovo" />
              <p className="ajuda">Base TACO (Unicamp), com 591 alimentos. Valores para 100 g.</p>
            </div>
            <p className="visualmente-oculto" aria-live="polite">
              {busca ? `${resultados.length} resultados` : ''}
            </p>
            <ul className="resultados">
              {resultados.map((a) => (
                <li key={a.id}>
                  <button type="button" onClick={() => setEscolhido(a)}>
                    {a.nome}
                    <small>
                      {a.grupo}
                      {!discreto && ` · ${fmt(a.kcal)} kcal em 100 g`}
                    </small>
                  </button>
                </li>
              ))}
            </ul>
            {busca && resultados.length === 0 && <p>Nenhum alimento encontrado. Tente uma palavra só, como "frango".</p>}
          </>
        )}
      </div>
    </dialog>
  )
}

const NOVA = 'nova'
const GRAMAS = 'g'

interface PorcaoProps {
  alimento: Alimento
  discreto: boolean
  aoConfirmar: (gramas: number, medida?: { nome: string; quantidade: number }) => void
}

function Porcao(props: PorcaoProps) {
  const medidas = useLiveQuery(() => db.medidas.where('alimentoId').equals(props.alimento.id).toArray(), [props.alimento.id])
  if (!medidas) return null
  return <PorcaoForm {...props} medidas={medidas} />
}

function PorcaoForm({ alimento, discreto, aoConfirmar, medidas }: PorcaoProps & { medidas: Medida[] }) {
  // Abre na medida que você já usou para este alimento, se houver.
  const [unidade, setUnidade] = useState<string>(medidas.length ? String(medidas[0].id) : GRAMAS)
  const [quantidade, setQuantidade] = useState(medidas.length ? '1' : '100')
  const [novaNome, setNovaNome] = useState('')
  const [novaGramas, setNovaGramas] = useState('')
  const [erro, setErro] = useState('')

  const medida = medidas.find((m) => String(m.id) === unidade)
  const q = numero(quantidade)
  const gramas = unidade === GRAMAS ? q : unidade === NOVA ? q * numero(novaGramas) : medida ? q * medida.gramas : 0
  const n = gramas > 0 ? nutrientesDe(alimento, gramas) : null

  async function confirmar(e: FormEvent) {
    e.preventDefault()
    if (!(q > 0)) return setErro('Informe uma quantidade maior que zero.')
    if (unidade === NOVA) {
      if (!novaNome.trim() || !(numero(novaGramas) > 0)) return setErro('Dê um nome para a medida e informe quantos gramas ela tem.')
      const nome = novaNome.trim()
      await db.medidas.add({ alimentoId: alimento.id, nome, gramas: numero(novaGramas), fonte: 'Informada por você' })
      return aoConfirmar(gramas, { nome, quantidade: q })
    }
    aoConfirmar(gramas, medida ? { nome: medida.nome, quantidade: q } : undefined)
  }

  return (
    <form onSubmit={confirmar} noValidate>
      {erro && (
        <p className="erro" role="alert">
          {erro}
        </p>
      )}
      <div className="dupla">
        <div className="campo">
          <label htmlFor="quantidade">Quantidade</label>
          <input id="quantidade" inputMode="decimal" autoComplete="off" value={quantidade} onChange={(e) => setQuantidade(e.target.value.replace(/[^\d,.]/g, ''))} />
        </div>
        <div className="campo">
          <label htmlFor="unidade">Medida</label>
          <select
            id="unidade"
            value={unidade}
            onChange={(e) => {
              setUnidade(e.target.value)
              if (e.target.value !== GRAMAS && quantidade === '100') setQuantidade('1')
            }}
          >
            <option value={GRAMAS}>gramas</option>
            {medidas.map((m) => (
              <option key={m.id} value={String(m.id)}>
                {m.nome} ({fmt(m.gramas)} g)
              </option>
            ))}
            <option value={NOVA}>Nova medida caseira…</option>
          </select>
        </div>
      </div>

      {unidade === NOVA && (
        <div className="cartao">
          <p className="ajuda" style={{ marginBottom: 12 }}>
            Ex.: "colher de sopa cheia" = 25 g. Pese uma vez numa balança de cozinha ou use o peso da embalagem. O app guarda e
            você usa sempre.
          </p>
          <div>
            <div className="campo">
              <label htmlFor="nova-nome">Nome da medida</label>
              <input id="nova-nome" autoComplete="off" value={novaNome} onChange={(e) => setNovaNome(e.target.value)} placeholder="colher de sopa" />
            </div>
            <div className="campo">
              <label htmlFor="nova-gramas">Gramas em 1 medida</label>
              <input id="nova-gramas" inputMode="decimal" autoComplete="off" value={novaGramas} onChange={(e) => setNovaGramas(e.target.value.replace(/[^\d,.]/g, ''))} />
            </div>
          </div>
        </div>
      )}

      {n && !discreto && (
        <div className="previa" aria-live="polite">
          <div>
            <strong>{fmt(n.kcal)}</strong>kcal
          </div>
          <div>
            <strong>{fmt(n.prot)} g</strong>proteína
          </div>
          <div>
            <strong>{fmt(n.carb)} g</strong>carboidrato
          </div>
          <div>
            <strong>{fmt(n.gord)} g</strong>gordura
          </div>
          <div>
            <strong>{fmt(n.fibra)} g</strong>fibras
          </div>
          <div>
            <strong>{fmt(gramas)} g</strong>no total
          </div>
        </div>
      )}

      <button type="submit" className="botao botao-principal largura-total">
        Adicionar
      </button>
    </form>
  )
}
