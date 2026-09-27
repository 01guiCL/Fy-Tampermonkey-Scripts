// ==UserScript==
// @name         Fy - Botão de Ecrã Inteiro
// @namespace    tampermonkey.ytmusic.fullscreenbutton
// @version      1.0
// @description  Adiciona um botão flutuante que ativa o modo de ecrã inteiro (esconde a barra do browser em browsers/SO que suportem)
// @match        https://music.youtube.com/*
// @grant        none
// @run-at       document-idle
// ==/UserScript==

// =============================================================================
// OBJETIVO DESTE SCRIPT (ler antes de editar — útil para uma IA retomar o código)
// =============================================================================
// Objetivo do utilizador: esconder a barra de separadores/endereço do browser
// (neste caso a Orion no iOS) para a página do YT Music parecer mais com uma
// app a full-screen.
//
// LIMITAÇÃO IMPORTANTE (não contornável por JavaScript):
// A Fullscreen API (document.documentElement.requestFullscreen()) só pode
// ser chamada em resposta DIRETA a um gesto do utilizador (um toque/clique).
// Nenhum browser permite que uma página ative isto sozinha ao carregar — é
// uma proteção de segurança contra sites que tentam esconder a UI do browser
// sem o utilizador saber. Por isso este script NÃO consegue esconder a barra
// automaticamente ao abrir a página; em vez disso, mostra um botão flutuante
// que o utilizador toca uma vez, e é essa interação que desbloqueia o modo
// de ecrã inteiro.
//
// Também depende do WebKit (motor da Orion/Safari no iOS) suportar a
// Fullscreen API para elementos normais da página — isto só chegou ao iOS a
// partir da versão 16.4. Em versões mais antigas, requestFullscreen() pode
// simplesmente falhar silenciosamente (o script deteta isso e não faz nada
// visível, sem dar erro).
//
// O QUE O SCRIPT FAZ:
// 1. Cria um botão circular fixo no canto do ecrã (posição definida por
//    BUTTON_POSITION abaixo).
// 2. Ao tocar: se a página não está em ecrã inteiro, pede para entrar
//    (document.documentElement.requestFullscreen()); se já está, sai
//    (document.exitFullscreen()).
// 3. Muda o ícone do botão consoante o estado atual (expandir/reduzir),
//    ouvindo o evento "fullscreenchange".
// 4. Numa SPA como o YT Music, navegar dentro do site (Início, Explorar,
//    etc.) normalmente NÃO sai do ecrã inteiro, porque a página não recarrega
//    de verdade — só um refresh completo (ou fechar/reabrir o separador)
//    volta a exigir um toque no botão.
//
// PROBLEMAS CONHECIDOS / coisas a verificar:
// - Se tocares no botão e nada acontecer, a versão do iOS/Orion pode não
//   suportar Fullscreen API para páginas normais — não há alternativa via
//   JavaScript nesse caso, é uma limitação do sistema/browser.
// - Se quiseres o botão noutro sítio do ecrã ou com outro visual, muda as
//   constantes BUTTON_POSITION / tamanhos no bloco de CSS mais abaixo.
// =============================================================================

(function () {
  'use strict';

  // Onde o botão aparece no ecrã. Muda para 'top-left', 'top-right',
  // 'bottom-left' ou 'bottom-right'.
  const BUTTON_POSITION = 'top-right';

  const BUTTON_ID = 'tm-fullscreen-button';

  function isFullscreen() {
    return !!document.fullscreenElement;
  }

  async function toggleFullscreen() {
    try {
      if (!isFullscreen()) {
        await document.documentElement.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch (err) {
      // Falha silenciosa: normalmente significa que o browser/SO não
      // suporta ou bloqueou o pedido (ex: não foi um toque direto).
      console.warn('[YT Music Fullscreen] Não foi possível alternar ecrã inteiro:', err);
    }
  }

  function createButton() {
    if (document.getElementById(BUTTON_ID)) return;

    const btn = document.createElement('button');
    btn.id = BUTTON_ID;
    btn.type = 'button';
    btn.setAttribute('aria-label', 'Alternar ecrã inteiro');
    btn.textContent = '⛶';

    btn.addEventListener('click', toggleFullscreen);

    document.addEventListener('fullscreenchange', () => {
      btn.textContent = isFullscreen() ? '⤫' : '⛶';
    });

    document.body.appendChild(btn);
  }

  const positions = {
    'top-right': 'top: 12px; right: 12px;',
    'top-left': 'top: 12px; left: 12px;',
    'bottom-right': 'bottom: 12px; right: 12px;',
    'bottom-left': 'bottom: 12px; left: 12px;',
  };

  const style = document.createElement('style');
  style.textContent = `
    #${BUTTON_ID} {
      position: fixed;
      ${positions[BUTTON_POSITION] || positions['top-right']}
      z-index: 999999;
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background: rgba(0, 0, 0, 0.55);
      color: #fff;
      border: none;
      font-size: 18px;
      line-height: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0;
      -webkit-tap-highlight-color: transparent;
    }
  `;
  document.head.appendChild(style);

  createButton();
})();