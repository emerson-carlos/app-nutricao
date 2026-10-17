import { useRef, useState, type FormEvent } from 'react'
import { calcularMetas, OBJETIVOS, type Objetivo, type Perfil, type Sexo } from '../lib/calc'
import { db, exportarBackup, hojeISO, importarBackup, type PerfilSalvo } from '../lib/db'
import type { Avisar } from '../App'

interface Props {
  perfil: PerfilSalvo | undefined
  avisar: Avisar
  aoSalvar: () => void
}

export function PerfilTela({ perfil, avisar, aoSalvar }: Props) {
  const [sexo, setSexo] = useState<Sexo>(perfil?.sexo ?? 'masculino')
  const [nascimento, setNascimento] = useState(perfil?.nascimento ?? '')
  const [altura, setAltura] = useState(perfil ? String(perfil.alturaCm) : '')
  const [peso, setPeso] = useState(perfil ? String(perfil.pesoKg).replace('.', ',') : '')
  const [objetivo, setObjetivo] = useState<Objetivo>(perfil?.objetivo ?? 'perder')
  const [modoDiscreto, setModoDiscreto] = useState(perfil?.modoDiscreto ?? false)
  const [erros, setErros] = useState<string[]>([])
  const resumoErros = useRef<HTMLDivElement>(null)
  const arquivo = useRef<HTMLInputElement>(null)

  const alturaCm = Number(altura)
  const pesoKg = Number(peso.replace(',', '.'))
  const valido = nascimento && alturaCm >= 120 && alturaCm <= 230 && pesoKg >= 30 && pesoKg <= 300
  const previa: Perfil | null = valido ? { sexo, nascimento, alturaCm, pesoKg, objetivo, modoDiscreto } : null
  const metas = previa ? calcularMetas(previa) : null

  async function salvar(e: FormEvent) {
    e.preventDefault()
    const lista: string[] = []
    if (!nascimento) lista.push('Informe sua data de nascimento.')
    if (!(alturaCm >= 120 && alturaCm <= 230)) lista.push('Informe a altura em centímetros, entre 120 e 230.')
    if (!(pesoKg >= 30 && pesoKg <= 300)) lista.push('Informe o peso em quilos, entre 30 e 300.')
    setErros(lista)
    if (lista.length) {
      requestAnimationFrame(() => resumoErros.current?.focus())
      return
    }
    await db.perfil.put({ id: 'eu', sexo, nascimento, alturaCm, pesoKg, objetivo, modoDiscreto, atualizadoEm: Date.now() })
    avisar(perfil ? 'Perfil salvo. Metas atualizadas.' : 'Tudo pronto. Suas metas foram calculadas.')
    aoSalvar()
  }

  async function baixarBackup() {
    const blob = new Blob([await exportarBackup()], { type: 'application/json' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `backup-nutricao-${hojeISO()}.json`
    link.click()
    URL.revokeObjectURL(link.href)
    avisar('Backup baixado.')
  }

  async function restaurar(arq: File | undefined) {
    if (!arq) return
    if (!confirm('Restaurar este backup substitui todos os dados atuais do app. Continuar?')) return
    try {
      await importarBackup(await arq.text())
      avisar('Backup restaurado.')
    } catch (e) {
      avisar(e instanceof Error ? e.message : 'Não foi possível ler o arquivo.')
    }
  }

  return (
    <>
      <header className="cabecalho">
        <h1>{perfil ? 'Perfil e metas' : 'Vamos começar'}</h1>
      </header>

      {!perfil && (
        <p className="aviso">
          Com estes dados o app estima suas metas do dia. São estimativas para dar direção e não substituem nutricionista
          ou médico. Você pode mudar tudo depois.
        </p>
      )}

      <form onSubmit={salvar} noValidate>
        {erros.length > 0 && (
          <div className="erro" role="alert" tabIndex={-1} ref={resumoErros}>
            {erros.map((e) => (
              <p key={e}>{e}</p>
            ))}
          </div>
        )}

        <section className="cartao" aria-labelledby="t-dados">
          <h2 id="t-dados">Seus dados</h2>
          <fieldset className="campo">
            <legend>Sexo biológico</legend>
            <p className="ajuda">Usado só na fórmula do metabolismo.</p>
            <div className="dupla">
              {(['masculino', 'feminino'] as const).map((s) => (
                <label className="opcao" key={s}>
                  <input type="radio" name="sexo" checked={sexo === s} onChange={() => setSexo(s)} />
                  {s === 'masculino' ? 'Masculino' : 'Feminino'}
                </label>
              ))}
            </div>
          </fieldset>
          <div className="campo">
            <label htmlFor="nascimento">Data de nascimento</label>
            <input id="nascimento" type="date" value={nascimento} max={hojeISO()} onChange={(e) => setNascimento(e.target.value)} />
          </div>
          <div className="dupla">
            <div className="campo">
              <label htmlFor="altura">Altura (cm)</label>
              <input id="altura" inputMode="numeric" autoComplete="off" value={altura} onChange={(e) => setAltura(e.target.value.replace(/\D/g, ''))} placeholder="175" />
            </div>
            <div className="campo">
              <label htmlFor="peso">Peso (kg)</label>
              <input id="peso" inputMode="decimal" autoComplete="off" value={peso} onChange={(e) => setPeso(e.target.value.replace(/[^\d,.]/g, ''))} placeholder="70,5" />
            </div>
          </div>
        </section>

        <section className="cartao" aria-labelledby="t-objetivo">
          <h2 id="t-objetivo">Objetivo</h2>
          <fieldset className="campo">
            <legend className="visualmente-oculto">Objetivo</legend>
            <p className="ajuda">Pode trocar quando quiser. As metas são recalculadas e o histórico fica guardado.</p>
            <div className="opcoes">
              {(Object.keys(OBJETIVOS) as Objetivo[]).map((o) => (
                <label className="opcao" key={o}>
                  <input type="radio" name="objetivo" checked={objetivo === o} onChange={() => setObjetivo(o)} />
                  <span>
                    {OBJETIVOS[o].nome}
                    <small>{OBJETIVOS[o].descricao}</small>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
        </section>

        <section className="cartao" aria-labelledby="t-exibir">
          <h2 id="t-exibir">Como mostrar o dia</h2>
          <label className="opcao">
            <input type="checkbox" checked={modoDiscreto} onChange={(e) => setModoDiscreto(e.target.checked)} />
            <span>
              Modo discreto
              <small>Esconde os números e mostra só se você está dentro da faixa. Útil se contar calorias começar a pesar.</small>
            </span>
          </label>
        </section>

        {metas && (
          <section className="cartao" aria-labelledby="t-metas">
            <h2 id="t-metas">Suas metas diárias</h2>
            <dl className="metas-lista">
              <dt>Calorias</dt>
              <dd>{metas.kcal.toLocaleString('pt-BR')} kcal</dd>
              <dt>Proteína</dt>
              <dd>{metas.proteinaG.toLocaleString('pt-BR')} g</dd>
              <dt>Carboidrato</dt>
              <dd>{metas.carboidratoG.toLocaleString('pt-BR')} g</dd>
              <dt>Gordura</dt>
              <dd>{metas.gorduraG.toLocaleString('pt-BR')} g</dd>
              <dt>Gordura saturada (máximo)</dt>
              <dd>{metas.gorduraSaturadaMaxG.toLocaleString('pt-BR')} g</dd>
              <dt>Fibras (mínimo)</dt>
              <dd>{metas.fibraG.toLocaleString('pt-BR')} g</dd>
              <dt>Água para beber</dt>
              <dd>{(metas.aguaBeberMl / 1000).toLocaleString('pt-BR')} L</dd>
            </dl>
            <p className="ajuda" style={{ marginTop: 12 }}>
              Seu metabolismo em repouso é de cerca de {metas.basal.toLocaleString('pt-BR')} kcal e seu gasto num dia sem treino, de {metas.gastoBase.toLocaleString('pt-BR')} kcal.
              Os treinos entram depois, somados à parte.
            </p>
          </section>
        )}

        <button type="submit" className="botao botao-principal largura-total">
          {perfil ? 'Salvar alterações' : 'Calcular minhas metas'}
        </button>
      </form>

      {perfil && (
        <section className="cartao" aria-labelledby="t-backup" style={{ marginTop: 24 }}>
          <h2 id="t-backup">Backup</h2>
          <p className="ajuda" style={{ marginBottom: 12 }}>
            Seus dados ficam só neste celular. Baixe um backup de vez em quando para não perder o histórico.
          </p>
          <div className="dupla">
            <button type="button" className="botao" onClick={baixarBackup}>
              Baixar backup
            </button>
            <button type="button" className="botao" onClick={() => arquivo.current?.click()}>
              Restaurar backup
            </button>
          </div>
          <input ref={arquivo} type="file" accept="application/json,.json" hidden onChange={(e) => restaurar(e.target.files?.[0])} />
        </section>
      )}
    </>
  )
}
