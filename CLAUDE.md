# Claude Instructions

Este repositório contém um roguelite dark fantasy 2D para navegador. Leia este arquivo e os documentos em `docs/` antes de implementar funcionalidades.

## Ordem de leitura
1. `docs/GDD.md`
2. `docs/ART_BIBLE.md`
3. `docs/TECHNICAL_DESIGN.md`
4. `docs/ASSET_MANIFEST.md`
5. `docs/ROADMAP.md`
6. `docs/TEST_PLAN.md`

## Uso do Gemini para geração de imagens

- Verifique se a integração/extensão do Gemini já configurada no Claude Desktop está disponível como ferramenta capaz de **gerar imagens**, e não apenas conversar ou enviar prompts.
- Quando a geração de imagens estiver disponível, use o Gemini para criar recursos visuais originais do jogo, seguindo rigorosamente `docs/ART_BIBLE.md`.
- Planeje e gere recursos conforme as necessidades reais da etapa atual, incluindo personagens, inimigos, cenários, chefes, ícones, efeitos visuais e spritesheets quando apropriado.
- Mantenha coerência visual entre os recursos: silhuetas legíveis, paleta definida na ART_BIBLE, iluminação e nível de detalhe consistentes, e adequação à escala do jogo no navegador.
- Salve os arquivos no diretório de assets do próprio repositório, organizados por categoria e com nomes descritivos. Registre cada recurso em `docs/ASSET_MANIFEST.md`, incluindo finalidade, caminho, estado e origem/licença quando aplicável.
- Confira dimensões, transparência, recortes e legibilidade dos arquivos antes de integrá-los. Não substitua automaticamente arte final por formas geométricas ou imagens genéricas.
- Se a integração não permitir gerar imagens, não afirme que gerou recursos e não invente arquivos. Informe objetivamente a limitação, identifique o que a ferramenta realmente permite fazer e continue com placeholders claramente identificados enquanto prepara os requisitos para a geração.
- Não exponha nem grave chaves de API, tokens ou credenciais nos arquivos do projeto. Se uma configuração adicional for necessária, descreva-a sem incluir segredos no repositório.

## Regras de trabalho
- Trabalhe apenas neste repositório; não misture código ou arquivos de outros projetos.
- Antes de codificar, inspecione a estrutura existente e preserve alterações válidas.
- Comece com um protótipo pequeno, executável e testável no navegador.
- Priorize HTML5, CSS e JavaScript/TypeScript com Canvas ou WebGL, escolhendo uma stack simples e justificando-a no projeto.
- Não finja que recursos, testes ou funcionalidades existem. Registre claramente o que está implementado, pendente ou bloqueado.
- Não adicione dependências sem necessidade. Nunca inclua segredos, tokens ou chaves de API no código.
- Para arte gerada por IA, siga a ART_BIBLE e registre cada recurso no ASSET_MANIFEST, incluindo licença/origem quando aplicável.
- Use placeholders identificados quando um recurso final ainda não existir; não deixe referências quebradas.
- Mantenha controles responsivos para teclado, mouse e toque.
- Salve progresso de forma robusta, com tratamento para armazenamento indisponível ou corrompido.
- Após cada etapa, execute os testes disponíveis, corrija erros e atualize ROADMAP e ASSET_MANIFEST.
- Faça mudanças pequenas e coerentes; não reescreva sistemas não relacionados.
- Se uma decisão importante não estiver documentada, escolha a opção mais simples e reversível e registre a decisão.

## Comandos
`npm install` · `npm run dev` (http://localhost:5173; `?debug` liga atalhos de teste) · `npm test` · `npm run check` · `npm run build` · `npm run preview` · `npm run art` (reprocessa `art/raw/iso/`) · `npm run deploy` (publica no GitHub Pages) · `node tools/balance.ts 30` (simula incursões). Detalhes em `docs/TECHNICAL_DESIGN.md`.

## Arte gerada
Gerar imagens pelo Gemini **no Chrome do usuário** (app web, conta logada), não pela API. Seguir `art/PROMPTS.md` (fundo magenta #FF00FF, folhas em grade), baixar para `art/raw/iso/`, rodar `npm run art` e registrar cada recurso no ASSET_MANIFEST. `referencia/` é só local (fora do git).

## Critério de conclusão
Uma tarefa só está concluída quando a funcionalidade funciona no navegador, os testes relevantes passam, não há erros conhecidos ignorados e a documentação está atualizada.

## Direção aprovada pelo usuário (prioridade máxima)
Antes de implementar, leia `docs/VISUAL_DIRECTION_APPROVED.md`. A direção aprovada é RPG de ação com progressão, câmera de cima em perspectiva isométrica e ilustração dark fantasy detalhada, seguindo de perto as referências visuais originais aprovadas. Não regredir para pixel art, formas geométricas genéricas ou estética plana. Desenvolva uma fatia vertical visualmente representativa com cenário gótico, protagonista, inimigos, efeitos e HUD integrados. Inspecione primeiro a base existente; não afirme que as referências são assets do jogo nem use uma imagem estática para simular gameplay. Preserve legibilidade e desempenho no navegador. Atualize GDD, ART_BIBLE, TECHNICAL_DESIGN, ROADMAP e ASSET_MANIFEST de acordo com a especificação aprovada.
