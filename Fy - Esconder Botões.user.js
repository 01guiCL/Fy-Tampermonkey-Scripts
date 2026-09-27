// ==UserScript==
// @name         Fy - Esconder Botões
// @namespace    tampermonkey.ytmusic.hidebuttons
// @version      1.0
// @description  Esconde o link central da nav-bar e o botão do menu (guide-button) do YT Music
// @match        https://music.youtube.com/*
// @grant        none
// @run-at       document-idle
// ==/UserScript==

// =============================================================================
// OBJETIVO DESTE SCRIPT (ler antes de editar — útil para uma IA retomar o código)
// =============================================================================
// Simplesmente esconde (display: none) dois elementos específicos do YT Music:
//   1. #layout > ytmusic-nav-bar > div.center-content > a
//      (o link/logo no centro da barra de navegação superior)
//   2. #guide-button
//      (o botão de menu/hambúrguer)
// Não os remove do DOM (não usa .remove()) — só os esconde visualmente com
// CSS. Isto é mais seguro do que apagar, porque evita partir código do YT
// Music que possa depender desses elementos continuarem a existir na página.
// Como o YT Music é uma SPA e estes elementos já existem logo no arranque da
// página (não são criados tardiamente como o menu lateral), um único CSS
// injetado no <head> chega — não precisa de MutationObserver.
//
// PROBLEMAS CONHECIDOS / coisas a verificar se o site mudar:
// - Se algum dos seletores deixar de encontrar o elemento (porque o YT Music
//   mudou a estrutura), inspecionar o elemento no DevTools e atualizar o
//   SELECTORS array abaixo.
// =============================================================================

(function () {
  'use strict';

  const SELECTORS = [
    '#layout > ytmusic-nav-bar > div.center-content.style-scope.ytmusic-nav-bar > a',
    '#guide-button',
  ];

  const style = document.createElement('style');
  style.textContent = SELECTORS.map((sel) => `${sel} { display: none !important; }`).join('\n');
  document.head.appendChild(style);
})();