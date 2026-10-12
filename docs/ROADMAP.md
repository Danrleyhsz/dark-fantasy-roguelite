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

## Fase 2: ciclo roguelite — concluída em 12/10/2026
- [x] Adicionar pelo menos mais dois padrões de inimigos. *Acólito (brasas à distância, mantém distância) e Flagelante (investida em faixa, atordoado ao bater na parede), além do chefe Anjo Caído com três ataques e fase 2.*
- [x] Criar encontros ou salas em sequência. *5 salas (3 layouts sorteados + arena do chefe), porta norte que abre após a escolha de bênção, segunda onda nas salas 2–4.*
- [x] Implementar recompensas e escolhas de melhorias significativas. *3 bênçãos por sala entre 8 que mudam a estratégia; equipamentos com raridade no chão.*
- [x] Adicionar esquiva ou ação defensiva. *Esquiva com invulnerabilidade, recarga e buffer; atravessa inimigos.*
- [x] Implementar vitória, derrota e resumo da tentativa. *Resumo com sala alcançada, abates, dano, nível, tempo, bênçãos e cinzas.*
- [x] *Do GDD:* progressão entre incursões e salvamento local. *Relicário (3 melhorias permanentes) + nível do herói salvos com validação.*
**Critério de conclusão:** uma partida completa tem começo, progressão e fim. *Verificado por incursões completas do bot (testes) e pelo fluxo real até a vitória na build de produção.*

## Fase 3: arte e experiência — concluída em 12/10/2026
- [x] Aplicar a direção visual da ART_BIBLE. *Refeita para a direção isométrica pintada aprovada; ver marco prioritário.*
- [x] Substituir placeholders prioritários por assets revisados. *Herói, 3 inimigos, chefe, piso, parede, 8 props, 16 ícones e arte de capa gerados no Gemini (ASSET_MANIFEST). Efeitos e molduras do HUD continuam em código/CSS.*
- [x] Adicionar animações de ataque, preparação, dano e esquiva. *Poses por estado (frente/costas no herói), brilho de preparação, clarão de dano, queda na morte, rastro da esquiva, surgimento das ondas.*
- [x] Refinar HUD, menus, pausa e configurações. *HUD gótico (orbes, ações com recarga, XP, minimapa, objetivo), painel do personagem na pausa, opções de tremor e volume.*
- [x] Ajustar layout e áreas de toque para celular. *Tela cheia com câmera adaptável; em retrato a escala é pela largura; barras compactas e botões grandes no toque.*
- [x] Adicionar áudio opcional com controles. *Efeitos sintetizados (WebAudio), volume salvo, 0 = mudo. Sem música.*
**Critério de conclusão:** a ação permanece clara em desktop e telas pequenas. *Capturas em 800×600, 844×390 e 375×812 (emulação).*

## Fase 4: balanceamento e qualidade — concluída em 12/10/2026 (com limitações)
- [x] Ajustar vida, dano, velocidade e dificuldade com testes reais. *Simulação com bot (`tools/balance.ts`): de trivial (20/20 vitórias, 76 s) para 27/30 com ondas, escala por sala e chefe com 600 de vida. Falta teste com pessoas.*
- [x] Testar salvamento e recuperação de dados inválidos. *`save.test.ts`.*
- [x] Verificar reinício repetido, foco da janela e limpeza de eventos.
- [x] Corrigir erros de console, carregamento e desempenho. *Console sem erros; corrigidos: props cortados pelo pipeline, jogador encoberto pelo chefe, arte de capa com URL relativa quebrada, HUD sobreposto em retrato, fase 2 do chefe calculada pela vida base (e não pela escalada), erro fatal ao clicar durante o carregamento.*
- [x] Executar TEST_PLAN.md e registrar limitações. *Sem aparelho físico, Firefox ou Safari.*
**Critério de conclusão:** o fluxo principal funciona de forma consistente.

## Fase 5: publicação — concluída em 12/10/2026
- [x] Documentar comandos de instalação, desenvolvimento e build. *README, CLAUDE.md e TECHNICAL_DESIGN.*
- [x] Confirmar build de produção. *`npm run build` sem erros; `npm run preview` testado.*
- [x] Configurar hospedagem estática compatível, como GitHub Pages, se adequada. *GitHub Pages pelo ramo `gh-pages` (só a build), publicado com `npm run deploy`: https://danrleyhsz.github.io/dark-fantasy-roguelite/*
- [x] Testar a URL publicada em desktop e celular. *HTTPS, 12 assets com HTTP 200, sem erros no console; teclado, mouse, pausa e painel do personagem em desktop; joystick, botões Atacar/Esquivar/Ira e toque na metade direita em emulação 375×812, sem rolagem horizontal. Falta aparelho físico.*
- [x] Atualizar README com instruções reais.
**Critério de conclusão:** outra pessoa consegue abrir o link e jogar sem instalar nada.

## Regras de priorização
Bugs que impedem jogar têm prioridade sobre conteúdo novo. Não começar sistemas complexos, backend ou multiplayer sem necessidade documentada. Cada tarefa concluída deve indicar evidência ou teste executado.

## Ajuste de prioridade: direção visual aprovada
A especificação `docs/VISUAL_DIRECTION_APPROVED.md` foi aprovada pelo usuário e prevalece sobre qualquer item que pressuponha estética genérica ou pixel art.

### Marco prioritário: fatia vertical isométrica de qualidade — concluído em 12/10/2026
- [x] Inspecionar a base, stack, assets e limitações de desempenho antes de reescrever sistemas. *A lógica em coordenadas de mundo (colisão, combate, IA, testes) foi mantida; só o desenho e a entrada passaram a ser isométricos.*
- [x] Confirmar uma solução de renderização apropriada para arte detalhada e câmera isométrica. *Canvas 2D com transformações afins e canvas de luz; WebGL/engine não foram necessários (TECHNICAL_DESIGN).*
- [x] Montar uma arena/ruína gótica com profundidade, iluminação, sombras e atmosfera. *Paredes texturizadas com vitrais, brasões e porta; colunas, estátuas, braseiros e candelabros; luz quente com escuridão ambiente, névoa e brasas.*
- [x] Integrar protagonista e pelo menos um inimigo com silhuetas legíveis e animações essenciais. *Herói com 8 poses; 3 inimigos e chefe pintados.*
- [x] Integrar ataque, impacto/efeito, HUD gótico, vida/recursos e objetivo ou minimapa. *Arco do golpe, anel de fogo, números de dano; orbes de Vida e Fé, ações, XP, minimapa e objetivo.*
- [x] Demonstrar progressão RPG concreta, como equipamento/recompensa, atributo ou habilidade. *Os três: equipamento com raridade, atributos por nível (persistentes) e a habilidade Ira Flamejante.*
- [x] Capturar e avaliar o jogo funcional no navegador em desktop e viewport estreita.
- [x] Registrar assets reais e suas origens no `ASSET_MANIFEST.md`.

**Critério para avançar:** a cena deve se aproximar claramente das referências aprovadas, sem depender de uma única imagem estática e sem comprometer a legibilidade do combate. Não marcar tarefas como concluídas sem implementação e teste reais.
