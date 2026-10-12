# Plano de testes

Marcar um item como concluído somente depois de executá-lo. Registrar navegador, dispositivo, passos, resultado esperado e resultado observado quando houver falha.

## Como os testes foram executados
- **Automáticos:** `npm test` (62 testes `node:test`, Node 24.18, Windows 11) e `npm run check`. Cobrem colisão, combate, esquiva, os quatro inimigos e o chefe, projéteis, ondas, bênçãos, RPG (níveis, itens, habilidade, armadura), salvamento (dados corrompidos, armazenamento indisponível, falha de escrita), projeção isométrica, telas, reinício e renderização (contexto 2D falso que falha com NaN). Inclui **incursões completas** jogadas por um bot.
- **Balanceamento:** `node tools/balance.ts 30` → o bot (reação perfeita) vence 27/30, morre nas salas 3–4, termina com ~93% de vida e leva ~2,6 min por incursão.
- **Navegador:** Chromium embutido do app Claude Desktop, servidor de desenvolvimento, **build de produção** (`npm run preview`) e a **versão publicada** no GitHub Pages. Entradas reais do DOM (KeyboardEvent/PointerEvent), cliques nas cartas e botões. Com o painel oculto, os quadros foram avançados por `__debug.frames()` (`?debug`).
- **Celular:** emulação 375×812 (retrato) e 844×390 (paisagem) com eventos de toque sintéticos. **Nenhum aparelho físico testado.**

Última execução: 12/10/2026 (direção isométrica, Fases 2–5, incluindo a URL publicada).

## 1. Inicialização e navegação
- [x] A página carrega sem erro fatal. *Dev e produção; console sem erros; 12 assets com HTTP 200.*
- [x] O menu inicia uma partida.
- [x] As instruções de controle estão visíveis. *Painel de controles no menu + dica nos primeiros 9 s (teclado ou toque).*
- [x] Pausar e voltar ao jogo funciona. *Esc, P, botão ❚❚; a pausa mostra o painel do personagem.*
- [x] Voltar ao menu não deixa a partida anterior ativa. *Mundo descartado; nível e experiência salvos.*

## 2. Movimento e combate
- [x] A personagem se move nas direções previstas. *Isométrico: W sobe na tela, D vai à direita (medido no navegador e testado em `iso.test.ts`).*
- [x] Colisões com paredes/limites funcionam. *Paredes, colunas, braseiros, estátuas e candelabros são sólidos; testes de parada, deslizamento e anti-atravessamento.*
- [x] Ataque funciona e respeita alcance/tempo de recarga definidos.
- [x] Inimigos demonstram o padrão de ataque previsto. *Penitente (varredura), Acólito (brasa à distância), Flagelante (investida e atordoamento), Anjo Caído (estocada, penas, impacto; fase 2).*
- [x] Preparação e área de perigo são visíveis antes de ataques fortes. *A mesma geometria aplica o dano e é desenhada no chão (setor, faixa, círculo) + "!" + brilho vermelho.*
- [x] Dano, invulnerabilidade temporária e feedback funcionam corretamente. *Também esquiva e armadura.*
- [x] Vida não fica abaixo do limite definido nem é atualizada duas vezes por um único evento indevido.
- [x] Derrota encerra a simulação e permite reiniciar.
- [x] Melhorias escolhidas produzem o efeito descrito. *Testes de cada bênção, equipamento, nível e Relicário; cartas clicadas no navegador.*
- [x] A condição de vitória é alcançável e encerra a partida. *Bot vence incursões completas; fluxo real até a tela de vitória na build de produção.*

## 3. Reinício e estado
- [x] Reiniciar limpa inimigos, projéteis, efeitos e estado temporário da tentativa anterior.
- [x] Reiniciar repetidamente não duplica timers, eventos, áudio ou entidades. *50 reinícios no Node; listeners e áudio criados uma vez.*
- [x] A simulação realmente para durante a pausa, vitória, derrota e escolha de bênção.
- [x] Trocar de aba e voltar não deixa teclas ou ações presas. *Perda de foco pausa e limpa as teclas.*

## 4. Desktop e celular
- [x] Teclado e mouse funcionam de acordo com as instruções.
- [x] Controles de toque funcionam sem teclado físico. *Joystick, Atacar, Esquivar e Ira com eventos de toque sintéticos; falta aparelho real.*
- [x] Botões têm tamanho adequado e não se sobrepõem à ação importante. *Botões de 72–96 px nos cantos; no toque, os orbes viram barras compactas no topo.*
- [x] HUD e menus cabem em telas estreitas. *375×812 e 844×390; dica e barra do chefe descem abaixo do topo em telas estreitas.*
- [x] A página não rola acidentalmente durante o controle do jogo.
- [x] Redimensionar a janela não distorce a área jogável. *Tela cheia sem distorção: a câmera mostra mais mundo em vez de esticar.*
- [x] Testar pelo menos um navegador Chromium e, se disponível, Firefox ou Safari. *Chromium apenas; Firefox/Safari indisponíveis aqui.*

## 5. Salvamento e robustez
- [x] Configurações persistem quando isso está implementado. *Reduzir tremor e volume salvos e relidos.*
- [x] Dados locais inválidos ou ausentes não impedem iniciar uma partida. *JSON corrompido, tipos errados e valores fora do limite (testes).*
- [x] Falha de armazenamento é tratada sem travar o jogo. *getItem/setItem que lançam erro; aviso na interface.*
- [x] Falha de carregamento de asset gera fallback ou mensagem compreensível. *Sem imagem, desenho provisório + aviso no console (teste de renderização sem imagens).*
- [x] Não há erros recorrentes no console durante uma partida.

## 6. Acessibilidade e conforto
- [x] Informações importantes não dependem apenas de cor. *Perigo: hachura + "!" + pose; raridade: cor + nome; vida/Fé: orbe + número.*
- [x] Textos e elementos interativos têm contraste suficiente. *Marfim #e8dcc0 sobre #1c1816 ≈ 13:1; painéis escuros atrás do texto.*
- [x] Áudio pode ser silenciado se houver áudio. *Volume 0 = mudo, salvo.*
- [x] Efeitos não escondem ataques perigosos. *Áreas de perigo sob os personagens; silhueta do jogador por cima quando encoberto.*
- [x] Movimento intenso pode ser reduzido quando viável. *"Reduzir tremor de tela e clarões" desliga o tremor, o tremor da preparação e a cintilação das chamas, e suaviza o clarão de dano.*

## 7. Build e publicação
- [x] Executar os scripts de lint/teste/build existentes. *`npm test`, `npm run check`, `npm run build`. Não há linter configurado.*
- [x] Confirmar que a build de produção termina sem erros. *JS 66 KB (25 KB gzip), CSS 10 KB, 1,1 MB com a arte.*
- [x] Testar a versão compilada, não apenas o servidor de desenvolvimento. *Incursão completa pelo fluxo real, pausa, saque, opções e derrota na build.*
- [x] Se publicado, abrir a URL HTTPS e verificar carregamento de assets e controles. *https://danrleyhsz.github.io/dark-fantasy-roguelite/: 12 assets com HTTP 200, arte de capa no menu, teclado e mouse em desktop, toque em emulação 375×812 (12/10/2026).*

## Modelo para registrar falhas
**ID:**  
**Gravidade:** bloqueador / alta / média / baixa  
**Ambiente:** navegador, versão, dispositivo e tamanho de tela  
**Passos para reproduzir:**  
**Resultado esperado:**  
**Resultado observado:**  
**Estado:** aberto / corrigido / retestado  

Não inventar resultados. Se um teste não puder ser executado por falta de dispositivo ou ambiente, deixá-lo pendente e explicar a limitação.