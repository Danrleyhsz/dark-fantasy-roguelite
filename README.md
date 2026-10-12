# dark-fantasy-roguelite
Dark fantasy roguelite for the browser.

Roguelite de ação 2D em fantasia sombria, feito para rodar direto no navegador (TypeScript + Vite + Canvas 2D, sem dependências em tempo de execução).

## Rodar
Requer Node.js 22.18 ou mais recente.

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # testes automatizados
npm run build      # build de produção em dist/
npm run preview    # serve dist/ em http://localhost:4173
```

## Controles
- **Mover:** WASD ou setas; no celular, arraste na metade esquerda da tela.
- **Atacar:** J, Z ou clique (mira no cursor); no celular, toque na metade direita ou no botão Atacar.
- **Pausar:** Esc, P ou o botão ❚❚.

## Estado
Fase 1 concluída: uma sala jogável com movimento, combate, um inimigo (o Penitente), vitória, derrota e reinício. Veja `docs/ROADMAP.md` para o andamento e `docs/` para o design completo.
