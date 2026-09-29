// ==UserScript==
// @name         Fy - Barra de Navegação Inferior
// @namespace    tampermonkey.ytmusic.bottomnav
// @version      2.1
// @description  Barra de navegação inferior (Início/Explorar/Biblioteca) só nessas 3 páginas, com o mini-player por cima dela
// @match        https://music.youtube.com/*
// @grant        none
// @run-at       document-idle
// ==/UserScript==

// =============================================================================
// OBJETIVO DESTE SCRIPT (ler antes de editar — útil para uma IA retomar o código)
// =============================================================================
// Contexto: no YouTube Music (music.youtube.com) mobile web, os links "Início",
// "Explorar" e "Biblioteca" estão num menu escondido. O objetivo é imitar a
// app nativa: uma barra de navegação FIXA NO FUNDO com esses 3 separadores.
//
// REGRAS DE COMPORTAMENTO (definidas pelo utilizador, versão 2.0):
// 1. A barra SÓ é visível nas páginas Início ("/"), Explorar ("/explore...")
//    e Biblioteca ("/library..."). Em qualquer outra página (dentro de uma
//    música "/watch", pesquisa, playlist, artista, etc.) a barra fica
//    escondida e o YT Music comporta-se exatamente como de origem.
// 2. Nas 3 páginas acima, o MINI-PLAYER (a barra do que está a tocar) fica
//    ENCOSTADO POR CIMA da nossa barra, nunca escondido atrás dela.
// 3. Dentro de uma música não mexemos em NADA (nem no mini-player, nem no
//    painel A seguir/Letras/...), para não partir o layout nativo.
//
// COMO FUNCIONA:
// - findMenuItemByText(): encontra os 3 itens pelo TEXTO visível (mais
//   estável do que classes CSS, que a Google muda).
// - buildBar(): cria <div id="tm-bottom-nav"> e MOVE (não clona) os 3
//   elementos reais para lá, para os cliques continuarem a funcionar.
// - updateVisibility(): decide pela URL (location.pathname) se estamos numa
//   das 3 páginas e liga/desliga a classe "tm-nav-visible" no <body>. Toda
//   a lógica de mostrar/esconder e de reposicionar o mini-player é CSS
//   condicionada a essa classe. É chamada em "yt-navigate-finish" (evento
//   do YT Music ao navegar), "popstate" e por um setInterval de segurança,
//   porque o YT Music é uma SPA e a página não recarrega ao navegar.
// - O mini-player é o elemento "ytmusic-player-bar, #player-bar"; só o
//   "bottom" e o "z-index" são alterados (mexer noutras propriedades partiu
//   a capa da música no passado).
//
// HISTÓRICO / LIÇÕES (não repetir):
// - Tentar mover o botão de pesquisa para a barra partiu a pesquisa. Abandonado.
// - Forçar padding-bottom em #side-panel / ytmusic-tab-renderer /
//   ytmusic-player-page piorou a página. Não mexer nesses elementos.
// - #side-panel existe SEMPRE no DOM (mesmo com o painel fechado), por isso
//   NÃO serve para detetar se "A tocar agora" está aberto. Usar a URL.
//
// CAPA DA MÚSICA NO MINI-PLAYER (versão 2.1):
// - Causa identificada no HTML do mini-player: a <img class="thumbnail"> dentro
//   de .mweb-thumbnail-image-wrapper (em #left-controls) tem o atributo
//   "hidden", por isso nunca aparece. (A outra, img.image em
//   .thumbnail-image-wrapper dentro de .middle-controls, não tem "hidden".)
// - Camada 1 (CSS): display:block !important + tamanho explícito nessa <img>,
//   só quando body.tm-nav-visible (Início/Explorar/Biblioteca).
// - Camada 2 (JS, ensureMiniThumbnail): se a imagem nativa continuar sem
//   largura visível, cria-se <img id="tm-mini-thumb"> dentro do mini-player
//   com o mesmo URL, posicionada à esquerda, com padding-left no mini-player.
// - Nada disto corre fora das 3 páginas, nem dentro de uma música.
//
// SE ALGO FALHAR:
// - Barra não aparece: confirmar LABELS (texto exato do menu) e o pathname
//   real das páginas Início/Explorar/Biblioteca (função isNavRoute).
// - Barra aparece dentro de uma música: ver o pathname atual nessa vista e
//   ajustar isNavRoute().
// =============================================================================

(function () {
  'use strict';

  // ---- AJUSTES RÁPIDOS ----------------------------------------------------
  const LABELS = ['Início', 'Explorar', 'Biblioteca']; // textos exatos do menu
  const BAR_HEIGHT = 60;       // altura da barra em px
  const BOTTOM_EXTRA = 12;      // espaço extra abaixo do conteúdo, além da safe-area
  const ICON_SIZE = 25;        // tamanho do ícone em px
  const ICON_TEXT_GAP = 3;     // espaço entre o ícone e o texto em px
  const FONT_SIZE = 9;         // tamanho do texto em px
  // --------------------------------------------------------------------------

  const BAR_ID = 'tm-bottom-nav';
  const TOTAL_BAR_HEIGHT_CSS = `calc(env(safe-area-inset-bottom, 0px) + ${BAR_HEIGHT + BOTTOM_EXTRA}px)`;

  function findMenuItemByText(text) {
    const candidates = Array.from(
      document.querySelectorAll(
        'a, tp-yt-paper-item, tp-yt-paper-icon-item, ytmusic-guide-entry-renderer, [role="link"], [role="tab"], [role="menuitem"]'
      )
    );
    return candidates.find((el) => {
      const t = el.textContent.trim();
      const title = el.getAttribute('title');
      return t === text || t.startsWith(text) || title === text;
    });
  }

  function buildBar() {
    if (document.getElementById(BAR_ID)) return;

    const items = LABELS.map(findMenuItemByText);
    if (items.some((el) => !el)) return;

    const bar = document.createElement('div');
    bar.id = BAR_ID;
    items.forEach((item) => bar.appendChild(item));

    document.body.appendChild(bar);
    updateVisibility();
  }

  // Só Início, Explorar e Biblioteca mostram a barra.
  function isNavRoute() {
    const p = location.pathname;
    return (
      p === '/' ||
      p === '' ||
      p.startsWith('/explore') ||
      p.startsWith('/library') ||
      p.startsWith('/playlist') // página de uma playlist (lista de músicas)
    );
  }

  function syncPlayerBarHeight() {
    const playerBar = document.querySelector('ytmusic-player-bar, #player-bar');
    const height = playerBar ? playerBar.getBoundingClientRect().height : 0;
    document.documentElement.style.setProperty('--tm-player-height', `${height}px`);
  }

  // Camada 2 da capa do mini-player: se, mesmo com o CSS a forçar a imagem
  // nativa a aparecer, ela continuar sem tamanho visível (ex: um ancestral
  // escondido), cria-se uma <img id="tm-mini-thumb"> própria dentro do
  // mini-player, com o mesmo URL da capa. Só ativa em Início/Explorar/
  // Biblioteca. Se a imagem nativa já estiver visível, não faz nada.
  function ensureMiniThumbnail() {
    try {
      const bar = document.querySelector('ytmusic-player-bar');
      if (!bar) return;

      const nativeImg = bar.querySelector('.mweb-thumbnail-image-wrapper img.thumbnail');
      const middleImg = bar.querySelector('.thumbnail-image-wrapper img.image');
      const src = [nativeImg, middleImg]
        .filter(Boolean)
        .map((img) => img.src)
        .find((s) => s && !s.startsWith('data:'));

      const nativeVisible = !!nativeImg && nativeImg.getBoundingClientRect().width > 0;
      const needFallback =
        document.body.classList.contains('tm-nav-visible') && !!src && !nativeVisible;

      if (needFallback) {
        let fb = document.getElementById('tm-mini-thumb');
        if (!fb) {
          fb = document.createElement('img');
          fb.id = 'tm-mini-thumb';
          fb.alt = '';
          fb.draggable = false;
          bar.appendChild(fb);
        }
        const hiRes = src.replace(/=w\d+-h\d+/, '=w120-h120'); // mais nítida em ecrãs retina
        if (fb.src !== hiRes) fb.src = hiRes;
      }
      document.body.classList.toggle('tm-thumb-fallback', needFallback);
    } catch (e) {
      /* nunca deixar um erro aqui partir o resto do script */
    }
  }

  function updateVisibility() {
    document.body.classList.toggle('tm-nav-visible', isNavRoute());
    syncPlayerBarHeight();
    ensureMiniThumbnail();
  }

  const style = document.createElement('style');
  style.textContent = `
    #${BAR_ID} {
      position: fixed;
      left: 0;
      right: 0;
      bottom: 0;
      display: flex;
      justify-content: space-around;
      align-items: center;
      background: #212121;
      border-top: 1px solid #3d3d3d;
      z-index: 999999;
      height: ${BAR_HEIGHT}px;
      padding-bottom: calc(env(safe-area-inset-bottom, 0px) + ${BOTTOM_EXTRA}px);
    }

    /* fora de Início/Explorar/Biblioteca a barra fica escondida */
    body:not(.tm-nav-visible) #${BAR_ID} {
      display: none !important;
    }

    #${BAR_ID} * {
      background: none !important;
      background-color: transparent !important;
      box-shadow: none !important;
      border: none !important;
      border-radius: 0 !important;
      outline: none !important;
      margin: 0 !important;
      padding: 0 !important;
      box-sizing: border-box !important;
    }

    #${BAR_ID} > * {
      flex: 1;
      display: flex !important;
      flex-direction: column !important;
      align-items: center !important;
      justify-content: center !important;
      height: 100%;
      color: #fff !important;
      text-decoration: none !important;
    }

    #${BAR_ID} > * > * {
      display: flex !important;
      flex-direction: column !important;
      align-items: center !important;
      justify-content: center !important;
      width: 100% !important;
    }

    #${BAR_ID} svg,
    #${BAR_ID} yt-icon,
    #${BAR_ID} [class*="icon"] {
      width: ${ICON_SIZE}px !important;
      height: ${ICON_SIZE}px !important;
      max-width: ${ICON_SIZE}px !important;
      max-height: ${ICON_SIZE}px !important;
      margin-bottom: ${ICON_TEXT_GAP}px !important;
      display: block !important;
    }

    #${BAR_ID} yt-formatted-string,
    #${BAR_ID} [class*="title"],
    #${BAR_ID} span {
      font-size: ${FONT_SIZE}px !important;
      line-height: 1.1 !important;
      text-align: center !important;
      white-space: nowrap !important;
      width: 100% !important;
      display: block !important;
    }

    /* Só nas 3 páginas: o conteúdo não fica escondido atrás da barra + player */
    body.tm-nav-visible {
      padding-bottom: calc(${TOTAL_BAR_HEIGHT_CSS} + var(--tm-player-height, 0px)) !important;
    }

    /* Só nas 3 páginas: mini-player encostado POR CIMA da nossa barra.
       Só "bottom" e "z-index" — o resto fica como o YT Music o desenhou. */
    body.tm-nav-visible ytmusic-player-bar,
    body.tm-nav-visible #player-bar {
      bottom: ${TOTAL_BAR_HEIGHT_CSS} !important;
      z-index: 999998 !important;
    }

    /* CAPA DA MÚSICA NO MINI-PLAYER (só Início/Explorar/Biblioteca).
       Camada 1: a <img class="thumbnail"> dentro de .mweb-thumbnail-image-wrapper
       traz o atributo "hidden" do YT Music, que a esconde. Um display:block
       !important de autor vence o display:none do atributo hidden. */
    body.tm-nav-visible ytmusic-player-bar .mweb-thumbnail-image-wrapper {
      display: flex !important;
      align-items: center !important;
    }
    body.tm-nav-visible ytmusic-player-bar .mweb-thumbnail-image-wrapper img.thumbnail {
      display: block !important;
      visibility: visible !important;
      opacity: 1 !important;
      width: 40px !important;
      height: 40px !important;
      min-width: 40px !important;
      object-fit: cover !important;
      border-radius: 4px !important;
    }

    /* Camada 2 (só se a camada 1 não resultar): imagem própria do script,
       criada por ensureMiniThumbnail(). Fica escondida por defeito. */
    #tm-mini-thumb {
      display: none;
      position: absolute;
      left: 8px;
      top: 50%;
      transform: translateY(-50%);
      width: 40px;
      height: 40px;
      object-fit: cover;
      border-radius: 4px;
      z-index: 1;
      pointer-events: none; /* toques passam para o mini-player */
    }
    body.tm-nav-visible.tm-thumb-fallback #tm-mini-thumb {
      display: block;
    }
    body.tm-nav-visible.tm-thumb-fallback ytmusic-player-bar {
      padding-left: 56px !important;
      box-sizing: border-box !important;
    }
  `;
  document.head.appendChild(style);

  // A YT Music é uma SPA: observamos o DOM para construir a barra quando o
  // menu aparecer, e reagimos à navegação para mostrar/esconder.
  new MutationObserver(() => buildBar()).observe(document.body, { childList: true, subtree: true });
  window.addEventListener('yt-navigate-finish', updateVisibility);
  window.addEventListener('popstate', updateVisibility);
  setInterval(updateVisibility, 400); // rede de segurança

  buildBar();
  updateVisibility();
})();