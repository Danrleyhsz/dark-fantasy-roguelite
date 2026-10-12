# Claude Instructions

Este repositório contém um roguelite dark fantasy 2D para navegador. Leia este arquivo e os documentos em `docs/` antes de implementar funcionalidades.

## Ordem de leitura
1. `docs/GDD.md`
2. `docs/ART_BIBLE.md`
3. `docs/TECHNICAL_DESIGN.md`
4. `docs/ASSET_MANIFEST.md`
5. `docs/ROADMAP.md`
6. `docs/TEST_PLAN.md`

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
`npm install` · `npm run dev` (http://localhost:5173) · `npm test` · `npm run check` · `npm run build` · `npm run preview` · `npm run art` (reprocessa a arte de `art/raw/`). Detalhes em `docs/TECHNICAL_DESIGN.md`.

## Arte gerada
Gerar imagens pelo Gemini **no navegador** (app web na conta do usuário), não pela API. Seguir `art/PROMPTS.md` (fundo magenta #FF00FF, grade 2x2) e registrar cada recurso no ASSET_MANIFEST. `referencia/` é só local (fora do git).

## Critério de conclusão
Uma tarefa só está concluída quando a funcionalidade funciona no navegador, os testes relevantes passam, não há erros conhecidos ignorados e a documentação está atualizada.
