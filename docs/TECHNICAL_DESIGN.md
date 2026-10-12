# Arquitetura técnica

## Objetivo
Jogo 2D de ação roguelite executado diretamente em navegadores modernos, com suporte a desktop e celular. Antes de alterar a stack, o Claude deve inspecionar o código existente e preservar o que já funciona.

## Stack
Preferir a tecnologia já configurada no repositório. Se ainda não houver stack definida, usar TypeScript e Vite para o ciclo de desenvolvimento, Canvas 2D para combate em tempo real e HTML/CSS para menus e HUD. Só adicionar engine ou biblioteca quando houver benefício concreto.

## Organização sugerida
- `src/game/`: regras, estado, combate, inimigos, itens e progressão.
- `src/rendering/`: desenho de cenários, personagens, efeitos e câmera.
- `src/input/`: teclado, mouse, controles de toque e remapeamento.
- `src/ui/`: menu, HUD, pausa, escolhas, vitória e derrota.
- `src/persistence/`: configurações e progresso local.
- `public/assets/`: imagens, áudio e demais recursos estáticos.

Adaptar a estrutura à base real; não mover arquivos apenas para corresponder ao exemplo.

## Loop e estado
Separar atualização lógica e renderização. Limitar o delta de tempo após troca de aba para evitar saltos. Usar estados explícitos para menu, partida, pausa, vitória e derrota. Reiniciar deve limpar entidades, timers, efeitos e listeners da partida anterior.

## Controles e telas
Desktop: WASD/setas, ataque e esquiva com instruções visíveis. Celular: controles de toque grandes, responsivos e sem depender de hover. Ajustar canvas à tela e ao device pixel ratio sem custo excessivo. Limpar teclas presas quando a janela perder foco.

## Salvamento
Usar armazenamento local apenas para configurações e progressão necessária. Validar os dados carregados e tratar indisponibilidade ou conteúdo corrompido sem impedir uma nova partida. Não enviar dados a servidores sem necessidade documentada.

## Desempenho e segurança
Evitar alocações desnecessárias por frame, eventos duplicados e loops sem limpeza. Não incluir tokens, chaves ou segredos no cliente. Assets externos devem ter origem e licença registradas. Manter contraste e reduzir efeitos que atrapalhem a leitura de ataques.

## Testes
Executar os comandos reais definidos no projeto. Verificar inicialização, movimento, colisões, dano, pausa, vitória/derrota, reinício, salvamento, controles por toque e build de produção. Relatar somente testes que foram executados.

## Requisitos técnicos da direção visual aprovada
Leia `docs/VISUAL_DIRECTION_APPROVED.md` antes de escolher a solução de renderização. A meta é RPG de ação isométrico com arte dark fantasy detalhada, não um jogo top-down plano.

- Inspecionar a stack atual antes de decidir. Se Canvas 2D não conseguir atender à qualidade e ao pipeline de assets desejados com desempenho razoável, avaliar WebGL ou uma engine web leve e justificar a escolha.
- Separar lógica do jogo e renderização. Organizar o renderizador para cenário em camadas, entidades, animações, efeitos, iluminação/névoa e HUD.
- Definir escala de mundo, ordenação de profundidade/eixo Y, colisões e projeção isométrica de forma consistente; manter movimento e ataques previsíveis.
- Carregar assets com fallback explícito, controlar tamanho e quantidade de texturas e otimizar efeitos para navegadores desktop e celulares.
- A primeira fatia vertical deve usar arte real integrada em pelo menos cenário, protagonista, um inimigo, um efeito e HUD. Placeholders só temporários e identificados.
- Não alegar fidelidade visual final com base apenas em mockups ou imagens geradas; validar com uma cena jogável capturada do navegador.

---

## Implementação atual (decisões registradas)

### Stack escolhida (11/10/2026)
- **TypeScript 7 + Vite 8**, como recomendado acima. **Canvas 2D** para o mundo, **HTML/CSS** para menus, HUD e controles de toque.
- **Sem dependências em tempo de execução.** Dependências de desenvolvimento: `vite`, `typescript`, `@types/node` (tipos dos testes) e `sharp` (só o pipeline de arte, `tools/art.mjs`).
- **Testes com o executor nativo do Node** (`node --test`, Node ≥ 22.18 roda `.ts` diretamente): evita adicionar Vitest. Por isso os imports usam extensão `.ts` e o `tsconfig` exige `erasableSyntaxOnly` (sem `enum`/`namespace`).
- Build com `--base=./`: a pasta `dist/` funciona em qualquer subcaminho (ex.: GitHub Pages).

### Comandos
| Comando | O que faz |
|---|---|
| `npm install` | instala as dependências de desenvolvimento |
| `npm run dev` | servidor de desenvolvimento em http://localhost:5173 |
| `npm test` | testes de lógica, fluxo e renderização (Node) |
| `npm run check` | checagem de tipos (`tsc`) |
| `npm run build` | checagem de tipos + build de produção em `dist/` |
| `npm run preview` | serve a build de produção em http://localhost:4173 |
| `npm run art` | reprocessa `art/raw/` em `public/assets/` e regera `src/rendering/art.gen.ts` |

### Estrutura real
- `src/game/` — regras puras, sem DOM: `config.ts` (valores de equilíbrio centralizados), `room.ts` (mapa, colisão, linha de visão, campo de fluxo BFS), `rooms.ts` (salas), `world.ts` (jogador, inimigos, combate, partículas), `game.ts` (estados de tela), `math.ts`.
- `src/rendering/` — `render.ts` (desenho), `theme.ts` (paleta), `assets.ts` (carregamento com fallback), `art.gen.ts` (manifesto gerado).
- `src/input/input.ts` — teclado, mouse e toque. `src/ui/ui.ts` — menus e HUD. `src/main.ts` — laço e ligação de tudo.
- `public/assets/` — arte processada. `art/raw/` — arte bruta gerada no Gemini (fonte do pipeline). `tools/art.mjs` — pipeline.
- `tests/` — `node:test`; `helpers.ts` traz um bot de combate e um contexto 2D falso que falha com NaN.
- `src/persistence/` ainda não existe (não há o que salvar até a Fase 2).

### Decisões
- **Vista top-down 3/4** (decisão não documentada no GDD; escolhida por ser a mais simples para salas, WASD e mira com mouse). Sprites olham para a direita e são espelhados.
- **Passo fixo de 1/60 s** com acumulador e delta limitado a 0,25 s; a lógica é determinística (PRNG com semente), o que permite testar lutas inteiras no Node.
- **Mundo lógico de 960×544** (30×17 tiles de 32 px), escalado para a tela mantendo a proporção; canvas respeita o `devicePixelRatio` (limitado a 2).
- **Estados de tela explícitos** em `game.ts`: `menu`, `playing`, `paused`, `victory`, `defeat`. Reiniciar cria um `World` novo: entidades, timers e efeitos vivem nele, então nada sobra da tentativa anterior. Listeners de entrada são registrados uma única vez.
- **Pausa automática** ao perder o foco da janela ou trocar de aba; as teclas presas são limpas no `blur`.
- **Feedback de combate**: hitstop curto, tremor de tela, partículas limitadas (máx. 160), brilho de dano, piscar durante invulnerabilidade, corpos que desvanecem.
- **Aviso de ataque inimigo** sem depender só de cor: pose de preparação, ícone "!", setor de perigo hachurado no chão que se preenche até o golpe.
- **Inimigo com campo de fluxo (BFS)** para contornar pilares quando não há linha de visão.
- **Camada estática** do cenário (piso, paredes, vitrais) pré-renderizada e refeita só no redimensionamento; colunas ficam na camada dinâmica para serem ordenadas por profundidade.
- `window.__game` fica exposto para os testes de fumaça no navegador.
