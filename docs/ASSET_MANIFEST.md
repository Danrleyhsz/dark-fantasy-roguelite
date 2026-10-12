# Catálogo de recursos (Asset Manifest)

Este documento registra os recursos visuais e sonoros do jogo. Atualize-o sempre que um asset for adicionado, substituído ou removido. Não marcar placeholders como arte final.

## Convenções
- Guardar recursos do jogo em `public/assets/` ou no local já estabelecido pelo projeto.
- Usar nomes descritivos, minúsculos e separados por hífen.
- Registrar origem, licença e atribuição exigida para todo recurso externo.
- Para arte gerada por IA, registrar ferramenta/origem, prompt ou referência de produção quando útil, formato, dimensões e revisão de consistência.
- Não referenciar arquivos que não existem; validar caminhos antes de concluir uma etapa.
- Priorizar assets originais e licenças compatíveis com distribuição comercial.

## Inventário (verificado em 12/10/2026)

| ID | Recurso | Uso | Estado | Caminho verificado / observações |
|---|---|---|---|---|
| ENV-001 | Piso e paredes | Cenário jogável | Implementado | `environment/floor.jpg`, `wall.jpg` (texturas pintadas projetadas na vista isométrica) |
| ENV-002 | Ruína e decoração | Profundidade e luz | Implementado | `environment/props.png`: vitral, porta fechada/aberta, brasão, coluna, braseiro, estátua de anjo, candelabro |
| ENV-003 | Ruína gótica isométrica em camadas | Arena jogável | Implementado | Piso, paredes texturizadas, props e atmosfera (luz, névoa, brasas) em elementos separados, montados pelo renderizador |
| CHAR-001/CHAR-002 | Protagonista (cavaleiro amaldiçoado) | Movimento e combate | Implementado | `characters/hero.png`: 8 poses, frente (sudeste) e costas (nordeste) |
| EN-001 | Penitente (corpo a corpo) | Primeiro combate | Implementado | `enemies/penitent.png` |
| EN-002/EN-004 | Acólito (cultista à distância) | Variedade de combate | Implementado | `enemies/acolyte.png`; o projétil (brasa) vem da folha de efeitos `fx/fx.jpg` |
| EN-003 | Flagelante (pesado, investida) | Variedade de combate | Implementado | `enemies/brute.png` |
| BOSS-001 | Anjo Caído | Chefe final | Implementado | `bosses/angel.png` |
| FX-001 | Efeito de impacto | Feedback de dano | Implementado | Clarão pintado (`fx/fx.jpg`, quadro impact) no corpo atingido, maior no crítico; mais partículas em código (faíscas, ossos, sangue), brilho na silhueta, hitstop e números de dano |
| FX-002 | Efeito de esquiva | Feedback defensivo | Implementado (código) | Rastro de silhuetas translúcidas do próprio sprite |
| FX-003 | Golpe e magia | Feedback de combate | Implementado | `fx/fx.jpg`: corte (recortado ao setor que acerta; no Montante com borda de fogo), anel de fogo da Ira Flamejante, brasa do Acólito, penas e onda de impacto do chefe, onda da Lâmina Sagrada, centelhas ao subir de nível. A estocada do Estoque e a borda exata do alcance continuam em código |
| UI-001 | Ícones de vida e recursos | HUD | Implementado | Orbes de Vida/Fé em CSS + `ui/icons.png` (cinzas, nível) |
| UI-002 | Ícones de bênçãos, itens e ações | Escolhas, inventário, HUD | Implementado | `ui/icons.png` (16 ícones) |
| UI-003 | HUD gótico ornamental | Vida, recursos, habilidades | Implementado (CSS) | Molduras douradas, orbes, slots com recarga, XP, minimapa e objetivo em HTML/CSS; sem folha de molduras pintadas |
| KEY-001 | Ilustração de capa | Fundo do menu e das telas finais | Implementado | `ui/key-art.jpg` (não é usada como cenário jogável) |
| SFX-001/SFX-002 | Efeitos sonoros | Golpe, impacto, dano, esquiva, habilidade, saque, nível, porta, vitória/derrota | Implementado (sintetizado) | `src/audio/sfx.ts` (WebAudio, sem arquivos); volume no menu, 0 = mudo |
| MUS-001 | Música de ambiente | Atmosfera | Pendente | Opcional |

## Arquivos registrados

**Origem comum:** gerados no **Google Gemini (app web, modo Pro, conta do usuário, no Chrome)** em 11–12/10/2026, baixados em JPEG (2048–2752 px) para `art/raw/iso/` e processados por `npm run art` (`tools/art.mjs`): fundo magenta removido com descontaminação das bordas e *despill* nos tons claros, linhas de grade removidas, poses recortadas por componentes conexos, escala única por folha, âncora nos pés, PNG com paleta. Prompts exatos em `art/PROMPTS.md`.
**Licença:** conteúdo gerado sob os termos de uso do Google Gemini; sem atribuição exigida conhecida. Revisar os termos antes de uso comercial.
**Estado:** em revisão (revisados por Claude no tamanho real do jogo; aguardando aprovação do usuário).

Caminhos relativos a `public/assets/`.

| ID | Caminho | Formato e dimensões | Fonte bruta | Quadros e observações |
|---|---|---|---|---|
| CHAR-001 | `characters/hero.png` | PNG, 8 × 252×228 (121 KB) | `iso/hero-sheet.jpg` | idleF, runF, slashF, dodgeF, idleB, runB, slashB, dodgeB. Desenhado com 104 px de altura; espelhado para os lados esquerdos |
| EN-001 | `enemies/penitent.png` | PNG, 4 × 177×212 (46 KB) | `iso/enemies-a.jpg` (linha 1) | pray, walk, windup (olhos vermelhos), attack |
| EN-002 | `enemies/acolyte.png` | PNG, 4 × 174×212 (53 KB) | `iso/enemies-a.jpg` (linha 2) | idle, walk, windup (incensário em chamas), throw |
| EN-003 | `enemies/brute.png` | PNG, 4 × 310×244 (74 KB) | `iso/enemies-b.jpg` (linha 1) | idle, windup, charge, stun |
| BOSS-001 | `bosses/angel.png` | PNG, 4 × 399×324 (181 KB) | `iso/enemies-b.jpg` (linha 2) | idle, windup, thrust, wings (leque de penas). As penas do leque ficam levemente salmão (o despill reduziu o rosa) |
| ENV-002 | `environment/props.png` | PNG, 8 × 228×228 (140 KB) | `iso/props-a.jpg` | window, doorClosed, doorOpen, plaque (frontais, projetados nas faces das paredes); column, brazier, statue, candelabra (isométricos) |
| ENV-001a | `environment/floor.jpg` | JPEG 512×512 (42 KB) | `iso/floor-painted.jpg` | Ladrilhável; 1 repetição = 8 tiles. Escurecido (`linear 0.82`) |
| ENV-001b | `environment/wall.jpg` | JPEG 384×384 (21 KB) | `iso/wall-painted.jpg` | Ladrilhável; a moldura entalhada fica na base das paredes |
| UI-002 | `ui/icons.png` | PNG, 16 × 100×100 (71 KB) | `iso/icons.jpg` | 8 bênçãos, cinzas, arma, armadura, relíquia, golpe, esquiva, habilidade, nível. O ícone do golpe tem um fundo preto pintado; o brilho da Lâmina Sagrada é levemente salmão |
| KEY-001 | `ui/key-art.jpg` | JPEG 1600×893 (253 KB) | `iso/key-art.jpg` | Fundo do menu, escurecido por CSS |
| FX-001/FX-003 | `fx/fx.jpg` | JPEG, 8 × 200×200 sobre preto (63 KB) | `iso/fx-a.jpg` | ember, feather, wave, impact, slash, fireRing, shockwave, motes. **Fundo preto, sem recorte:** desenhado com mistura aditiva (preto não soma nada), então não há franja rosada. Geometria do corte e dos anéis medida no quadro e registrada em `render.ts` (FX_SLASH, FX_RING, FX_SHOCK) |

Total servido: ~1,1 MB de arte (1,04 MiB).

**Removidos (substituídos pela direção isométrica pintada):** sprites e texturas de traço chapado da primeira versão (`player.png`, Penitente antigo, piso/parede/props antigos). As fontes antigas continuam no histórico do git.

## Referências locais (não distribuídas)
`referencia/` guarda 5 imagens de terceiros usadas só como direção estética (uma com marca d'água de outro autor). A pasta está no `.gitignore` porque o repositório é público. Nenhuma delas é usada no jogo nem foi enviada ao Gemini.

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

## Checklist de revisão (aplicado em 12/10/2026)
- [x] O arquivo existe e carrega no navegador. *Teste `todo arquivo do manifesto de arte existe` + rede 200 na build.*
- [x] A escala e o enquadramento combinam com os demais assets. *Alturas por folha em `render.ts` (HEIGHT); conferido em capturas.*
- [x] Personagens e ataques são legíveis em movimento. *Silhueta do jogador por cima quando encoberto; áreas de perigo sob os personagens.*
- [x] Transparência e recortes foram verificados quando aplicável. *Prévias sobre xadrez de cada folha; corrigido corte de props pela remoção de grade.*
- [x] Origem e licença estão registradas.
- [x] Não há referência quebrada no código. *O manifesto `src/rendering/art.gen.ts` é gerado pelo pipeline; sem imagem, o jogo usa desenho provisório.*
