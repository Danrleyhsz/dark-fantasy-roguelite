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

### Stack (11/10/2026, mantida após a direção isométrica)
- **TypeScript 7 + Vite 8**, **Canvas 2D** para o mundo, **HTML/CSS** para menus, HUD e controles de toque. Avaliado: WebGL ou engine web não foram necessários. Canvas 2D com transformações afins projeta texturas pintadas no isométrico, a iluminação usa um canvas de luz em meia resolução e o jogo roda a 60 fps no Chromium do app.
- **Sem dependências em tempo de execução.** Desenvolvimento: `vite`, `typescript`, `@types/node` (tipos dos testes) e `sharp` (só o pipeline de arte).
- **Testes com o executor nativo do Node** (`node --test`; Node ≥ 22.18 roda `.ts` direto). Por isso os imports têm extensão `.ts` e o `tsconfig` exige `erasableSyntaxOnly`.
- Build com `--base=./`: `dist/` funciona em qualquer subcaminho (GitHub Pages).
- **Publicação:** GitHub Pages serve o ramo `gh-pages`, que guarda só a build (um commit por publicação, com `.nojekyll`). `tools/deploy.mjs` monta o commit com um índice temporário, sem tocar na cópia de trabalho. URL: https://danrleyhsz.github.io/dark-fantasy-roguelite/

### Comandos
| Comando | O que faz |
|---|---|
| `npm install` | instala as dependências de desenvolvimento |
| `npm run dev` | servidor de desenvolvimento em http://localhost:5173 (`?debug` liga atalhos de teste) |
| `npm test` | 73 testes de lógica, fluxo, RPG, armas, salvamento e renderização (Node) |
| `npm run check` | checagem de tipos (`tsc`) |
| `npm run build` | checagem de tipos + build de produção em `dist/` |
| `npm run preview` | serve a build de produção em http://localhost:4173 |
| `npm run art` | reprocessa `art/raw/iso/` em `public/assets/` (folhas sobre magenta, efeitos sobre preto) e regera `src/rendering/art.gen.ts` |
| `npm run deploy` | build + publica `dist/` no ramo `gh-pages` (`tools/deploy.mjs`) |
| `node tools/balance.ts 30 all` | simula 30 incursões por arma com o bot dos testes e resume a dificuldade |

### Estrutura real
- `src/game/` — regras puras, sem DOM: `config.ts` (equilíbrio centralizado), `room.ts`/`rooms.ts` (mapas, colisão, linha de visão, campo de fluxo), `world.ts` (incursão, jogador, salas, ondas, saque, projéteis), `enemies.ts` (IA por dados e áreas de perigo), `combat.ts` (dano, cura, partículas, números), `hero.ts` (atributos derivados, nível), `items.ts` (equipamentos e raridade), `upgrades.ts` (bênçãos e Relicário), `game.ts` (estados de tela e progressão salva).
- `src/rendering/` — `render.ts` (renderizador isométrico), `iso.ts` (projeção), `theme.ts`, `assets.ts` (carga com fallback), `art.gen.ts` (manifesto gerado).
- `src/input/input.ts` (teclado, mouse, toque), `src/ui/ui.ts` (menus, HUD, minimapa), `src/audio/sfx.ts` (sons sintetizados), `src/persistence/save.ts` (localStorage validado), `src/main.ts` (laço e ligação).
- `public/assets/` — arte processada. `art/raw/iso/` — originais do Gemini. `tools/` — `art.mjs` (pipeline), `balance.ts` (simulação) e `deploy.mjs` (publicação).
- `tests/` — `node:test`; `helpers.ts` tem o bot de combate, o piloto de incursão e um contexto 2D falso que falha com NaN.

### Vista isométrica
- **Projeção 2:1** em `iso.ts`: mundo `(x, y, z)` → tela `(x − y, (x + y)/2 − z)`. Colisão, combate e IA continuam em coordenadas de mundo; só o desenho e a entrada passam pela projeção.
- **Entrada:** teclas e joystick indicam direções da **tela** e são convertidas para o mundo (W sobe na tela). O clique é projetado de volta no chão sob o cursor.
- **Câmera** segue o jogador com suavização e fica presa aos limites da sala. O palco ocupa a tela inteira: em paisagem cabe a vista de referência 960×544, em retrato a escala é pela largura (560 unidades), então os personagens ficam legíveis no celular.
- **Ordem de desenho:** piso (textura projetada por transformação afim, recortada às lajes) → sombras e áreas de perigo no chão → paredes do fundo (faces norte e oeste texturizadas, com vitrais, brasões e porta) → saque → colunas, braseiros, estátuas, corpos, inimigos e jogador ordenados por `x + y` → projéteis e partículas → muretas baixas ao sul/leste → névoa → luz → ícones, números e vinheta de dano.
- **Legibilidade:** se algo desenhado depois encobre o jogador, a silhueta dele é redesenhada translúcida por cima.
- **Efeitos pintados:** `drawFx` desenha quadros de `fx/fx.jpg` com mistura aditiva (preto = nada). O corte é recortado ao setor já varrido do golpe, então o rastro pintado coincide com a área que acerta. Sem a imagem, cada efeito volta ao desenho em código.
- **Luz:** canvas de escuridão em meia resolução com "furos" radiais (jogador, braseiros, candelabros, projéteis, saque, porta aberta e chefe) e brilho aditivo âmbar nas chamas.

### Sistemas de jogo
- **Incursão:** 5 salas (`CONFIG.run.encounters`). Nas salas 2–4 há duas ondas; a segunda surge longe do jogador, intocável por 0,7 s e com aviso. Vida e dano dos inimigos crescem por sala.
- **Inimigos por dados:** quatro tipos de ataque reutilizáveis (varredura, investida, rajada e impacto em área) em uma única máquina de estados (`idle → chase → windup → act → recover`, mais `stagger`/`stun`). A mesma geometria de perigo (`dangers()`) aplica o dano, é desenhada no chão e orienta o bot. Investidas só começam com caminho livre para o corpo inteiro (antes o Flagelante investia contra a coluna à frente em ciclo).
- **Bot dos testes** (`tests/helpers.ts`): foge das áreas de perigo, sai da linha de projéteis, usa a Ira Flamejante com dois ou mais inimigos perto e contorna obstáculos pelo campo de fluxo. Joga incursões completas nos testes e em `tools/balance.ts`.
- **Armas:** `CONFIG.weapons` define cada arquétipo (multiplicadores de dano, alcance, recarga e recuo; abertura; tempos do golpe; crítico; Fé por acerto; quebra de guarda; forma do rastro). `deriveStats` aplica a arma; o renderizador desenha arco ou estocada a partir dos mesmos números que acertam.
- **Colisão:** caixa do corpo contra tiles, em subpassos de meio tile. Raspar uma quina por até 3 unidades desliza o corpo para o lado livre (sem isso, o Flagelante, do tamanho de um tile, travava ao lado de colunas). De frente para a parede o corpo continua parando no mesmo ponto.
- **RPG:** atributos derivados em uma única função (`deriveStats`) a partir de arma, nível, equipamento, bênçãos e Relicário. Experiência e nível são salvos; equipamento e bênçãos valem só na incursão. Ira Flamejante gasta Fé, o recurso que regenera e sobe a cada golpe.
- **Telas** (`game.ts`): `menu`, `playing`, `paused`, `reward`, `victory`, `defeat`. Reiniciar cria um mundo novo; os listeners são registrados uma vez.
- **Salvamento:** chave `dark-fantasy-roguelite/save`, com campos validados e limitados. JSON corrompido ou armazenamento indisponível voltam ao padrão. Falha de escrita mostra um aviso, sem travar.
- **Áudio:** sons sintetizados com WebAudio a partir das mudanças de estado entre quadros. O áudio é liberado no primeiro gesto e o volume é salvo (0 = mudo).
- **Depuração:** com `?debug`, `window.__debug.room(n)` vai para a sala `n` e `frames(n)` avança quadros sem `requestAnimationFrame` (útil com o painel oculto). `window.__game` fica sempre exposto para testes de fumaça.

### Plano de otimização (medido e previsto)
Implementado:
- Simulação em passo fixo de 1/60 s, com delta limitado a 0,25 s.
- Partículas limitadas a 240 e removidas por troca com o último elemento.
- Silhuetas tingidas geradas uma vez por folha.
- Geometria da sala calculada só ao trocar de sala.
- Luz em meia resolução.
- DPR limitado a 2.
- HUD escreve no DOM só quando o valor muda; o minimapa tem a camada da sala em cache.
- Arte em PNG com paleta e JPEG: ~1,1 MB no total. JS de 66 KB (25 KB com gzip), CSS de 10 KB.

Próximos passos se o desempenho cair em celulares fracos:
1. Pré-renderizar piso e paredes do fundo num canvas por sala.
2. Reaproveitar os gradientes de luz e de névoa em vez de criá-los a cada quadro.
3. Reduzir a névoa e a luz em telas pequenas ou com "Reduzir clarões" ligado.
4. Medir com o Performance do Chrome num aparelho real.
