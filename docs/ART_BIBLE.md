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
- A arte do jogo é gerada no **Gemini (app web, no Chrome do usuário)**, numa mesma conversa para manter o estilo. Os prompts exatos ficam em `art/PROMPTS.md`, os originais em `art/raw/iso/`, e o processamento é feito por `npm run art`.
- **Estilo aplicado (direção aprovada):** ilustração pintada e detalhada com hachura de tinta à la Gustave Doré e mangá seinen, claro-escuro dramático, materiais gastos, base carvão/cinza-azulado com acentos seletivos de carmesim e dourado e luz âmbar do fogo. Personagens em vista isométrica, com silhueta forte para leitura em ~100 px.
- **Folhas em grade** (4x2 para personagens, props e efeitos, 4x4 para ícones) sobre **magenta chapado #FF00FF** (efeitos: preto). O Gemini não entrega transparência real e às vezes desenha linhas de grade; o pipeline remove as duas coisas (só perto das divisas entre células, para não cortar props).
- **Direções:** o protagonista tem poses de frente (sudeste) e de costas (nordeste); inimigos e chefe só de frente. O jogo espelha para os lados esquerdos.
- **Paredes e piso** são texturas ladrilháveis pintadas, projetadas no isométrico pelo renderizador. Vitrais, portas e brasões são sprites frontais aplicados nas faces das paredes; colunas, braseiros, estátuas e candelabros são sprites isométricos.
- **Efeitos:** folha pintada própria (`fx/fx.jpg`) gerada sobre **preto puro** e desenhada com mistura aditiva: o preto não soma luz, então não precisa de recorte nem deixa franja. Ficam no chão (corte, anel de fogo, onda de impacto, projetados no isométrico) ou na tela (projéteis girados na direção do voo, clarão de impacto, centelhas de nível). A luz geral, a névoa, as partículas e a borda exata do alcance continuam em código para animar sem custo e nunca esconder um perigo.
- **Paleta da interface:** valores em `src/rendering/theme.ts`, publicados como variáveis CSS; HUD com molduras douradas, orbes e painéis escuros.
- **Limitações conhecidas:** leve tom rosado em brilhos recortados do magenta (penas do chefe, dois ícones); o ícone do golpe tem um fundo preto pintado.

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
