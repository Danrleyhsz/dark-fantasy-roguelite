# Catálogo de recursos (Asset Manifest)

Este documento registra os recursos visuais e sonoros do jogo. Atualize-o sempre que um asset for adicionado, substituído ou removido. Não marcar placeholders como arte final.

## Convenções
- Guardar recursos do jogo em `public/assets/` ou no local já estabelecido pelo projeto.
- Usar nomes descritivos, minúsculos e separados por hífen.
- Registrar origem, licença e atribuição exigida para todo recurso externo.
- Para arte gerada por IA, registrar ferramenta/origem, prompt ou referência de produção quando útil, formato, dimensões e revisão de consistência.
- Não referenciar arquivos que não existem; validar caminhos antes de concluir uma etapa.
- Priorizar assets originais e licenças compatíveis com distribuição comercial.

## Inventário inicial

| ID | Recurso | Uso | Estado | Caminho verificado / observações |
|---|---|---|---|---|
| ENV-001 | Piso e paredes da primeira sala | Cenário jogável | Implementado | `public/assets/environment/floor.jpg`, `wall.jpg`; centro da sala livre |
| ENV-002 | Elementos de ruína e decoração | Fundo e profundidade | Implementado (parcial) | `public/assets/environment/props.png`: vitral, portas, coluna. Faltam velas, ossos, entulho |
| CHAR-001 | Personagem do jogador | Movimento e combate | Implementado | `public/assets/characters/player.png` (4 poses) |
| EN-001 | Inimigo básico corpo a corpo | Primeiro combate | Implementado | `public/assets/enemies/penitent.png` (4 poses, preparação com olhos vermelhos) |
| EN-002 | Inimigo de ataque à distância | Variedade de combate | Pendente | Fase 2 |
| EN-003 | Inimigo pesado ou veloz | Variedade de combate | Pendente | Fase 2 |
| BOSS-001 | Chefe inicial | Encontro final do protótipo | Pendente | Fase 2 |
| FX-001 | Efeito de impacto | Feedback de dano | Placeholder | Desenhado em código (arco do golpe, partículas, brilho); sem arquivo |
| FX-002 | Efeito de esquiva | Feedback defensivo | Pendente | A esquiva entra na Fase 2 |
| UI-001 | Ícones de vida e recursos | HUD | Placeholder | Losangos em CSS (`.pip`) + texto "3/5" |
| UI-002 | Ícones de armas e melhorias | Escolhas e inventário | Pendente | Fase 2 (recompensas) |
| SFX-001 | Ataque, impacto e dano | Feedback sonoro | Pendente | Opcional |
| SFX-002 | Interface e recompensa | Feedback de UI | Pendente | Opcional |
| MUS-001 | Música de ambiente | Atmosfera | Pendente | Opcional |

## Arquivos registrados

Origem comum: **gerados no Google Gemini (app web, conta do usuário, modo Pro) em 11/10/2026**, baixados em JPEG e processados por `npm run art` (`tools/art.mjs`): fundo magenta removido, poses recortadas por componentes conexos, escala e âncora (pés) normalizadas, PNG com paleta. Prompts exatos em `art/PROMPTS.md`; originais em `art/raw/`. **Licença:** conteúdo gerado sob os termos de uso do Google Gemini; sem atribuição exigida conhecida. Revisar os termos antes de uso comercial. **Estado:** em revisão (revisados por Claude; aguardando aprovação do usuário).

| ID | Caminho | Uso | Formato e dimensões | Fonte bruta | Observações |
|---|---|---|---|---|---|
| CHAR-001 | `public/assets/characters/player.png` | Cavaleiro amaldiçoado | PNG RGBA, 4 quadros de 205×196 (820×196) | `art/raw/player-knight-sheet.jpg` (2048²) | Quadros: idle, run, slash, dodge. Âncora nos pés (102.5, 194). Versão editada no Gemini para segurar a espada na corrida e na esquiva |
| EN-001 | `public/assets/enemies/penitent.png` | Penitente | PNG RGBA, 4 quadros de 206×196 | `art/raw/penitent-sheet.jpg` (2048²) | Quadros: pray, walk, windup, attack. Usa duas foices em algumas poses e uma em outras (aceito: imperceptível em ~64 px) |
| ENV-001a | `public/assets/environment/floor.jpg` | Piso ladrilhável | JPEG 512×512 (= 256 px lógicos) | `art/raw/floor-tile.jpg` (2048²) | Contraste comprimido (`linear 0.8, +30`) para os personagens lerem melhor |
| ENV-001b | `public/assets/environment/wall.jpg` | Alvenaria ladrilhável | JPEG 384×384 (= 192 px lógicos) | `art/raw/wall-masonry.jpg` (2048²) | Emenda vertical leve; invisível na parede do fundo (3 tiles) |
| ENV-002 | `public/assets/environment/props.png` | Vitral, porta fechada, porta aberta, coluna | PNG RGBA, 4 quadros de 196×196 | `art/raw/props-architecture.jpg` (2048²) | Porta aberta reservada para a saída da sala (Fase 2) |

Descartados: uma primeira versão do jogador sem espada em duas poses e um piso 16:9 com lajes grandes demais para a escala dos personagens.

## Referências locais (não distribuídas)
`referencia/` guarda 5 imagens de terceiros usadas só como direção estética (uma com marca d'água de outro autor). A pasta está no `.gitignore` porque o repositório é público; nenhuma delas é usada no jogo nem enviada ao Gemini.

## Modelo de registro por recurso

Para cada arquivo, manter:
- **ID e nome**
- **Caminho real**
- **Descrição e uso**
- **Formato e dimensões**
- **Origem/ferramenta**
- **Licença e atribuição**
- **Estado**: pendente, placeholder, em revisão, aprovado ou removido
- **Observações**: animações, quadros, ponto de origem, escala e limitações

## Checklist de revisão
- [ ] O arquivo existe e carrega no navegador.
- [ ] A escala e o enquadramento combinam com os demais assets.
- [ ] Personagens e ataques são legíveis em movimento.
- [ ] Transparência e recortes foram verificados quando aplicável.
- [ ] Origem e licença estão registradas.
- [ ] Não há referência quebrada no código.

## Requisitos adicionais da direção aprovada
Consulte `docs/VISUAL_DIRECTION_APPROVED.md`. Priorizar assets originais de alta qualidade para uma cena isométrica jogável, em vez de imagens promocionais usadas como fundo único.

| ID | Recurso | Uso | Estado inicial | Observações |
|---|---|---|---|---|
| ENV-003 | Ruína gótica isométrica em camadas | Arena jogável e profundidade | Pendente | Piso, paredes/arquitetura, decoração e atmosfera em elementos separados quando apropriado |
| CHAR-002 | Protagonista dark fantasy detalhado | Jogador e animações | Pendente | Orientação isométrica consistente; estados de idle, movimento, ataque, esquiva e dano conforme o escopo |
| EN-004 | Inimigo cultista/amaldiçoado | Combate inicial | Pendente | Silhueta e preparação de ataque legíveis |
| FX-003 | Golpe mágico ou arco de arma | Feedback de combate | Pendente | Contraste alto sem esconder personagem ou inimigos |
| UI-003 | HUD gótico ornamental | Vida, recursos e habilidades | Pendente | Legível em desktop e telas estreitas |

Os itens acima são planejados, não indicam arquivos já existentes. Atualize os caminhos e estados apenas após verificar os arquivos reais.
