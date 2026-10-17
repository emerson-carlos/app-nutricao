import { useState } from 'react'
import { calcularMetas } from '../lib/calc'
import type { PerfilSalvo } from '../lib/db'
import { CHAVES_GUIA, EXEMPLOS, fontesDe, montar } from '../lib/guia'

const fmt = (n: number) => Math.round(n).toLocaleString('pt-BR')
const fmt1 = (n: number) => n.toLocaleString('pt-BR', { maximumFractionDigits: 1 })

const NOMES: Record<(typeof CHAVES_GUIA)[number], string> = {
  prot: 'Proteína',
  carb: 'Carboidrato',
  fibra: 'Fibras',
  sat: 'Gordura saturada',
}

const EXPLICA: Record<(typeof CHAVES_GUIA)[number], string> = {
  prot: 'Carnes, peixes e ovos concentram mais proteína por porção. Feijão e lentilha têm menos, mas somam fibra.',
  carb: 'A principal fonte de energia. Prefira os menos processados: arroz, feijão, mandioca, batatas, aveia e frutas.',
  fibra: 'Feijão e lentilha são as fontes mais fortes do dia a dia. Frutas com casca, verduras e aveia completam.',
  sat: 'Não é para cortar, é para dosar. Estas são as maiores fontes por porção: um item daqui já pesa no limite do dia.',
}

const REFEICOES: { chave: keyof typeof EXEMPLOS; titulo: string; texto: string }[] = [
  {
    chave: 'cafe',
    titulo: 'Café da manhã',
    texto:
      'Junte uma proteína (ovos, queijo, leite ou iogurte), um carboidrato (pão, cuscuz, tapioca ou aveia) e uma fruta. Não precisa priorizar o carboidrato: começar o dia com proteína ajuda a chegar na meta.',
  },
  {
    chave: 'almoco',
    titulo: 'Almoço',
    texto:
      'Metade do prato com verduras e legumes, um quarto com arroz, batata ou mandioca junto do feijão, e um quarto com carne, frango, peixe ou ovos. Arroz com feijão é uma boa base: juntos somam proteína e fibra.',
  },
  {
    chave: 'lanche',
    titulo: 'Lanches',
    texto:
      'Uma fruta com uma proteína (iogurte, leite, queijo ou ovo) segura a fome até a próxima refeição e ajuda na proteína do dia. Castanhas também servem, em pouca quantidade.',
  },
  {
    chave: 'jantar',
    titulo: 'Jantar',
    texto:
      'Mesma lógica do almoço. Peixe é uma ótima proteína para a janta: o branco (merluza, pescada, corvina) é magro, e os gordos (salmão, sardinha) trazem ômega-3. Se preferir algo mais leve, diminua o carboidrato e mantenha a proteína e os legumes.',
  },
]

export function Guia({ perfil }: { perfil: PerfilSalvo }) {
  const [chave, setChave] = useState<(typeof CHAVES_GUIA)[number]>('prot')
  const metas = calcularMetas(perfil)
  const discreto = perfil.modoDiscreto
  const fontes = fontesDe(chave)

  return (
    <>
      <header className="cabecalho">
        <div className="dia">
          <h1>Guia</h1>
          <small>Como montar as refeições com comida do dia a dia</small>
        </div>
      </header>

      {!discreto && (
        <section className="cartao" aria-labelledby="t-prot-dia">
          <h2 id="t-prot-dia">Proteína ao longo do dia</h2>
          <p>
            Sua meta é de <strong>{fmt(metas.proteinaG)} g</strong>. Fica mais fácil dividindo em 4 ou 5 refeições: cerca de{' '}
            <strong>
              {fmt(metas.proteinaG / 5)} a {fmt(metas.proteinaG / 4)} g
            </strong>{' '}
            em cada uma, com mais nas principais e menos nos lanches.
          </p>
        </section>
      )}

      <section aria-labelledby="t-montar">
        <h2 id="t-montar" className="titulo-secao">
          Como montar cada refeição
        </h2>
        {REFEICOES.map((r) => {
          const { itens, total } = montar(EXEMPLOS[r.chave])
          return (
            <article className="cartao" key={r.chave} aria-labelledby={`t-${r.chave}`}>
              <h3 id={`t-${r.chave}`}>{r.titulo}</h3>
              <p className="guia-texto">{r.texto}</p>
              <details className="exemplo">
                <summary>Ver um exemplo</summary>
                <ul>
                  {itens.map((i) => (
                    <li key={i.id}>
                      {i.nome}
                      <small>{i.porcao}</small>
                    </li>
                  ))}
                </ul>
                {!discreto && (
                  <p className="exemplo-total">
                    {fmt(total.kcal)} kcal, {fmt(total.prot)} g de proteína, {fmt(total.carb)} g de carboidrato e {fmt(total.fibra)} g de fibras
                  </p>
                )}
              </details>
            </article>
          )
        })}
        <article className="cartao" aria-labelledby="t-ceia">
          <h3 id="t-ceia">Ceia e dia de treino</h3>
          <p className="guia-texto">
            A ceia é opcional: se tiver fome, algo leve com proteína, como iogurte ou leite. Em dia de treino, uma refeição com carboidrato e
            proteína nas horas seguintes ajuda na recuperação.
          </p>
        </article>
      </section>

      <section className="cartao" aria-labelledby="t-fontes">
        <h2 id="t-fontes">Onde encontrar cada nutriente</h2>
        <fieldset className="copos">
          <legend className="visualmente-oculto">Nutriente</legend>
          <div className="chips">
            {CHAVES_GUIA.map((c) => (
              <label className="chip chip-folha" key={c}>
                <input type="radio" name="nutriente-guia" checked={chave === c} onChange={() => setChave(c)} />
                {NOMES[c]}
              </label>
            ))}
          </div>
        </fieldset>
        <p className="guia-texto">{EXPLICA[chave]}</p>
        <ol className="origem fontes" aria-label={`Fontes de ${NOMES[chave].toLowerCase()} por porção`}>
          {fontes.map((f) => (
            <li key={f.id}>
              <span>
                {f.nome}
                <small>{f.porcao}</small>
              </span>
              {!discreto && (
                <span>
                  {fmt1(f.n[chave])} g<small>{fmt(f.n.kcal)} kcal</small>
                </span>
              )}
            </li>
          ))}
        </ol>
      </section>

      <section className="cartao" aria-labelledby="t-base">
        <h2 id="t-base">De onde vêm estas dicas</h2>
        <ul className="lista-fontes">
          <li>Guia Alimentar para a População Brasileira, Ministério da Saúde, 2014.</li>
          <li>Prato saudável, Escola de Saúde Pública de Harvard, 2011.</li>
          <li>Posições da International Society of Sports Nutrition sobre proteína e sobre horário das refeições, 2017.</li>
          <li>Nutrientes da Tabela TACO (Unicamp) e porções da POF 2008-2009 (IBGE).</li>
        </ul>
        <p className="ajuda" style={{ marginTop: 12 }}>
          São orientações gerais, não um plano individual. Um nutricionista ajusta tudo isso para você.
        </p>
      </section>
    </>
  )
}
