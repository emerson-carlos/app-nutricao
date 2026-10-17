# Nutrição

App pessoal de nutrição e treino, instalável no celular (PWA). Os dados ficam só no aparelho.

## O que já faz (fases 1 e 2)

- Perfil com objetivo editável e metas diárias de calorias, proteína, carboidrato, gordura, gordura saturada, fibras e água.
- Registro das refeições em gramas ou em medidas caseiras (as do IBGE já vêm prontas; você pode criar outras).
- Cadastro de alimento pelo rótulo da embalagem (whey, produtos de marca).
- Contador de água com copos de 200 a 500 ml ou valor manual; a meta sobe em dia de treino.
- Ver de quais alimentos veio cada nutriente do dia.
- Aba Guia: como montar cada refeição e onde encontrar cada nutriente.
- Registro de treino (calistenia e esteira) com gasto estimado, plano da semana e balanço do dia e da semana.
- Modo discreto, que esconde os números.
- Backup e restauração em arquivo.

As fórmulas e as fontes estão em [docs/fontes.md](docs/fontes.md).

## Rodar no computador

```bash
npm install
npm run dev      # abre em http://localhost:5173/app-nutricao/
npm test         # testes dos cálculos
npm run build    # gera a versão final em dist/
```
