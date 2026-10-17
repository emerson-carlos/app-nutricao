import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { buscarAlimentos, nutrientesDe, type Alimento } from '../lib/alimentos'
import { db, type Medida, type Refeicao } from '../lib/db'
import { medidaPadrao, medidasIBGE } from '../lib/medidas'

interface Props {
  data: string
  refeicao: Refeicao
  discreto: boolean
  aoFechar: () => void
  avisar: (texto: string) => void
}

const fmt = (n: number) => Math.round(n).toLocaleString('pt-BR')
// Medidas pequenas (colher de café, unidade de castanha) precisam da casa decimal.
const fmtG = (n: number) => n.toLocaleString('pt-BR', { maximumFractionDigits: 1 })
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
              <p className="ajuda">Base TACO (Unicamp), com 591 alimentos, e medidas caseiras do IBGE.</p>
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

// Valores do seletor: gramas, nova medida, "u<id>" para as suas medidas e "i<posição>" para as do IBGE.
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
  const ibge = medidasIBGE(alimento.id)
  // Abre na medida que você já salvou para este alimento; senão, numa medida do IBGE; senão, em gramas.
  const inicial = medidas.length ? `u${medidas[0].id}` : ibge.length ? `i${medidaPadrao(ibge)}` : GRAMAS
  const [unidade, setUnidade] = useState<string>(inicial)
  const [quantidade, setQuantidade] = useState(inicial === GRAMAS ? '100' : '1')
  const [novaNome, setNovaNome] = useState('')
  const [novaGramas, setNovaGramas] = useState('')
  const [erro, setErro] = useState('')

  const medida = unidade.startsWith('u') ? medidas.find((m) => `u${m.id}` === unidade) : unidade.startsWith('i') ? ibge[Number(unidade.slice(1))] : undefined
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
      <div className="dupla" style={{ gridTemplateColumns: '1fr 2.2fr' }}>
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
            {medidas.length > 0 && (
              <optgroup label="Suas medidas">
                {medidas.map((m) => (
                  <option key={m.id} value={`u${m.id}`}>
                    {m.nome} ({fmtG(m.gramas)} g)
                  </option>
                ))}
              </optgroup>
            )}
            {ibge.length > 0 && (
              <optgroup label="Medidas do IBGE">
                {ibge.map((m, i) => (
                  <option key={m.nome} value={`i${i}`}>
                    {m.nome} ({fmtG(m.gramas)} g)
                  </option>
                ))}
              </optgroup>
            )}
            <option value={NOVA}>Nova medida caseira…</option>
          </select>
        </div>
      </div>
      {medida && 'desc' in medida && (
        <p className="ajuda" style={{ marginTop: -8, marginBottom: 16 }}>
          Referência do IBGE: {medida.desc}.
        </p>
      )}

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
