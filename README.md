# dark-fantasy-roguelite
Dark fantasy roguelite for the browser.

RPG de ação isométrico com estrutura roguelite, em fantasia sombria, que roda direto no navegador (desktop e celular). TypeScript + Vite + Canvas 2D, sem dependências em tempo de execução. A arte foi gerada no Google Gemini e processada por um pipeline próprio.

Um cavaleiro amaldiçoado desce às ruínas de uma catedral, atravessa cinco salas de penitentes, acólitos e flagelantes, escolhe bênçãos que mudam o estilo de luta, coleta equipamentos de raridades variadas e enfrenta o Anjo Caído. Morrer encerra a incursão, mas o nível do herói e as cinzas gastas no Relicário permanecem.

## Jogar
- **Online:** https://danrleyhsz.github.io/dark-fantasy-roguelite/ (GitHub Pages; também no celular).
- **Local:** requer Node.js 22.18 ou mais recente.

```bash
npm install
npm run dev        # http://localhost:5173
```

## Controles
| Ação | Teclado e mouse | Toque |
|---|---|---|
| Mover | WASD ou setas | arrastar na metade esquerda |
| Atacar | J, Z ou clique (mira no cursor) | tocar na metade direita ou botão Atacar |
| Esquivar | Espaço, Shift ou botão direito | botão Esquivar |
| Ira Flamejante | Q ou E (gasta Fé) | botão Ira |
| Escolher bênção | clique ou teclas 1, 2 e 3 | tocar na carta |
| Pausar e ver o personagem | Esc ou P | botão ❚❚ |

## Desenvolvimento
```bash
npm test           # 62 testes (lógica, RPG, salvamento, renderização, incursão completa)
npm run check      # checagem de tipos
npm run build      # build de produção em dist/
npm run preview    # serve dist/ em http://localhost:4173
npm run art        # reprocessa a arte de art/raw/iso/ para public/assets/
npm run deploy     # build + publica dist/ no ramo gh-pages (GitHub Pages)
node tools/balance.ts 30   # simula 30 incursões com o bot e resume a dificuldade
```

Abrir com `?debug` na URL liga atalhos de teste no console (`__debug.room(4)` vai à sala do chefe).

## Documentação
- `docs/VISUAL_DIRECTION_APPROVED.md`: direção aprovada (prioridade máxima)
- `docs/GDD.md`: design do jogo e decisões registradas
- `docs/ART_BIBLE.md`: direção de arte e produção
- `docs/TECHNICAL_DESIGN.md`: arquitetura, comandos e plano de otimização
- `docs/ASSET_MANIFEST.md`: inventário de arte e áudio, com origem e licença
- `docs/ROADMAP.md`: andamento por fase, com evidências
- `docs/TEST_PLAN.md`: o que foi testado, onde e como
