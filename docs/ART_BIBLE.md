# Art Bible

## Identidade visual
Fantasia sombria com aparência de gravura medieval, ilustração gótica e mangá seinen. O visual deve parecer desenhado com tinta e hachuras, não uma interface genérica de fantasia.

## Paleta orientadora
- Preto carvão: fundo, silhuetas e sombras.
- Marfim envelhecido: leitura, brilhos e papel/gravura.
- Vermelho vinho: sangue, perigos e ênfase.
- Dourado envelhecido: relíquias, raridade e detalhes sagrados.
- Azul profundo opcional: magia fria e ambientes específicos.

Use cores como orientação artística; centralize os valores finais em variáveis de tema. Garanta contraste suficiente para gameplay.

## Linha e textura
- Contornos fortes combinados com hachuras cruzadas finas.
- Textura de xilogravura, tinta impressa e papel antigo em ilustrações estáticas.
- Silhuetas legíveis em escala pequena.
- Evitar ruído excessivo em áreas de gameplay, onde leitura tem prioridade.

## Formas e temas
Cavaleiros amaldiçoados, anjos caídos, relíquias, espinhos, catedrais em ruínas, vitrais partidos, armas antigas, ossos e criaturas grotescas. Manter a violência estilizada e funcional ao tom, sem depender de gore explícito.

## Personagens e animação
Cada personagem precisa de silhueta distinta. Ataque, preparação, dano, esquiva e morte devem ser visualmente diferenciáveis. Se sprites detalhados não estiverem disponíveis, usar placeholders temporários claramente identificados.

## Cenários e interface
Cenários em camadas com profundidade e áreas de combate desobstruídas. HUD minimalista: vida, habilidade/arma, recursos e recompensa atual. Botões com estados normal, foco, pressionado e desativado. A UI deve combinar com a estética sem prejudicar legibilidade.

## Regras para geração de imagens
Todo prompt deve especificar: sujeito, vista/câmera, pose, iluminação, paleta, nível de detalhe, fundo/transparência e uso pretendido. Para sprites, pedir orientação consistente, enquadramento uniforme e fundo transparente quando apropriado. Não usar imagem promocional como sprite de gameplay sem recorte e validação.

## Produção (registro)
- Sprites e texturas são gerados no **Gemini (app web)**, numa mesma conversa para manter o estilo. Os prompts exatos ficam em `art/PROMPTS.md`, os originais em `art/raw/`, e o processamento é feito por `npm run art`.
- **Fundo magenta chapado #FF00FF** para recorte (o Gemini não entrega transparência real). Evitar roxo, violeta e rosa nos prompts.
- Folhas de sprites em grade 2x2, todas as poses voltadas para a direita (o jogo espelha).
- **Estilo observado:** nos sprites de jogo o Gemini entrega tinta forte com hachura moderada, mais limpa que a gravura pura. Aceito de propósito pela legibilidade em ~64 px. A textura de xilogravura mais pesada fica para ilustrações estáticas (menu, cartas de recompensa).
- **Paleta final:** valores em `src/rendering/theme.ts`, publicados como variáveis CSS para a interface.
- Pisos são escuros e de baixo contraste; o pipeline ainda comprime o contraste para a armadura escura do jogador continuar legível.

## Consistência e direitos
Registrar caminho, descrição, formato, dimensões, origem, licença e status no ASSET_MANIFEST. Não copiar personagens, logotipos ou arte protegida de jogos existentes. Referências servem para direção estética, não para reprodução literal.

## Direção visual aprovada: referência principal
Consulte `docs/VISUAL_DIRECTION_APPROVED.md`. Esta seção substitui qualquer leitura anterior que conduza a uma aparência de gravura simples, pixel art ou protótipo geométrico.

- Buscar ilustração dark fantasy altamente detalhada: volumes pintados, armaduras gastas, pedra antiga, tecidos, ossos, metal, fogo e magia com materiais distintos.
- Composição de gameplay em perspectiva isométrica vista de cima; profundidade por arquitetura em camadas, sombras, névoa, luz quente de tochas e acentos frios no ambiente.
- Paleta-base: carvão, cinza-azulado, marrom de pedra, vermelho vinho e fogo âmbar; dourado envelhecido em relíquias e elementos de HUD. Ajustar contraste para leitura real.
- Protagonista, inimigos e chefes precisam de silhuetas únicas, detalhes reconhecíveis e animações claras de preparação, ataque, impacto, esquiva e derrota.
- A interface pode ser ornamental e gótica, mas deve continuar legível e não cobrir áreas críticas da luta.
- Criar recursos originais coerentes entre si. As referências são guias estéticos, não autorização para copiar arte, personagens ou logotipos de terceiros.
- Não usar uma ilustração promocional única como fundo que simule uma arena funcional. Preparar recursos apropriados para cenário, personagens, efeitos e UI.
- Validar os assets na escala final do navegador. Detalhe visual não pode obscurecer inimigos, ataques, colisões ou itens.
