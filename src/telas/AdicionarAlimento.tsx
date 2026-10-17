import { useLiveQuery } from 'dexie-react-hooks'
import { ChevronLeft, Search, X } from 'lucide-react'
import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { alimentoDoRotulo, apelido, buscarAlimentos, nutrientesDe, type Alimento, type Rotulo } from '../lib/alimentos'
import { db, type Medida, type Refeicao } from '../lib/db'
import { medidaPadrao, medidasIBGE } from '../lib/medidas'
import type { Avisar } from '../App'

interface Props {
  data: string
  refeicao: Refeicao
  discreto: boolean
  aoFechar: () => void
  avisar: Avisar
}

const fmt = (n: number) => Math.round(n).toLocaleString('pt-BR')
// Medidas pequenas (colher de café, unidade de castanha) precisam da casa decimal.
const fmtG = (n: number) => n.toLocaleString('pt-BR', { maximumFractionDigits: 1 })
const numero = (t: string) => Number(t.replace(',', '.'))

export function AdicionarAlimento({ data, refeicao, discreto, aoFechar, avisar }: Props) {
  const janela = useRef<HTMLDialogElement>(null)
  const [busca, setBusca] = useState('')
  const [escolhido, setEscolhido] = useState<Alimento | null>(null)
  const [cadastrando, setCadastrando] = useState(false)

  useEffect(() => {
    janela.current?.showModal()
  }, [])

  const resultados = useMemo(() => buscarAlimentos(busca), [busca])

  // Fecha descendo pelo mesmo caminho por onde entrou; com "menos movimento", fecha na hora.
  function fechar() {
    const el = janela.current
    if (!el) return
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return el.close()
    el.classList.add('saindo')
    setTimeout(() => el.close(), 220)
  }

  return (
    <dialog
      ref={janela}
      className="janela"
      aria-labelledby="t-adicionar"
      onClose={aoFechar}
      onCancel={(e) => {
        e.preventDefault()
        fechar()
      }}
    >
      <div className="janela-corpo">
        <div className="janela-topo">
          {(escolhido || cadastrando) && (
            <button
              type="button"
              className="botao botao-icone botao-fantasma"
              aria-label="Voltar para a busca"
              onClick={() => {
                setEscolhido(null)
                setCadastrando(false)
              }}
            >
              <ChevronLeft size={24} aria-hidden="true" />
            </button>
          )}
          <h2 id="t-adicionar">{escolhido ? escolhido.nome : cadastrando ? 'Cadastrar pelo rótulo' : `Adicionar em ${refeicao}`}</h2>
          <button type="button" className="botao botao-icone botao-fantasma" aria-label="Fechar" onClick={fechar}>
            <X size={24} aria-hidden="true" />
          </button>
        </div>

        {escolhido ? (
          <Porcao
            alimento={escolhido}
            discreto={discreto}
            aoConfirmar={async (gramas, medida) => {
              await db.registros.add({ data, refeicao, alimentoId: escolhido.id, gramas, medida, criadoEm: Date.now() })
              avisar(`${escolhido.nome} adicionado em ${refeicao}.`)
              fechar()
            }}
          />
        ) : cadastrando ? (
          <CadastroRotulo
            nomeInicial={busca}
            aoSalvar={(a) => {
              avisar(`${a.nome} cadastrado.`)
              setCadastrando(false)
              setEscolhido(a)
            }}
          />
        ) : (
          <>
            <div className="campo">
              <label htmlFor="busca">Buscar alimento</label>
              <div className="campo-busca">
                <Search size={20} aria-hidden="true" />
                <input
                  id="busca"
                  type="search"
                  autoFocus
                  autoComplete="off"
                  enterKeyHint="search"
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  placeholder="Ex.: arroz cozido, banana, ovo"
                />
              </div>
              <p className="ajuda">Base TACO (Unicamp), com 591 alimentos, mais a tilápia (USDA), e medidas caseiras do IBGE.</p>
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
                      {apelido(a.id) ? `Serve para ${apelido(a.id)}` : a.fonte ? `${a.grupo} (${a.fonte})` : a.grupo}
                      {!discreto && `, ${fmt(a.kcal)} kcal em 100 g`}
                    </small>
                  </button>
                </li>
              ))}
            </ul>
            {busca && resultados.length === 0 && <p>Nenhum alimento encontrado. Tente uma palavra só, como "frango".</p>}
            <button type="button" className="botao largura-total" style={{ marginTop: 16 }} onClick={() => setCadastrando(true)}>
              Não achou? Cadastrar pelo rótulo
            </button>
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

const CAMPOS_ROTULO: { chave: Exclude<keyof Rotulo, 'nome'>; rotulo: string; obrigatorio?: boolean }[] = [
  { chave: 'porcaoG', rotulo: 'Porção (g ou ml)', obrigatorio: true },
  { chave: 'kcal', rotulo: 'Valor energético (kcal)', obrigatorio: true },
  { chave: 'carb', rotulo: 'Carboidratos (g)' },
  { chave: 'prot', rotulo: 'Proteínas (g)' },
  { chave: 'gord', rotulo: 'Gorduras totais (g)' },
  { chave: 'sat', rotulo: 'Gorduras saturadas (g)' },
  { chave: 'fibra', rotulo: 'Fibra alimentar (g)' },
  { chave: 'sodio', rotulo: 'Sódio (mg)' },
]

function CadastroRotulo({ nomeInicial, aoSalvar }: { nomeInicial: string; aoSalvar: (a: Alimento) => void }) {
  const [nome, setNome] = useState(nomeInicial)
  const [valores, setValores] = useState<Record<string, string>>({})
  const [erro, setErro] = useState('')
  const valor = (chave: string) => (valores[chave] ? numero(valores[chave]) : 0)

  async function salvar(e: FormEvent) {
    e.preventDefault()
    if (!nome.trim()) return setErro('Dê um nome para o alimento.')
    if (!(valor('porcaoG') > 0)) return setErro('Informe o tamanho da porção que está no rótulo.')
    if (!valores.kcal) return setErro('Informe o valor energético da porção.')
    const rotulo = Object.fromEntries(CAMPOS_ROTULO.map((c) => [c.chave, valor(c.chave)])) as Omit<Rotulo, 'nome'>
    const a = alimentoDoRotulo({ ...rotulo, nome }, Date.now())
    await db.transaction('rw', db.alimentosProprios, db.medidas, async () => {
      await db.alimentosProprios.add({ ...a, criadoEm: Date.now() })
      await db.medidas.add({ alimentoId: a.id, nome: 'Porção do rótulo', gramas: rotulo.porcaoG, fonte: 'Rótulo' })
    })
    aoSalvar(a)
  }

  return (
    <form onSubmit={salvar} noValidate>
      <p className="ajuda" style={{ marginBottom: 16 }}>
        Copie a tabela nutricional da embalagem, na coluna da porção. O app converte para 100 g. Em líquidos, 1 ml conta como 1 g,
        o que dá diferença pequena para leite e sucos.
      </p>
      {erro && (
        <p className="erro" role="alert">
          {erro}
        </p>
      )}
      <div className="campo">
        <label htmlFor="rotulo-nome">Nome</label>
        <input id="rotulo-nome" autoComplete="off" value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex.: Whey protein baunilha" />
      </div>
      <div className="dupla">
        {CAMPOS_ROTULO.map((c) => (
          <div className="campo" key={c.chave}>
            <label htmlFor={`rotulo-${c.chave}`}>
              {c.rotulo}
              {!c.obrigatorio && <span className="visualmente-oculto"> (opcional)</span>}
            </label>
            <input
              id={`rotulo-${c.chave}`}
              inputMode="decimal"
              autoComplete="off"
              value={valores[c.chave] ?? ''}
              onChange={(e) => setValores({ ...valores, [c.chave]: e.target.value.replace(/[^\d,.]/g, '') })}
            />
          </div>
        ))}
      </div>
      <p className="ajuda" style={{ marginBottom: 16 }}>
        Campo em branco conta como zero.
      </p>
      <button type="submit" className="botao botao-principal largura-total">
        Salvar e continuar
      </button>
    </form>
  )
}
