# Plano de testes

Marcar um item como concluído somente depois de executá-lo. Registrar navegador, dispositivo, passos, resultado esperado e resultado observado quando houver falha.

## Como os testes foram executados
- **Automáticos:** `npm test` (29 testes `node:test`, Node 24.18, Windows 11) e `npm run check`. Cobrem colisão, combate, inimigo, telas, reinício e renderização (com um contexto 2D falso que falha com NaN).
- **Navegador:** Chromium embutido do app Claude Desktop, painel de ~970×560 CSS px, servidor de desenvolvimento (`npm run dev`) e build de produção (`npm run preview`). Entradas reais do DOM (KeyboardEvent/PointerEvent) disparadas por script; um bot na página jogou lutas inteiras com teclado + mouse.
- **Celular:** só emulação de 375×812 com eventos de toque sintéticos. **Nenhum aparelho físico testado ainda.**

Última execução: 11/10/2026 (Fase 1).

## 1. Inicialização e navegação
- [x] A página carrega sem erro fatal. *Dev e produção; console sem erros.*
- [x] O menu inicia uma partida.
- [x] As instruções de controle estão visíveis. *Menu + dica nos primeiros 8 s (teclado ou toque, conforme o dispositivo).*
- [x] Pausar e voltar ao jogo funciona. *Esc, P, botão ❚❚ e "Continuar"; tempo do mundo congelado durante a pausa.*
- [x] Voltar ao menu não deixa a partida anterior ativa. *Pausa → Menu principal: mundo descartado, HUD oculto (navegador e Node).*

## 2. Movimento e combate
- [x] A personagem se move nas direções previstas. *WASD/setas/joystick; ~210 px/s medidos.*
- [x] Colisões com paredes/limites funcionam. *Testes de parada na parede, deslizamento e anti-atravessamento em alta velocidade.*
- [x] Ataque funciona e respeita alcance/tempo de recarga definidos. *Alcance, setor, uma vez por golpe, recarga e buffer de entrada.*
- [x] Inimigos demonstram o padrão de ataque previsto. *Penitente: reza → persegue → prepara → golpeia → recupera.*
- [x] Preparação e área de perigo são visíveis antes de ataques fortes. *Setor hachurado + "!" + brilho vermelho; nenhum dano antes do fim da preparação (teste).*
- [x] Dano, invulnerabilidade temporária e feedback funcionam corretamente.
- [x] Vida não fica abaixo do limite definido nem é atualizada duas vezes por um único evento indevido.
- [x] Derrota encerra a simulação e permite reiniciar.
- [ ] Melhorias escolhidas produzem o efeito descrito. *Ainda não existem (Fase 2).*
- [x] A condição de vitória é alcançável e encerra a partida. *Bot vence sem tomar dano em ~11 s (dev e produção).*

## 3. Reinício e estado
- [x] Reiniciar limpa inimigos, projéteis, efeitos e estado temporário da tentativa anterior. *Mundo novo a cada reinício (verificado no navegador e no Node).*
- [x] Reiniciar repetidamente não duplica timers, eventos, áudio ou entidades. *50 reinícios no Node; listeners registrados uma única vez (revisão de código). Sem áudio ainda.*
- [x] A simulação realmente para durante a pausa, vitória e derrota.
- [x] Trocar de aba e voltar não deixa teclas ou ações presas. *Perda de foco com tecla pressionada: pausa e, ao continuar, o personagem não anda sozinho.*

## 4. Desktop e celular
- [x] Teclado e mouse funcionam de acordo com as instruções.
- [x] Controles de toque funcionam sem teclado físico. *Só em emulação com eventos sintéticos; falta aparelho real.*
- [x] Botões têm tamanho adequado e não se sobrepõem à ação importante. *Botões ≥ 44 px; Atacar com 96 px. Em retrato ficam fora da área de jogo; paisagem em celular não testada.*
- [x] HUD e menus cabem em telas estreitas. *375×812.*
- [x] A página não rola acidentalmente durante o controle do jogo. *scroll = tamanho da janela.*
- [x] Redimensionar a janela não distorce a área jogável. *Proporção fixa 960:544 com faixas pretas.*
- [x] Testar pelo menos um navegador Chromium e, se disponível, Firefox ou Safari. *Chromium apenas; Firefox/Safari indisponíveis neste ambiente.*

## 5. Salvamento e robustez
- [ ] Configurações persistem quando isso está implementado. *Não há salvamento ainda.*
- [ ] Dados locais inválidos ou ausentes não impedem iniciar uma partida. *Não há salvamento ainda.*
- [ ] Falha de armazenamento é tratada sem travar o jogo. *Não há salvamento ainda.*
- [x] Falha de carregamento de asset gera fallback ou mensagem compreensível. *Sem imagem, o jogo desenha um placeholder e avisa no console (teste de renderização sem imagens). Falha real de rede não forçada no navegador.*
- [x] Não há erros recorrentes no console durante uma partida.

## 6. Acessibilidade e conforto
- [x] Informações importantes não dependem apenas de cor. *Perigo: hachura + "!" + pose; vida: losangos + texto "3/5".*
- [x] Textos e elementos interativos têm contraste suficiente. *Marfim #e8dcc0 sobre #1c1816 ≈ 13:1 (calculado).*
- [ ] Áudio pode ser silenciado se houver áudio. *Sem áudio ainda.*
- [x] Efeitos não escondem ataques perigosos. *Partículas limitadas; área de perigo desenhada sob os personagens e sempre visível.*
- [ ] Movimento intenso pode ser reduzido quando viável. *Tremor de tela ainda não desligável (previsto nas configurações, Fase 3).*

## 7. Build e publicação
- [x] Executar os scripts de lint/teste/build existentes. *`npm test`, `npm run check`, `npm run build`. Não há linter configurado.*
- [x] Confirmar que a build de produção termina sem erros. *JS 24 KB (9,6 KB gzip); `dist/` com 260 KB.*
- [x] Testar a versão compilada, não apenas o servidor de desenvolvimento. *`npm run preview`: todos os assets 200, luta completa e pausa/menu verificados.*
- [ ] Se publicado, abrir a URL HTTPS e verificar carregamento de assets e controles. *Não publicado.*

## Modelo para registrar falhas
**ID:**  
**Gravidade:** bloqueador / alta / média / baixa  
**Ambiente:** navegador, versão, dispositivo e tamanho de tela  
**Passos para reproduzir:**  
**Resultado esperado:**  
**Resultado observado:**  
**Estado:** aberto / corrigido / retestado  

Não inventar resultados. Se um teste não puder ser executado por falta de dispositivo ou ambiente, deixá-lo pendente e explicar a limitação.