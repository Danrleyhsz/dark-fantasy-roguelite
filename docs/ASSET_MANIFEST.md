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

| ID | Recurso | Uso | Estado inicial | Observações |
|---|---|---|---|---|
| ENV-001 | Piso e paredes da primeira sala | Cenário jogável | A criar/verificar | Área central livre para combate |
| ENV-002 | Elementos de ruína e decoração | Fundo e profundidade | A criar/verificar | Não reduzir a legibilidade |
| CHAR-001 | Personagem do jogador | Movimento e combate | A criar/verificar | Silhueta reconhecível em tamanho pequeno |
| EN-001 | Inimigo básico corpo a corpo | Primeiro combate | A criar/verificar | Preparação de ataque claramente visível |
| EN-002 | Inimigo de ataque à distância | Variedade de combate | Planejado | Projétil e origem do ataque legíveis |
| EN-003 | Inimigo pesado ou veloz | Variedade de combate | Planejado | Padrão distinto dos demais |
| BOSS-001 | Chefe inicial | Encontro final do protótipo | Planejado | Fases telegráficas e ataques justos |
| FX-001 | Efeito de impacto | Feedback de dano | A criar/verificar | Curto e sem encobrir a ação |
| FX-002 | Efeito de esquiva | Feedback defensivo | A criar/verificar | Discreto |
| UI-001 | Ícones de vida e recursos | HUD | A criar/verificar | Alto contraste |
| UI-002 | Ícones de armas e melhorias | Escolhas e inventário | A criar/verificar | Estilo consistente |
| SFX-001 | Ataque, impacto e dano | Feedback sonoro | Opcional/A criar | Controle de volume e opção de silenciar |
| SFX-002 | Interface e recompensa | Feedback de UI | Opcional/A criar | Não intrusivo |
| MUS-001 | Música de ambiente | Atmosfera | Opcional/A criar | Licença compatível; silenciável |

Os estados são uma lista inicial de planejamento, não uma afirmação de que os recursos já existem. Após inspecionar o repositório, substitua cada estado por `Implementado`, `Placeholder`, `Pendente` ou `Bloqueado` com caminho verificado.

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
