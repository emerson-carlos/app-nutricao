# Visual

Decisões do visual (outubro de 2026), tomadas com as skills ui-ux-pro-max, mobile-native e animate e auditadas com a web-design-guidelines da Vercel. Para reinstalar as skills: `npx skills experimental_install` (lista em `skills-lock.json`).

- **Fonte:** Plus Jakarta Sans (variável, servida pelo próprio app para funcionar offline), números tabulares.
- **Cores:** verde-folha `#0A7350` para comida e ações, azul `#1D67A8` para água, uma cor por nutriente (sempre com nome e número ao lado). Sem vermelho de alerta. Todas as combinações de texto passam de 4,5:1 nos temas claro e escuro.
- **Ícones:** Lucide, traço único, decorativos escondidos do leitor de tela.
- **Tela Hoje:** o anel de calorias é o destaque; o resto é calmo.
- **Toque:** alvos de 48 px, resposta no toque (`:active`), sem destaque azul do Android, sem puxar para atualizar.
- **Movimento:** só o que responde a uma ação (janela que sobe e desce, barras e anel que crescem, aviso que sobe). Curvas `--ease-out` e `--ease-drawer`, até 320 ms. Com "menos movimento" ligado, as transições de posição somem.
- **Navegação:** a aba atual fica no endereço (`#perfil`), então o Voltar do Android funciona. Remover um alimento mostra "Desfazer".
