import { useLiveQuery } from 'dexie-react-hooks'
import { BookOpen, Dumbbell, House, UserRound, type LucideIcon } from 'lucide-react'
import { useEffect, useState } from 'react'
import { registrarProprios } from './lib/alimentos'
import { db } from './lib/db'
import { Guia } from './telas/Guia'
import { Hoje } from './telas/Hoje'
import { PerfilTela } from './telas/PerfilTela'
import { Treino } from './telas/Treino'

type Tela = 'hoje' | 'treino' | 'guia' | 'perfil'

const ABAS: { tela: Tela; nome: string; Icone: LucideIcon }[] = [
  { tela: 'hoje', nome: 'Hoje', Icone: House },
  { tela: 'treino', nome: 'Treino', Icone: Dumbbell },
  { tela: 'guia', nome: 'Guia', Icone: BookOpen },
  { tela: 'perfil', nome: 'Perfil', Icone: UserRound },
]

export type Avisar = (texto: string, desfazer?: () => void) => void

// A tela atual fica no endereço (#guia, #perfil), para o botão Voltar do Android funcionar entre as abas.
function telaDoEndereco(): Tela | null {
  if (location.hash === '#perfil') return 'perfil'
  if (location.hash === '#guia') return 'guia'
  if (location.hash === '#treino') return 'treino'
  if (location.hash === '') return 'hoje'
  return null // outros #, como o do link "Pular para o conteúdo", não trocam de tela
}

export default function App() {
  const perfil = useLiveQuery(() => db.perfil.get('eu'), [], null)
  const proprios = useLiveQuery(() => db.alimentosProprios.toArray(), [], null)
  const [tela, setTela] = useState<Tela>(() => telaDoEndereco() ?? 'hoje')
  const [aviso, setAviso] = useState<{ texto: string; desfazer?: () => void } | null>(null)

  useEffect(() => {
    const voltar = () => {
      const t = telaDoEndereco()
      if (t) setTela(t)
    }
    addEventListener('popstate', voltar)
    return () => removeEventListener('popstate', voltar)
  }, [])

  // Com "Desfazer", o aviso fica mais tempo para dar tempo de tocar.
  useEffect(() => {
    if (!aviso) return
    const t = setTimeout(() => setAviso(null), aviso.desfazer ? 6000 : 3000)
    return () => clearTimeout(t)
  }, [aviso])

  const avisar: Avisar = (texto, desfazer) => setAviso({ texto, desfazer })

  function ir(t: Tela) {
    if (t === tela) return
    history.pushState(null, '', t === 'hoje' ? location.pathname + location.search : `#${t}`)
    setTela(t)
    scrollTo(0, 0)
  }

  // null = ainda carregando; undefined = primeiro uso, sem perfil.
  if (perfil === null || proprios === null) return null
  registrarProprios(proprios)

  const primeiroUso = perfil === undefined
  const telaAtual: Tela = primeiroUso ? 'perfil' : tela

  return (
    <>
      <a className="pular" href="#conteudo">
        Pular para o conteúdo
      </a>
      <main id="conteudo" className="app">
        {telaAtual === 'hoje' && perfil ? (
          <Hoje perfil={perfil} avisar={avisar} />
        ) : telaAtual === 'treino' && perfil ? (
          <Treino perfil={perfil} avisar={avisar} />
        ) : telaAtual === 'guia' && perfil ? (
          <Guia perfil={perfil} />
        ) : (
          <PerfilTela
            perfil={perfil}
            avisar={avisar}
            aoSalvar={() => {
              if (primeiroUso) ir('hoje')
            }}
          />
        )}
      </main>
      {!primeiroUso && (
        <nav className="navegacao" aria-label="Principal">
          <ul>
            {ABAS.map(({ tela: t, nome, Icone }) => (
              <li key={t}>
                <button type="button" aria-current={telaAtual === t ? 'page' : undefined} onClick={() => ir(t)}>
                  <span className="marcador" aria-hidden="true">
                    <Icone size={22} />
                  </span>
                  {nome}
                </button>
              </li>
            ))}
          </ul>
        </nav>
      )}
      <p className="visualmente-oculto" role="status" aria-live="polite">
        {aviso?.texto}
      </p>
      {aviso && (
        <div className="status">
          <span aria-hidden="true">{aviso.texto}</span>
          {aviso.desfazer && (
            <button
              type="button"
              onClick={() => {
                aviso.desfazer?.()
                setAviso(null)
              }}
            >
              Desfazer
            </button>
          )}
        </div>
      )}
    </>
  )
}
