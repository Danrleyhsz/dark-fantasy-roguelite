# Plano de testes

Marcar um item como concluído somente depois de executá-lo. Registrar navegador, dispositivo, passos, resultado esperado e resultado observado quando houver falha.

## 1. Inicialização e navegação
- [ ] A página carrega sem erro fatal.
- [ ] O menu inicia uma partida.
- [ ] As instruções de controle estão visíveis.
- [ ] Pausar e voltar ao jogo funciona.
- [ ] Voltar ao menu não deixa a partida anterior ativa.

## 2. Movimento e combate
- [ ] A personagem se move nas direções previstas.
- [ ] Colisões com paredes/limites funcionam.
- [ ] Ataque funciona e respeita alcance/tempo de recarga definidos.
- [ ] Inimigos demonstram o padrão de ataque previsto.
- [ ] Preparação e área de perigo são visíveis antes de ataques fortes.
- [ ] Dano, invulnerabilidade temporária e feedback funcionam corretamente.
- [ ] Vida não fica abaixo do limite definido nem é atualizada duas vezes por um único evento indevido.
- [ ] Derrota encerra a simulação e permite reiniciar.
- [ ] Melhorias escolhidas produzem o efeito descrito.
- [ ] A condição de vitória é alcançável e encerra a partida.

## 3. Reinício e estado
- [ ] Reiniciar limpa inimigos, projéteis, efeitos e estado temporário da tentativa anterior.
- [ ] Reiniciar repetidamente não duplica timers, eventos, áudio ou entidades.
- [ ] A simulação realmente para durante a pausa, vitória e derrota.
- [ ] Trocar de aba e voltar não deixa teclas ou ações presas.

## 4. Desktop e celular
- [ ] Teclado e mouse funcionam de acordo com as instruções.
- [ ] Controles de toque funcionam sem teclado físico.
- [ ] Botões têm tamanho adequado e não se sobrepõem à ação importante.
- [ ] HUD e menus cabem em telas estreitas.
- [ ] A página não rola acidentalmente durante o controle do jogo.
- [ ] Redimensionar a janela não distorce a área jogável.
- [ ] Testar pelo menos um navegador Chromium e, se disponível, Firefox ou Safari.

## 5. Salvamento e robustez
- [ ] Configurações persistem quando isso está implementado.
- [ ] Dados locais inválidos ou ausentes não impedem iniciar uma partida.
- [ ] Falha de armazenamento é tratada sem travar o jogo.
- [ ] Falha de carregamento de asset gera fallback ou mensagem compreensível.
- [ ] Não há erros recorrentes no console durante uma partida.

## 6. Acessibilidade e conforto
- [ ] Informações importantes não dependem apenas de cor.
- [ ] Textos e elementos interativos têm contraste suficiente.
- [ ] Áudio pode ser silenciado se houver áudio.
- [ ] Efeitos não escondem ataques perigosos.
- [ ] Movimento intenso pode ser reduzido quando viável.

## 7. Build e publicação
- [ ] Executar os scripts de lint/teste/build existentes.
- [ ] Confirmar que a build de produção termina sem erros.
- [ ] Testar a versão compilada, não apenas o servidor de desenvolvimento.
- [ ] Se publicado, abrir a URL HTTPS e verificar carregamento de assets e controles.

## Modelo para registrar falhas
**ID:**  
**Gravidade:** bloqueador / alta / média / baixa  
**Ambiente:** navegador, versão, dispositivo e tamanho de tela  
**Passos para reproduzir:**  
**Resultado esperado:**  
**Resultado observado:**  
**Estado:** aberto / corrigido / retestado  

Não inventar resultados. Se um teste não puder ser executado por falta de dispositivo ou ambiente, deixá-lo pendente e explicar a limitação.