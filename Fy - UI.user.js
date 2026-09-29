// ==UserScript==
// @name         Fy - UI
// @namespace    https://music.youtube.com/
// @version      1.1.0
// @description  Faz o YouTube Music web parecer a app (cantos arredondados em imagens, menus, chips, listas). NÃO altera a barra do mini player inferior nem a página do player completo.
// @match        https://music.youtube.com/*
// @run-at       document-start
// @grant        none
// ==/UserScript==

/*
================================================================================
CONTEXTO PARA QUALQUER IA / PROGRAMADOR QUE VÁ CORRIGIR ESTE SCRIPT
================================================================================

OBJETIVO
  Aproximar o visual do YouTube Music (versão web, music.youtube.com) do da app
  oficial de telemóvel, usando apenas CSS injetado por Tampermonkey. Não há
  lógica de negócio nem alteração de comportamento: é puramente estético.

REGRAS ABSOLUTAS (pedidas pelo utilizador)
  1. NÃO ALTERAR NADA NA BARRA DO MINI PLAYER (parte de baixo do ecrã).
     Essa barra é o elemento <ytmusic-player-bar>. Todas as regras geradas
     pela função rule() ganham automaticamente o sufixo:
         :not(ytmusic-player-bar):not(ytmusic-player-bar *)
     que exclui a própria barra e todos os seus descendentes.
  2. NÃO ARREDONDAR nada na página do player completo (a que mostra a imagem
     grande da música e os separadores "A seguir / Letra / Relacionados").
     Essa página é <ytmusic-player-page>. As regras de miniaturas passam a
     opção NOT_PLAYER_PAGE (":not(ytmusic-player-page *)") a rule().
     O arredondamento só deve existir FORA dessa página.

  Ao adicionar regras novas, USA SEMPRE rule([...], '...') e nunca CSS "solto".
  Restrições decorrentes:
    - Não usar pseudo-elementos (::before/::after) nos seletores passados a
      rule(), porque o sufixo :not(...) é acrescentado no fim do seletor.
    - Não redefinir variáveis CSS globais do YTM em :root/html (ex.:
      --ytmusic-background, --ytmusic-player-bar-background), pois a barra
      poderia herdá-las. As variáveis próprias deste script começam por --ytma-.
    - Menus popup abertos a partir da barra (ex.: "..." do mini player) são
      renderizados fora da barra (em ytmusic-popup-container), por isso ficam
      estilizados como os restantes menus. Isto é intencional.

O QUE É ALTERADO
  1. Sidebar: itens com cantos arredondados; item ativo/hover com fundo
     translúcido.
  2. Miniaturas: cantos ligeiramente arredondados (8px cartões, 6px listas,
     12px capas grandes de álbum/playlist). Miniaturas de artistas
     (thumbnail-crop="MUSIC_THUMBNAIL_CROP_CIRCLE") mantêm-se circulares.
     NADA disto se aplica dentro de ytmusic-player-page.
  3. Menus e popups (menu de contexto "...", dropdowns, menu da conta):
     cantos 12px, fundo #212121, sombra suave, hover translúcido.
  4. Chips de filtro (Relaxar, Energizar, etc.): retângulo com cantos de 8px,
     fundo branco 10% translúcido; chip selecionado branco com texto preto.
  5. Caixa de pesquisa: fundo #212121 e cantos arredondados.
  6. Diálogos e toasts: cantos arredondados.
  7. Títulos de secção (carrosséis): bold, como na app.
  8. Hover de itens de lista: fundo translúcido com cantos arredondados.

O QUE FOI EXPLICITAMENTE REMOVIDO A PEDIDO DO UTILIZADOR (não voltar a pôr)
  - Fundo preto puro (#000) em páginas, barra superior e sidebar.
  - Botões com estilo diferente (pill nos cabeçalhos, botão play circular):
    os botões ficam com o aspeto normal do YTM.
  - Arredondamento da imagem/vídeo grande e da fila na página do player.
  - Interruptor no menu do Tampermonkey.

ARQUITETURA
  - O CSS é construído em JS (array `blocks`) e injetado numa tag <style
    id="ytma-style"> em document-start. @grant none (não usa APIs GM_*).
  - O YTM é uma SPA (Polymer). Os elementos ytmusic-* são criados
    dinamicamente, mas o CSS global aplica-se na mesma.

SELETORES INCERTOS / MAIS PROPENSOS A PARTIR (verificar primeiro se algo falhar)
  Os nomes internos do YTM mudam sem aviso. Se algo falhar, abrir DevTools →
  Elements, inspecionar o elemento e ajustar o seletor:
    - ytmusic-player-page                            (página do player completo)
    - ytmusic-chip-cloud-chip-renderer[is-selected]  (atributo do chip ativo)
    - ytmusic-guide-entry-renderer[active]           (item ativo da sidebar)
    - ytmusic-search-box #input-box / .search-box    (caixa de pesquisa)
    - tp-yt-iron-dropdown                            (contentor dos menus popup)
  O YTM usa muito !important e estilos inline; por isso quase todas as
  declarações aqui usam !important.

HISTÓRICO
  1.0.0 - Versão inicial.
  1.1.0 - Removidos: fundo preto, botões diferentes, arredondamento na página
          do player completo, interruptor do Tampermonkey.
================================================================================
*/

(function () {
  'use strict';

  const STYLE_ID = 'ytma-style';

  // ---------------------------------------------------------------------------
  // Guardas de segurança
  //   NOT_BAR         -> exclui SEMPRE o mini player (ytmusic-player-bar).
  //   NOT_PLAYER_PAGE -> opcional; exclui a página do player completo.
  // ---------------------------------------------------------------------------
  const NOT_BAR = ':not(ytmusic-player-bar):not(ytmusic-player-bar *)';
  const NOT_PLAYER_PAGE = ':not(ytmusic-player-page):not(ytmusic-player-page *)';

  const rule = (selectors, body, extraGuard = '') =>
    selectors.map((s) => s + NOT_BAR + extraGuard).join(',\n') + ' {\n' + body + '\n}';

  const CIRCLE = '[thumbnail-crop="MUSIC_THUMBNAIL_CROP_CIRCLE"]';

  const blocks = [];

  // Variáveis próprias (prefixo --ytma-). Não mexem nas variáveis do YTM.
  blocks.push(`
    :root {
      --ytma-surface: #212121;
      --ytma-hover: rgba(255, 255, 255, 0.10);
      --ytma-chip: rgba(255, 255, 255, 0.10);
      --ytma-r-list: 6px;
      --ytma-r-card: 8px;
      --ytma-r-large: 12px;
      --ytma-r-menu: 12px;
      --ytma-r-dialog: 16px;
    }
  `);

  // 1. Sidebar -----------------------------------------------------------------
  blocks.push(
    rule(
      ['ytmusic-guide-entry-renderer tp-yt-paper-item', 'ytmusic-guide-entry-renderer a'],
      'border-radius: 12px !important;'
    )
  );
  blocks.push(
    rule(
      [
        'ytmusic-guide-entry-renderer[active] tp-yt-paper-item',
        'ytmusic-guide-entry-renderer tp-yt-paper-item:hover',
      ],
      'background: var(--ytma-hover) !important;'
    )
  );

  // 2. Miniaturas (nunca dentro da página do player completo) ---------------------
  // Regra base (cartões)
  blocks.push(
    rule(
      ['ytmusic-thumbnail-renderer:not(' + CIRCLE + ')'],
      'border-radius: var(--ytma-r-card) !important; overflow: hidden !important;',
      NOT_PLAYER_PAGE
    )
  );
  // Listas de músicas (mais subtil)
  blocks.push(
    rule(
      ['ytmusic-responsive-list-item-renderer ytmusic-thumbnail-renderer:not(' + CIRCLE + ')'],
      'border-radius: var(--ytma-r-list) !important;',
      NOT_PLAYER_PAGE
    )
  );
  // Capas grandes (cabeçalho de álbum/playlist)
  blocks.push(
    rule(
      [
        'ytmusic-detail-header-renderer ytmusic-thumbnail-renderer:not(' + CIRCLE + ')',
        'ytmusic-responsive-header-renderer ytmusic-thumbnail-renderer:not(' + CIRCLE + ')',
      ],
      'border-radius: var(--ytma-r-large) !important;',
      NOT_PLAYER_PAGE
    )
  );
  // Herança para a imagem e overlay interiores
  blocks.push(
    rule(
      [
        'ytmusic-thumbnail-renderer yt-img-shadow',
        'ytmusic-thumbnail-renderer img',
        'ytmusic-thumbnail-renderer ytmusic-item-thumbnail-overlay-renderer',
      ],
      'border-radius: inherit !important;',
      NOT_PLAYER_PAGE
    )
  );
  // Artistas: sempre circulares (tem de ficar depois das regras acima)
  blocks.push(
    rule(
      ['ytmusic-thumbnail-renderer' + CIRCLE],
      'border-radius: 50% !important; overflow: hidden !important;',
      NOT_PLAYER_PAGE
    )
  );

  // 3. Menus e popups ----------------------------------------------------------
  blocks.push(
    rule(
      [
        'tp-yt-iron-dropdown',
        'ytmusic-menu-popup-renderer',
        'ytmusic-multi-page-menu-renderer',
        'ytmusic-dropdown-renderer tp-yt-paper-listbox',
      ],
      'border-radius: var(--ytma-r-menu) !important; overflow: hidden !important;'
    )
  );
  blocks.push(
    rule(
      [
        'ytmusic-menu-popup-renderer',
        'ytmusic-multi-page-menu-renderer',
        'ytmusic-popup-container tp-yt-paper-listbox',
      ],
      'background: var(--ytma-surface) !important; box-shadow: 0 8px 24px rgba(0, 0, 0, 0.55) !important;'
    )
  );
  blocks.push(
    rule(
      [
        'ytmusic-menu-popup-renderer tp-yt-paper-item:hover',
        'ytmusic-menu-popup-renderer tp-yt-paper-item:focus',
        'ytmusic-multi-page-menu-renderer tp-yt-paper-item:hover',
      ],
      'background: var(--ytma-hover) !important;'
    )
  );

  // 5. Caixa de pesquisa ---------------------------------------------------------
  blocks.push(
    rule(
      ['ytmusic-search-box #input-box', 'ytmusic-search-box .search-box'],
      'background: var(--ytma-surface) !important; border-radius: 12px !important; border: none !important;'
    )
  );

  // 6. Diálogos e toasts -----------------------------------------------------------
  blocks.push(
    rule(
      ['tp-yt-paper-dialog', 'ytmusic-popup-container tp-yt-paper-dialog'],
      'border-radius: var(--ytma-r-dialog) !important; background: var(--ytma-surface) !important;'
    )
  );
  blocks.push(rule(['tp-yt-paper-toast', 'yt-notification-action-renderer'], 'border-radius: 8px !important;'));

  // 7. Títulos de secção ---------------------------------------------------------------
  blocks.push(
    rule(
      [
        'ytmusic-carousel-shelf-basic-header-renderer .title',
        'ytmusic-shelf-renderer .title',
        'ytmusic-carousel-shelf-basic-header-renderer h2',
      ],
      'font-weight: 700 !important;'
    )
  );

  // 8. Hover em listas (fora da página do player) --------------------------------------------
  blocks.push(
    rule(['ytmusic-responsive-list-item-renderer'], 'border-radius: var(--ytma-r-card) !important;', NOT_PLAYER_PAGE)
  );
  blocks.push(
    rule(
      ['ytmusic-responsive-list-item-renderer:hover'],
      'background: var(--ytma-hover) !important;',
      NOT_PLAYER_PAGE
    )
  );

  // ---------------------------------------------------------------------------
  // Injeção
  // ---------------------------------------------------------------------------
  function apply() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = blocks.join('\n');
    (document.head || document.documentElement).appendChild(style);
  }

  apply();
  document.addEventListener('DOMContentLoaded', apply);
})();