import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useState } from 'react'
import { db } from './lib/db'
import { Hoje } from './telas/Hoje'
import { PerfilTela } from './telas/PerfilTela'

type Tela = 'hoje' | 'perfil'

export default function App() {
  const perfil = useLiveQuery(() => db.perfil.get('eu'), [], null)
  const [tela, setTela] = useState<Tela>('hoje')
  const [status, setStatus] = useState('')

  useEffect(() => {
    if (!status) return
    const t = setTimeout(() => setStatus(''), 3000)
    return () => clearTimeout(t)
  }, [status])

  // null = ainda carregando; undefined = primeiro uso, sem perfil.
  if (perfil === null) return null

  const primeiroUso = perfil === undefined
  const telaAtual: Tela = primeiroUso ? 'perfil' : tela

  return (
    <>
      <a className="pular" href="#conteudo">
        Pular para o conteúdo
      </a>
      <main id="conteudo" className="app">
        {telaAtual === 'hoje' && perfil ? (
          <Hoje perfil={perfil} avisar={setStatus} />
        ) : (
          <PerfilTela
            perfil={perfil}
            avisar={setStatus}
            aoSalvar={() => {
              if (primeiroUso) setTela('hoje')
            }}
          />
        )}
      </main>
      {!primeiroUso && (
        <nav className="navegacao" aria-label="Principal">
          <ul>
            <li>
              <button type="button" aria-current={telaAtual === 'hoje' ? 'page' : undefined} onClick={() => setTela('hoje')}>
                Hoje
              </button>
            </li>
            <li>
              <button type="button" aria-current={telaAtual === 'perfil' ? 'page' : undefined} onClick={() => setTela('perfil')}>
                Perfil e metas
              </button>
            </li>
          </ul>
        </nav>
      )}
      <p className="status" role="status" aria-live="polite">
        {status}
      </p>
    </>
  )
}
