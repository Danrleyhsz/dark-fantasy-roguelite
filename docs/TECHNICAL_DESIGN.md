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
