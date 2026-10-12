# Direção visual e de gameplay aprovada

**Estado:** aprovada pelo usuário em 2026-10-11. Esta especificação substitui orientações anteriores que entrem em conflito com ela.  
**Repositório:** não usar esta aprovação como autorização para copiar arte de terceiros; as imagens de referência são guias de direção, não assets do jogo.

## Decisões aprovadas
- **Gênero:** RPG de ação com progressão, estrutura roguelite.
- **Câmera:** visão de cima em perspectiva isométrica.
- **Arte:** ilustração dark fantasy detalhada, com cenários góticos, personagens e monstros elaborados, materiais ricos, luz dramática, névoa, sombras profundas e efeitos mágicos controlados.
- **Referência visual:** preservar o máximo possível as características das imagens originais aprovadas pelo usuário. Não simplificar para pixel art, formas geométricas genéricas ou estética plana.
- **Cena de referência:** guerreiro em combate numa ruína gótica, múltiplos inimigos com silhuetas legíveis, arquitetura antiga, fogo e brasa, atmosfera enevoada, HUD ornamental com vida/recursos, habilidades, minimapa e objetivo de missão.
- **Plataforma:** jogo real executado no navegador; imagens conceituais não podem ser usadas para fingir gameplay funcional.

## Pilares de experiência
1. Combate em tempo real com ataques, esquiva, habilidades e inimigos com padrões legíveis.
2. Progressão RPG persistente: atributos, equipamentos, raridades, habilidades e builds.
3. Exploração de áreas com segredos, relíquias, recompensas e chefes.
4. Apresentação visual de alta qualidade, com leitura clara durante o combate.
5. Controles e interface responsivos para desktop e toque.

## Requisitos de arte e implementação
- Criar assets originais coerentes entre si, não copiar personagens, logotipos ou ilustrações protegidas.
- Priorizar cenário, protagonista, inimigos, efeitos de combate e HUD para a primeira fatia vertical.
- Manter o personagem e os ataques legíveis no tamanho real do jogo; o detalhe não deve esconder perigos.
- Usar composição em camadas, sombras, iluminação e efeitos atmosféricos conforme viável para o navegador.
- Se forem usados spritesheets, garantir escala, orientação, ponto de origem e ciclos de animação consistentes.
- Não usar uma única imagem promocional como se fosse o cenário jogável. Separar fundo, elementos, personagens, efeitos e interface em assets adequados.
- Escolher técnica de renderização após inspecionar a base. Canvas 2D/WebGL ou uma engine web são aceitáveis se justificados por fidelidade, desempenho e simplicidade.
- O objetivo é aproximar a linguagem visual da referência, sem prometer reproduzir pixel a pixel uma imagem gerada.

## Critérios de aprovação visual
- Uma captura real do protótipo mostra cenário isométrico, protagonista, ao menos um inimigo, um ataque/efeito e HUD integrados.
- A arte não parece um protótipo genérico feito apenas de formas primitivas.
- O contraste permite identificar jogador, inimigos, perigos e itens.
- A direção de arte é consistente entre ambiente, personagens, efeitos e interface.
- O protótipo continua responsivo em navegador e tem plano explícito de otimização.

## Próxima etapa
Inspecionar o repositório e elaborar uma fatia vertical pequena com qualidade visual representativa antes de expandir conteúdo. Não declarar assets ou funcionalidades como concluídos sem arquivos reais e testes.