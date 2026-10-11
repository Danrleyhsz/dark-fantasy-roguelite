# Game Design Document (GDD)

## Visão geral
**Gênero:** roguelite de ação 2D, fantasia sombria.
**Plataforma:** navegador desktop e celular.
**Público:** jogadores que gostam de combate responsivo, exploração, builds e partidas rejogáveis.
**Formato:** experiência single-player, sem exigir conta ou servidor no primeiro protótipo.
**Objetivo do protótipo:** validar movimentação, combate, leitura visual e diversão antes de ampliar o conteúdo.

## Fantasia central
O jogador é um guerreiro amaldiçoado que desce às ruínas de um reino decadente. Cada incursão combina salas de combate, escolhas de recompensa, relíquias e um confronto final. A morte encerra a incursão, mas parte da progressão permanente é preservada.

## Ciclo principal
1. Iniciar uma incursão.
2. Explorar uma sala e identificar ameaças.
3. Esquivar, atacar e derrotar inimigos.
4. Escolher uma recompensa: melhoria, relíquia ou recurso.
5. Avançar para salas mais perigosas.
6. Enfrentar um chefe ou morrer.
7. Gastar recursos persistentes para desbloquear melhorias e tentar novamente.

## Escopo inicial
- Um personagem jogável.
- Uma área temática com salas reutilizáveis.
- Três arquétipos de arma, implementados gradualmente.
- Três tipos básicos de inimigo e um chefe no primeiro marco jogável.
- Vida, dano, esquiva, invulnerabilidade curta após dano e feedback visual.
- Recompensas simples e pelo menos algumas melhorias entre incursões.
- Pausa, reinício e salvamento local.
- Tutorial curto e controles visíveis.
- Interface adaptada a desktop e toque.

## Combate
O combate deve ser legível e responsivo. Ataques inimigos precisam de sinais visuais claros. O jogador deve conseguir reconhecer alcance, tempo de ataque, dano recebido e estado de invulnerabilidade. Evitar excesso de partículas que esconda personagens ou perigos.

## Progressão e equilíbrio
- Melhorias durante a incursão alteram a estratégia, não apenas os números.
- Progressão permanente deve ajudar sem tornar o desafio irrelevante.
- Evitar monetização pay-to-win.
- Valores de vida, dano, recarga e recompensas devem ficar em configuração centralizada para facilitar testes.

## Direção narrativa
A história é contada por detalhes de cenário, descrições curtas, relíquias e encontros com chefes. Manter o texto conciso para priorizar a jogabilidade.

## Experiência e acessibilidade
- Redimensionamento responsivo.
- Opções de volume e intensidade de efeitos, quando houver áudio.
- Não depender exclusivamente de cor para comunicar perigo.
- Áreas clicáveis/tocáveis confortáveis em telas pequenas.
- Pausa acessível e feedback claro de derrota e vitória.

## Fora do escopo do primeiro protótipo
Multiplayer, PvP, backend obrigatório, mundo aberto, geração procedural complexa, dezenas de classes, loja com dinheiro real e sistemas online. Só considerar depois que o núcleo estiver divertido e estável.

## Critérios de sucesso do protótipo
- Abre em navegador moderno sem instalação especial.
- Jogador move, ataca, sofre dano e pode derrotar um inimigo.
- Reiniciar não deixa estados antigos corrompidos.
- Layout funciona em janela estreita e larga.
- Nenhum recurso essencial está ausente ou referenciado por caminho quebrado.
