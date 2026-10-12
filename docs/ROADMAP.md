# Roadmap de desenvolvimento

A roadmap é incremental. O Claude deve inspecionar o código e marcar apenas tarefas realmente concluídas. Priorizar uma versão jogável no navegador antes de ampliar conteúdo.

## Fase 0: diagnóstico da base
- [ ] Inspecionar arquivos, stack, dependências, scripts e estado do projeto.
- [ ] Executar o projeto e registrar erros reais.
- [ ] Comparar a implementação com GDD, ART_BIBLE e TECHNICAL_DESIGN.
- [ ] Identificar assets existentes e atualizar ASSET_MANIFEST.
**Entrega:** diagnóstico curto e plano da próxima etapa, sem reescrever código válido.

## Fase 1: primeira sala jogável
- [ ] Menu inicial e instruções de controle.
- [ ] Uma sala com colisões básicas.
- [ ] Personagem com movimento responsivo.
- [ ] Um ataque principal e feedback visual de acerto.
- [ ] Um inimigo com comportamento e ataque identificáveis.
- [ ] Vida, dano, derrota e reinício confiável.
- [ ] Controles de teclado e primeira versão dos controles de toque.
**Critério de conclusão:** abrir no navegador, movimentar, atacar, receber dano, perder e reiniciar sem recarregar a página.

## Fase 2: ciclo roguelite
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
