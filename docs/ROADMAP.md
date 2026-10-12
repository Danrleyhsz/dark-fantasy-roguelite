# Roadmap de desenvolvimento

A roadmap é incremental. O Claude deve inspecionar o código e marcar apenas tarefas realmente concluídas. Priorizar uma versão jogável no navegador antes de ampliar conteúdo.

## Fase 0: diagnóstico da base — concluída em 11/10/2026
- [x] Inspecionar arquivos, stack, dependências, scripts e estado do projeto. *Havia só documentação (CLAUDE.md, README, docs/); nenhum código, script, dependência ou asset.*
- [x] Executar o projeto e registrar erros reais. *Não havia o que executar.*
- [x] Comparar a implementação com GDD, ART_BIBLE e TECHNICAL_DESIGN. *Nada implementado; stack escolhida conforme o TECHNICAL_DESIGN (TS + Vite + Canvas 2D).*
- [x] Identificar assets existentes e atualizar ASSET_MANIFEST. *Nenhum asset de jogo; `referencia/` (local, fora do git) tem 5 imagens de terceiros só para direção estética.*
**Entrega:** diagnóstico registrado aqui e plano seguido na Fase 1.

## Fase 1: primeira sala jogável — concluída em 11/10/2026
- [x] Menu inicial e instruções de controle. *Menu com controles de teclado, mouse e toque; dica de controles nos primeiros 8 s.*
- [x] Uma sala com colisões básicas. *Catedral 30×17 tiles com pilares; testes de colisão, deslizamento e anti-atravessamento.*
- [x] Personagem com movimento responsivo. *WASD/setas/joystick; ~210 px/s medidos no navegador.*
- [x] Um ataque principal e feedback visual de acerto. *Golpe em arco com recarga e buffer; hitstop, tremor, brilho e partículas.*
- [x] Um inimigo com comportamento e ataque identificáveis. *Penitente: reza → persegue (contorna pilares) → prepara com aviso → golpeia → recupera.*
- [x] Vida, dano, derrota e reinício confiável. *Invulnerabilidade pós-dano; telas de vitória/derrota; reinício sem recarregar testado no navegador e em 50 reinícios seguidos no Node.*
- [x] Controles de teclado e primeira versão dos controles de toque. *Joystick flutuante + toque à direita/botão Atacar, testados com eventos de toque sintéticos.*
**Critério de conclusão:** abrir no navegador, movimentar, atacar, receber dano, perder e reiniciar sem recarregar a página. *Verificado no Chromium do app (servidor de desenvolvimento e build de produção) e por 29 testes automatizados.*

## Fase 2: ciclo roguelite — EM ANDAMENTO (interrompida em 11/10/2026)
**Estado do código: em transição, `npm run check` acusa 40 erros e os testes não foram rodados.** A lógica nova já foi escrita (`config.ts`, `world.ts`, `combat.ts`, `enemies.ts`, `upgrades.ts`, `rooms.ts`, `game.ts`, `persistence/save.ts`, `ui.ts`, `input.ts`, `main.ts`, `index.html`, `style.css`), mas falta:
1. Adaptar `src/rendering/render.ts`: estados `act`/`stun`, áreas de perigo via `dangers()` de `enemies.ts`, desenho de projéteis, partícula `holy`, sprites dos novos inimigos (com fallback) e o 4º parâmetro `settings` (reduzir tremor).
2. Atualizar os testes (`helpers.ts` usa campos antigos de `CONFIG.enemies`; `InputState` ganhou `dodge`; a incursão começa com 2 inimigos) e criar testes de esquiva, projéteis, bênçãos, troca de sala, chefe e salvamento.
3. Arte: processar `art/raw/acolyte-sheet.jpg` (versão editada, sem foices; adicionar ao `tools/art.mjs`) e gerar no Gemini as folhas do Flagelante, do Anjo Caído, dos ícones (8 bênçãos + cinzas, nessa ordem) e de efeitos.
4. Verificar no navegador e atualizar TEST_PLAN, ASSET_MANIFEST e `art/PROMPTS.md`.

Itens da fase:
- [ ] Adicionar pelo menos mais dois padrões de inimigos.
- [ ] Criar encontros ou salas em sequência.
- [ ] Implementar recompensas e escolhas de melhorias significativas.
- [ ] Adicionar esquiva ou ação defensiva.
- [ ] Implementar vitória, derrota e resumo da tentativa.
**Critério de conclusão:** uma partida completa tem começo, progressão e fim.

## Fase 3: arte e experiência
- [ ] Aplicar a direção visual da ART_BIBLE.
- [ ] Substituir placeholders prioritários por assets revisados.
- [ ] Adicionar animações de ataque, preparação, dano e esquiva.
- [ ] Refinar HUD, menus, pausa e configurações.
- [ ] Ajustar layout e áreas de toque para celular.
- [ ] Adicionar áudio opcional com controles.
**Critério de conclusão:** a ação permanece clara em desktop e telas pequenas.

## Fase 4: balanceamento e qualidade
- [ ] Ajustar vida, dano, velocidade e dificuldade com testes reais.
- [ ] Testar salvamento e recuperação de dados inválidos.
- [ ] Verificar reinício repetido, foco da janela e limpeza de eventos.
- [ ] Corrigir erros de console, carregamento e desempenho.
- [ ] Executar TEST_PLAN.md e registrar limitações.
**Critério de conclusão:** o fluxo principal funciona de forma consistente.

## Fase 5: publicação
- [ ] Documentar comandos de instalação, desenvolvimento e build.
- [ ] Confirmar build de produção.
- [ ] Configurar hospedagem estática compatível, como GitHub Pages, se adequada.
- [ ] Testar a URL publicada em desktop e celular.
- [ ] Atualizar README com instruções reais.
**Critério de conclusão:** outra pessoa consegue abrir o link e jogar sem instalar nada.

## Regras de priorização
Bugs que impedem jogar têm prioridade sobre conteúdo novo. Não começar sistemas complexos, backend ou multiplayer sem necessidade documentada. Cada tarefa concluída deve indicar evidência ou teste executado.

## Ajuste de prioridade: direção visual aprovada
A especificação `docs/VISUAL_DIRECTION_APPROVED.md` foi aprovada pelo usuário e prevalece sobre qualquer item que pressuponha estética genérica ou pixel art.

### Marco prioritário: fatia vertical isométrica de qualidade
- [ ] Inspecionar a base, stack, assets e limitações de desempenho antes de reescrever sistemas.
- [ ] Confirmar uma solução de renderização apropriada para arte detalhada e câmera isométrica.
- [ ] Montar uma arena/ruína gótica com profundidade, iluminação, sombras e atmosfera.
- [ ] Integrar protagonista e pelo menos um inimigo com silhuetas legíveis e animações essenciais.
- [ ] Integrar ataque, impacto/efeito, HUD gótico, vida/recursos e objetivo ou minimapa.
- [ ] Demonstrar progressão RPG concreta, como equipamento/recompensa, atributo ou habilidade.
- [ ] Capturar e avaliar o jogo funcional no navegador em desktop e viewport estreita.
- [ ] Registrar assets reais e suas origens no `ASSET_MANIFEST.md`.

**Critério para avançar:** a cena deve se aproximar claramente das referências aprovadas, sem depender de uma única imagem estática e sem comprometer a legibilidade do combate. Não marcar tarefas como concluídas sem implementação e teste reais.
