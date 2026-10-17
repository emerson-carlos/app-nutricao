# Nutrição

App pessoal de nutrição e treino, instalável no celular (PWA). Os dados ficam só no aparelho.

## O que já faz (fase 1)

- Perfil com objetivo editável e metas diárias de calorias, proteína, carboidrato, gordura, gordura saturada, fibras e água.
- Registro das refeições em gramas ou em medidas caseiras que você salva uma vez.
- Contador de água em copos de 250 ml.
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
