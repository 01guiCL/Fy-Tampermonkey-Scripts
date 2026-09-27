// ==UserScript==
// @name         Fy - Barra de Navegação Inferior
// @namespace    tampermonkey.ytmusic.bottomnav
// @version      1.2
// @description  Move os itens "Início", "Explorar", "Biblioteca" do menu do YT Music para uma barra fixa no fundo, estilo app mobile
// @match        https://music.youtube.com/*
// @grant        none
// @run-at       document-idle
// ==/UserScript==

// =============================================================================
// OBJETIVO DESTE SCRIPT (ler antes de editar — útil para uma IA retomar o código)
// =============================================================================
// Contexto: o YouTube Music (music.youtube.com) na versão web/mobile mostra os
// links "Início", "Explorar" e "Biblioteca" dentro do menu lateral/hambúrguer
// normal do site. O objetivo é fazer a página parecer mais com a app nativa,
// que tem uma barra de navegação FIXA NO FUNDO do ecrã com esses 3 separadores.
//
// O QUE O SCRIPT FAZ, PASSO A PASSO:
// 1. Localiza os 3 elementos de menu cujo texto visível é exatamente "Início",
//    "Explorar" e "Biblioteca" (função findMenuItemByText). A procura é feita
//    por TEXTO, não por classes CSS, porque a Google muda os nomes das classes
//    internas com frequência — procurar por texto é mais resistente a updates
//    do site.
// 2. Cria um <div id="tm-bottom-nav"> novo e MOVE (appendChild, não clona) os
//    3 elementos encontrados para dentro dele. Por serem os elementos REAIS
//    (não cópias), os cliques/navegação continuam a funcionar normalmente, e
//    desaparecem automaticamente do sítio original porque foram movidos, não
//    duplicados.
// 3. Injeta CSS que:
//    - fixa a #tm-bottom-nav no fundo do ecrã (position: fixed; bottom: 0),
//      com espaço para a safe-area do telemóvel;
//    - remove COMPLETAMENTE qualquer fundo/contorno cinzento que o YT Music
//      normalmente usa para indicar qual separador está selecionado (o
//      utilizador pediu explicitamente para não ter nenhuma indicação visual
//      de item ativo);
//    - reorganiza cada item para ficar em coluna: ícone em cima, texto
//      centrado por baixo, tudo alinhado ao centro (como uma tab bar nativa
//      de iOS/Android), com um espaço generoso entre o ícone e o texto;
//    - aumenta o tamanho do ícone e reduz o tamanho do texto;
//    - adiciona padding-bottom ao <body> para o conteúdo da página não ficar
//      escondido atrás da barra nova.
// 4. Como o YT Music é uma Single Page Application (o conteúdo é montado
//    dinamicamente via JavaScript, incluindo depois da navegação entre
//    páginas), o script usa um MutationObserver a observar o <body> inteiro:
//    sempre que o DOM muda, tenta construir a barra outra vez (a função
//    buildBar() sai imediatamente se a barra já existir, ou se ainda não
//    encontrar os 3 itens).
//
// HISTÓRICO: foi tentado incluir também o botão de pesquisa (a lupa do canto
// superior direito) como 4º item da barra, mas foi abandonado — mover o
// botão real partia o comportamento de abrir a pesquisa (está ligado à
// posição dele dentro do componente <ytmusic-search-box>), e um botão
// "proxy" que simulava o clique era mais complexidade do que valia a pena.
// A barra tem só os 3 itens de navegação originais.
//
// PROBLEMAS CONHECIDOS / coisas a verificar se o site mudar:
// - Se o YT Music mudar o texto dos separadores (ex: para inglês "Home",
//   "Explore", "Library") ou adicionar espaços/ícones ao texto, a constante
//   LABELS no início do script tem de ser atualizada.
// - Se a barra deixar de aparecer, inspecionar um item do menu no DevTools
//   e confirmar a tag/estrutura, e ajustar a lista de seletores em
//   findMenuItemByText() e/ou os seletores CSS marcados com [class*="icon"]
//   e [class*="title"] (que tentam apanhar classes que CONTÊM essas palavras,
//   por serem mais estáveis do que nomes de classe exatos e ofuscados).
// =============================================================================

(function () {
  'use strict';

  // Se os teus rótulos aparecerem noutro idioma (ex: "Home", "Explore", "Library"),
  // muda os textos aqui para corresponderem exatamente ao que vês no menu.
  const LABELS = ['Início', 'Explorar', 'Biblioteca'];
  const BAR_ID = 'tm-bottom-nav';

  // Procura o elemento clicável cujo texto visível corresponde ao rótulo.
  // Usamos vários seletores possíveis porque a YT Music muda a estrutura interna com frequência.
  function findMenuItemByText(text) {
    const candidates = Array.from(
      document.querySelectorAll(
        'a, tp-yt-paper-item, tp-yt-paper-icon-item, ytmusic-guide-entry-renderer, [role="link"], [role="tab"], [role="menuitem"]'
      )
    );
    return candidates.find((el) => {
      const t = el.textContent.trim();
      const title = el.getAttribute('title');
      // aceita correspondência exata, ou o texto a começar pelo rótulo
      // (útil quando há espaços/ícones a acompanhar o texto)
      return t === text || t.startsWith(text) || title === text;
    });
  }

  function buildBar() {
    if (document.getElementById(BAR_ID)) return; // já construída

    const items = LABELS.map(findMenuItemByText);

    // Se algum item ainda não foi encontrado, a página pode não ter carregado
    // esse trecho do menu ainda — tentamos de novo no próximo evento do observer.
    if (items.some((el) => !el)) return;

    const bar = document.createElement('div');
    bar.id = BAR_ID;

    items.forEach((item) => {
      // move o elemento REAL (não uma cópia), para manter os cliques a funcionar
      bar.appendChild(item);
    });

    document.body.appendChild(bar);
    document.body.classList.add('tm-has-bottom-nav');
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
      height: 64px;
      /* espaço extra (10px) além da safe-area, para o conteúdo não ficar
         colado ao fundo físico do ecrã do telemóvel */
      padding-bottom: calc(env(safe-area-inset-bottom, 0px) + 10px);
    }

    /* remove COMPLETAMENTE qualquer fundo, "pílula" ou contorno que a YT Music
       usa para marcar o separador selecionado, em qualquer elemento dentro da barra.
       Também zera margens/padding em TUDO, porque um pequeno margin-left herdado
       do layout original (ícone+texto lado a lado) era o que desalinhava o texto
       para a direita quando empilhado. */
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

    /* cada item: ícone em cima, texto por baixo, tudo centrado */
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

    /* se o ícone/texto estiverem dentro de um wrapper extra, força-o também
       a empilhar e centrar (em vez de ficar lado a lado) */
    #${BAR_ID} > * > * {
      display: flex !important;
      flex-direction: column !important;
      align-items: center !important;
      justify-content: center !important;
      width: 100% !important;
    }

    /* tamanho maior e centrado para o ícone — ajusta o width/height se
       quiseres maior/menor. O espaço ícone->texto vem do margin-bottom
       aqui: ao pôr o espaço diretamente no ícone (em vez de "gap" no
       elemento pai), funciona mesmo que haja wrappers extra no meio,
       porque o YT Music não costuma ter o ícone e o texto como filhos
       diretos do mesmo elemento. */
    #${BAR_ID} svg,
    #${BAR_ID} yt-icon,
    #${BAR_ID} [class*="icon"] {
      width: 28px !important;
      height: 28px !important;
      max-width: 28px !important;
      max-height: 28px !important;
      margin-bottom: 5px !important;
      display: block !important;
    }

    /* texto mais pequeno, centrado, por baixo do ícone */
    #${BAR_ID} yt-formatted-string,
    #${BAR_ID} [class*="title"],
    #${BAR_ID} span {
      font-size: 10px !important;
      line-height: 1.1 !important;
      text-align: center !important;
      white-space: nowrap !important;
      width: 100% !important;
      display: block !important;
    }

    /* evita que o conteúdo da página fique escondido atrás da barra nova
       (altura da barra + o espaço extra do fundo) */
    body.tm-has-bottom-nav {
      padding-bottom: 84px;
    }
  `;
  document.head.appendChild(style);

  // A YT Music é uma SPA (carrega tudo via JavaScript), por isso o menu
  // pode não existir logo ao abrir a página. Observamos o DOM e tentamos
  // construir a barra sempre que algo muda, até conseguir.
  const observer = new MutationObserver(() => buildBar());
  observer.observe(document.body, { childList: true, subtree: true });

  buildBar();
})();