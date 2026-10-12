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

## Decisões registradas na implementação
Decisões que o GDD não definia, escolhidas pela opção mais simples e reversível e ajustadas à direção aprovada. Valores exatos em `src/game/config.ts`.
- **Câmera:** isométrica 2:1, seguindo o jogador. As paredes norte e oeste mostram a face interna; as muretas sul e leste são baixas para não esconder a luta.
- **Controles:** WASD/setas movem na direção da tela; J, Z ou clique atacam (o clique mira no chão sob o cursor); Espaço, Shift ou botão direito esquivam; Q ou E usam a Ira Flamejante; Esc ou P pausam. No toque: joystick à esquerda, toque à direita ou botão Atacar, botões Esquivar e Ira.
- **Combate:** golpe com a arma escolhida (base: 10 de dano, 8% de crítico ×1,75); esquiva com invulnerabilidade; 1 s de invulnerabilidade após dano. Todo ataque inimigo tem preparação visível (pose, "!" e área hachurada no chão).
- **Arquétipos de arma (escolha no menu, salva):** todos da família da espada, para combinar com o herói pintado. **Espada Longa:** arco médio e equilibrado; cada golpe que acerta rende o dobro de Fé (favorece a Ira Flamejante). **Montante:** arco largo, lento e pesado (×1,8 de dano, empurra mais); quebra a guarda e interrompe a preparação de Penitentes e Acólitos (não do Flagelante nem do chefe). **Estoque:** estocada longa, estreita e rápida (+10% de crítico); alcança de fora do golpe do Penitente, mas exige mira. As armas encontradas no chão são do arquétipo em uso e só mudam os números.
- **Inimigos:** Penitente (golpe de foice em arco), Acólito (mantém distância e arremessa brasas), Flagelante (investida em linha; fica atordoado ao bater na parede) e o chefe Anjo Caído (estocada, leque de penas e impacto em área; fase 2 abaixo de 50% de vida, com preparações mais curtas e mais penas).
- **Incursão:** 5 salas (Nave em Ruínas, Corredor dos Penitentes, Cripta Profanada, Claustro Queimado e Altar do Anjo Caído). As salas 2–4 têm duas ondas, e os inimigos ficam mais fortes a cada sala. Limpar uma sala oferece 3 **bênçãos** e só então a porta norte abre.
- **Bênçãos (build da incursão):** Coração de Espinhos, Lâmina Longa, Fúria Penitente, Passo Sombrio, Cálice de Sangue, Coroa de Espinhos, Lâmina Sagrada e Auréola Partida. Cada uma muda a estratégia (alcance, ritmo, esquiva ofensiva, cura por abate, retaliação, onda à distância, rebater projéteis).
- **Progressão RPG:** nível 1–20 com experiência por abate. Cada nível dá +1 em Força (dano), Vitalidade (vida) e Destreza (velocidade e crítico) e cura 30%. **Nível e experiência persistem entre incursões.**
- **Equipamento:** arma, armadura e relíquia, com raridade Comum, Mágico, Raro ou Lendário (cor e nome). O item cai no chão; ao pegar, é equipado se for melhor ou convertido em cinzas. Equipamento e bênçãos valem só para a incursão.
- **Habilidade e recurso:** Ira Flamejante (giro de fogo ao redor, empurra e queima projéteis) gasta 35 de **Fé**, que regenera e sobe a cada golpe que acerta.
- **Entre incursões:** cinzas (abates + salas + itens convertidos + vitória) compram melhorias permanentes no **Relicário** (vida máxima, velocidade do golpe, recarga da esquiva, até 3 níveis cada).
- **Título provisório:** "Dark Fantasy Roguelite" (nome do repositório) até haver um nome definido.

## Critérios de sucesso do protótipo
- Abre em navegador moderno sem instalação especial.
- Jogador move, ataca, sofre dano e pode derrotar um inimigo.
- Reiniciar não deixa estados antigos corrompidos.
- Layout funciona em janela estreita e larga.
- Nenhum recurso essencial está ausente ou referenciado por caminho quebrado.

## Revisão de direção aprovada pelo usuário
A especificação de referência é `docs/VISUAL_DIRECTION_APPROVED.md` e prevalece sobre descrições conflitantes neste documento.

- **Gênero:** RPG de ação com progressão e estrutura roguelite.
- **Câmera:** visão de cima em perspectiva isométrica.
- **Meta visual:** ilustração dark fantasy detalhada, com ruínas góticas, arquitetura antiga, luz dramática, névoa, materiais ricos e personagens/monstros distintos. Não usar pixel art nem formas básicas como estilo final.
- **HUD:** acabamento gótico ornamental e legível, com vida/recursos, habilidades, minimapa e objetivo da missão quando adequado.
- **Progressão RPG:** atributos, equipamentos, raridades, habilidades e builds devem ser pilares explícitos, além das melhorias entre incursões.
- **Primeira fatia vertical:** área gótica isométrica, protagonista controlável, inimigo funcional, ataque/efeito visual, HUD e uma progressão ou recompensa demonstrável.
- **Critério de arte:** a captura precisa vir do protótipo funcional e mostrar os assets realmente integrados; imagens conceituais servem de referência e não contam como gameplay implementado.
