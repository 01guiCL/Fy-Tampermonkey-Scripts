// ==UserScript==
// @name         Fy – Master
// @namespace    https://music.youtube.com/
// @version      1.0.0
// @description  Junta todos os scripts Fy!
// @match        https://music.youtube.com/*
// @grant        GM_xmlhttpRequest
// @grant        GM_getValue
// @grant        GM_setValue
// @connect      lrclib.net
// @connect      music.163.com
// @run-at       document-idle
// @noframes
// ==/UserScript==

// Barra Nav Inferior
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




// Esconder botões
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



// Letras Sincronizadas
(function () {
  'use strict';

  /* ------------------------------------------------------------------ *
   *  Configuração e estado
   * ------------------------------------------------------------------ */
  const CFG = {
    OFFSET: 0.2,               // s de antecipação da linha ativa
    POLL_MS: 400,
    DEBOUNCE_MS: 700,
    DURATION_TOLERANCE: 4,     // s
    CACHE_KEY: 'ytml_cache_v1',
    CACHE_MAX: 300,
    USER_SCROLL_PAUSE_MS: 3500,
    ANCHOR: 0.3,               // posição vertical da linha ativa (0..1)
    MIN_LINES: 3,
    LOG: true,
  };

  const LRC_API = 'https://lrclib.net/api';
  const S = {
    key: null, pendingKey: null, pendingSince: 0,
    reqId: 0, status: 'idle',        // idle | loading | ready | none
    track: null, lines: [], els: [], active: -2, source: '',
    root: null, list: null,
    lastUserScroll: 0, wasVisible: false, anim: 0,
    sel: false, lastSelCheck: 0,
  };

  const log = (...a) => CFG.LOG && console.log('[YTM-Letras]', ...a);
  const getVideo = () => document.querySelector('video');

  /* ------------------------------------------------------------------ *
   *  Utilitários
   * ------------------------------------------------------------------ */
  const norm = (s) =>
    (s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '');

  const similar = (a, b) => {
    a = norm(a); b = norm(b);
    return !!a && !!b && (a.includes(b) || b.includes(a));
  };

  const cleanTitle = (t) =>
    (t || '')
      .replace(/\s*[\(\[][^\)\]]*(feat\.?|ft\.?|with |remaster|live|version|edit|mix|deluxe|bonus|explicit|official|video|audio|lyrics?)[^\)\]]*[\)\]]/gi, '')
      .replace(/\s*-\s*(remaster(ed)?( \d{4})?|\d{4} remaster(ed)?|single version|radio edit|live.*)$/i, '')
      .trim();

  const primaryArtist = (a) =>
    (a || '').split(/\s*(?:,|&|;|\sfeat\.?\s|\sft\.?\s|\sx\s)\s*/i)[0].trim();

  function getTrack() {
    const md = navigator.mediaSession && navigator.mediaSession.metadata;
    const title = (md && md.title) ||
      (document.querySelector('ytmusic-player-bar .title') || {}).textContent || '';
    let artist = (md && md.artist) || '';
    if (!artist) {
      const by = (document.querySelector('ytmusic-player-bar .byline') || {}).textContent || '';
      artist = by.split('•')[0].trim();
    }
    const v = getVideo();
    const duration = v && isFinite(v.duration) ? v.duration : 0;
    return { title: title.trim(), artist: artist.trim(), album: ((md && md.album) || '').trim(), duration };
  }

  function parseLRC(text) {
    const out = [];
    const tagRe = /\[(\d{1,3}):(\d{1,2})(?:[.:](\d{1,3}))?\]/g;
    for (const raw of String(text || '').split(/\r?\n/)) {
      const times = [];
      let m, last = 0;
      tagRe.lastIndex = 0;
      while ((m = tagRe.exec(raw))) {
        const frac = m[3] ? parseFloat('0.' + m[3]) : 0;
        times.push(+m[1] * 60 + +m[2] + frac);
        last = tagRe.lastIndex;
      }
      if (!times.length) continue;
      const txt = raw.slice(last).replace(/<\d+:\d+(?:[.:]\d+)?>/g, '').trim();
      if (/^(作词|作曲|编曲|制作人|作詞|编辑|混音)\s*[:：]/.test(txt)) continue;
      for (const t of times) out.push({ t, text: txt });
    }
    out.sort((a, b) => a.t - b.t);
    // remove linhas vazias consecutivas
    return out.filter((l, i) => !(l.text === '' && i > 0 && out[i - 1].text === ''));
  }

  const validLines = (lines) =>
    lines.length >= CFG.MIN_LINES && lines.filter((l) => l.text).length >= CFG.MIN_LINES;

  function http(url, { method = 'GET', headers = {}, data } = {}) {
    return new Promise((resolve, reject) => {
      GM_xmlhttpRequest({
        method, url, headers, data, timeout: 8000,
        onload: (r) => (r.status >= 200 && r.status < 300)
          ? resolve(r.responseText) : reject(new Error('HTTP ' + r.status)),
        onerror: () => reject(new Error('erro de rede')),
        ontimeout: () => reject(new Error('timeout')),
      });
    });
  }
  const getJSON = async (url, opts) => JSON.parse(await http(url, opts));

  /* ------------------------------------------------------------------ *
   *  Fontes
   * ------------------------------------------------------------------ */
  async function fromLrclib(t) {
    const H = { 'Lrclib-Client': 'ytm-letras-sincronizadas-userscript v1', Accept: 'application/json' };
    const ca = primaryArtist(t.artist), ct = cleanTitle(t.title);
    const pick = (r) => {
      if (!r || !r.syncedLyrics) return null;
      const lines = parseLRC(r.syncedLyrics);
      return validLines(lines) ? { lines, source: 'LRCLIB' } : null;
    };

    const variants = [{ artist: t.artist, title: t.title, album: t.album }];
    if (ca !== t.artist || ct !== t.title) variants.push({ artist: ca, title: ct, album: '' });

    for (const v of variants) {
      const p = { artist_name: v.artist, track_name: v.title };
      if (v.album) p.album_name = v.album;
      if (t.duration) p.duration = Math.round(t.duration);
      try {
        const ok = pick(await getJSON(`${LRC_API}/get?${new URLSearchParams(p)}`, { headers: H }));
        if (ok) return ok;
      } catch (e) { /* 404 = não existe; segue */ }
    }

    const queries = [
      new URLSearchParams({ track_name: ct, artist_name: ca }),
      new URLSearchParams({ q: `${ca} ${ct}` }),
    ];
    for (const q of queries) {
      try {
        const arr = await getJSON(`${LRC_API}/search?${q}`, { headers: H });
        const cands = (arr || [])
          .filter((r) => r.syncedLyrics && similar(r.trackName || r.name, ct))
          .map((r) => ({ r, d: t.duration ? Math.abs((r.duration || 0) - t.duration) : 0 }))
          .filter((x) => !t.duration || x.d <= CFG.DURATION_TOLERANCE)
          .sort((a, b) => a.d - b.d);
        for (const x of cands) { const ok = pick(x.r); if (ok) return ok; }
      } catch (e) { /* ignora */ }
    }
    return null;
  }

  async function fromNetease(t) {
    const artist = primaryArtist(t.artist), title = cleanTitle(t.title);
    const body = new URLSearchParams({ s: `${title} ${artist}`, type: '1', limit: '8', offset: '0' }).toString();
    const res = await getJSON('https://music.163.com/api/search/get/', {
      method: 'POST', data: body,
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', Referer: 'https://music.163.com/' },
    });
    const songs = (res && res.result && res.result.songs) || [];
    const cands = songs
      .filter((s) => similar(s.name, title) &&
        (s.artists || []).some((a) => similar(a.name, artist)))
      .map((s) => ({ s, d: t.duration ? Math.abs((s.duration || 0) / 1000 - t.duration) : 0 }))
      .filter((x) => !t.duration || x.d <= CFG.DURATION_TOLERANCE)
      .sort((a, b) => a.d - b.d).slice(0, 3);
    for (const c of cands) {
      try {
        const l = await getJSON(`https://music.163.com/api/song/lyric?id=${c.s.id}&lv=1&kv=1&tv=-1`,
          { headers: { Referer: 'https://music.163.com/' } });
        const lines = parseLRC(l && l.lrc && l.lrc.lyric);
        if (validLines(lines)) return { lines, source: 'NetEase' };
      } catch (e) { /* tenta próxima */ }
    }
    return null;
  }

  /* ------------------------------------------------------------------ *
   *  Cache
   * ------------------------------------------------------------------ */
  const cacheAll = () => { try { return GM_getValue(CFG.CACHE_KEY, {}) || {}; } catch (e) { return {}; } };
  const cacheGet = (k) => {
    const e = cacheAll()[k];
    return e ? { lines: e.l.map(([t, text]) => ({ t, text })), source: e.s } : null;
  };
  function cacheSet(k, res) {
    try {
      const all = cacheAll();
      all[k] = { l: res.lines.map((x) => [x.t, x.text]), s: res.source, at: Date.now() };
      const keys = Object.keys(all);
      if (keys.length > CFG.CACHE_MAX) {
        keys.sort((a, b) => all[a].at - all[b].at)
          .slice(0, keys.length - CFG.CACHE_MAX).forEach((x) => delete all[x]);
      }
      GM_setValue(CFG.CACHE_KEY, all);
    } catch (e) { /* ignora */ }
  }

  /* ------------------------------------------------------------------ *
   *  Carregamento
   * ------------------------------------------------------------------ */
  async function load(track, key) {
    const id = ++S.reqId;
    S.lines = []; S.els = []; S.active = -2; S.source = '';
    setStatus('loading');
    renderSkeleton();

    let res = cacheGet(key);
    if (!res) {
      try { res = await fromLrclib(track); } catch (e) { log('LRCLIB falhou', e); }
      if (id !== S.reqId) return;
      if (!res) { try { res = await fromNetease(track); } catch (e) { log('NetEase falhou', e); } }
      if (id !== S.reqId) return;
      if (res) cacheSet(key, res);
    }
    if (id !== S.reqId) return;

    if (res) {
      log(`letras encontradas (${res.source}) para`, track.artist, '-', track.title);
      S.lines = res.lines; S.source = res.source;
      setStatus('ready');
      renderLines();
    } else {
      log('sem letras sincronizadas; fallback para as nativas');
      setStatus('none');
    }
  }

  /* ------------------------------------------------------------------ *
   *  Estilos
   * ------------------------------------------------------------------ */
  const CSS = `
  ytmusic-tab-renderer.ytml-on { position: relative; }
  ytmusic-tab-renderer.ytml-on > *:not(#ytml-root) { display: none !important; }
  #ytml-root { display: none; position: relative; overflow-y: auto; overflow-x: hidden;
    box-sizing: border-box; scrollbar-width: none; overscroll-behavior: contain;
    font-family: Roboto, "YouTube Sans", "Segoe UI", sans-serif; color: #fff;
    -webkit-mask-image: linear-gradient(to bottom, transparent 0, #000 3%, #000 86%, transparent 100%);
            mask-image: linear-gradient(to bottom, transparent 0, #000 3%, #000 86%, transparent 100%); }
  #ytml-root.ytml-show { display: block; }
  #ytml-root::-webkit-scrollbar { display: none; }
  #ytml-root .ytml-list { padding: 8px 28px calc(var(--ytml-h, 420px) * .62); }

  #ytml-root .ytml-line {
    font-size: clamp(30px, 3.2vw, 48px); font-weight: 700; line-height: 1.22; letter-spacing: -.01em;
    padding: 9px 0; cursor: pointer; user-select: none; -webkit-user-select: none;
    color: #7a7a7a; transform: scale(.76); transform-origin: left center;
    filter: blur(calc(min(max(var(--d, 0) - 2, 0), 3) * .45px));
    transition: transform .55s cubic-bezier(.22, 1, .36, 1), color .4s ease, filter .55s ease, text-shadow .55s ease;
    animation: ytml-in .6s cubic-bezier(.22, 1, .36, 1) both; animation-delay: var(--ytml-delay, 0ms);
    will-change: transform;
  }
  #ytml-root .ytml-line:hover { color: #b9b9b9; transform: scale(.8); filter: none; }
  #ytml-root .ytml-line[data-state="active"] {
    color: #fff; transform: scale(1); filter: none; text-shadow: 0 0 30px rgba(255, 255, 255, .2);
  }
  #ytml-root .ytml-line:active { transform: scale(.72); }
  #ytml-root .ytml-line[data-state="active"]:active { transform: scale(.97); }

  #ytml-root .ytml-dots { display: inline-flex; align-items: center; gap: .3em; height: 1.2em; }
  #ytml-root .ytml-dots i { width: .34em; height: .34em; border-radius: 50%; background: currentColor; display: block; opacity: .6; }
  #ytml-root .ytml-line[data-state="active"] .ytml-dots i { animation: ytml-dot 1.3s ease-in-out infinite; }
  #ytml-root .ytml-dots i:nth-child(2) { animation-delay: .18s !important; }
  #ytml-root .ytml-dots i:nth-child(3) { animation-delay: .36s !important; }

  #ytml-root .ytml-skel { height: 26px; margin: 22px 0; border-radius: 13px; width: var(--w, 70%);
    background: linear-gradient(90deg, rgba(255,255,255,.07) 25%, rgba(255,255,255,.16) 50%, rgba(255,255,255,.07) 75%);
    background-size: 200% 100%; animation: ytml-shimmer 1.4s linear infinite; }
  #ytml-root .ytml-credit { font-size: 12px; color: #666; padding-top: 28px; }

  @keyframes ytml-in { from { opacity: 0; translate: 0 16px; } to { opacity: 1; translate: 0 0; } }
  @keyframes ytml-dot { 0%, 100% { transform: scale(.6); opacity: .35; } 50% { transform: scale(1.15); opacity: 1; } }
  @keyframes ytml-shimmer { from { background-position: 200% 0; } to { background-position: -200% 0; } }
  @media (prefers-reduced-motion: reduce) {
    #ytml-root .ytml-line { transition: color .2s; animation: none; }
    #ytml-root .ytml-dots i, #ytml-root .ytml-skel { animation: none !important; }
  }`;

  function injectStyle() {
    if (document.getElementById('ytml-style')) return;
    const st = document.createElement('style');
    st.id = 'ytml-style';
    st.textContent = CSS;
    document.head.appendChild(st);
  }

  /* ------------------------------------------------------------------ *
   *  DOM: montagem, estado e renderização
   * ------------------------------------------------------------------ */
  function buildRoot() {
    const root = document.createElement('div');
    root.id = 'ytml-root';
    const list = document.createElement('div');
    list.className = 'ytml-list';
    root.appendChild(list);
    const stop = () => { S.lastUserScroll = Date.now(); cancelAnimationFrame(S.anim); };
    root.addEventListener('wheel', stop, { passive: true });
    root.addEventListener('touchstart', stop, { passive: true });
    root.addEventListener('touchmove', stop, { passive: true });
    S.root = root; S.list = list;
  }

  const findRenderer = () =>
    document.querySelector('ytmusic-tab-renderer[page-type="MUSIC_PAGE_TYPE_TRACK_LYRICS"]');

  function ensureMounted() {
    const r = findRenderer();
    if (!S.root) buildRoot();
    // Só mostramos a camada se a tab Letras está selecionada E o renderer de letras existe.
    const on = !!r && S.sel && (S.status === 'loading' || S.status === 'ready');
    // Limpa SEMPRE qualquer renderer que tenha ficado marcado (o YT Music pode reutilizar
    // o mesmo elemento para "A seguir"/"Relacionado" e mudar-lhe o page-type).
    document.querySelectorAll('ytmusic-tab-renderer.ytml-on').forEach((x) => {
      if (!on || x !== r) x.classList.remove('ytml-on');
    });
    S.root.classList.toggle('ytml-show', on);
    if (!r) return null;
    if (S.root.parentElement !== r) r.appendChild(S.root);
    if (on) r.classList.add('ytml-on');
    return r;
  }

  function setStatus(s) { S.status = s; ensureMounted(); }

  function renderSkeleton() {
    if (!S.root) buildRoot();
    S.list.textContent = '';
    [78, 55, 68, 40, 72, 50].forEach((w) => {
      const d = document.createElement('div');
      d.className = 'ytml-skel';
      d.style.setProperty('--w', w + '%');
      S.list.appendChild(d);
    });
    S.root.scrollTop = 0;
  }

  function renderLines() {
    if (!S.root) buildRoot();
    S.list.textContent = '';
    S.els = S.lines.map((ln, i) => {
      const d = document.createElement('div');
      d.className = 'ytml-line';
      d.style.setProperty('--ytml-delay', Math.min(i, 12) * 35 + 'ms');
      const span = document.createElement('span');
      if (ln.text) {
        span.textContent = ln.text;
      } else {
        span.className = 'ytml-dots';
        for (let k = 0; k < 3; k++) span.appendChild(document.createElement('i'));
      }
      d.appendChild(span);
      d.addEventListener('click', () => seek(ln.t));
      S.list.appendChild(d);
      return d;
    });
    const credit = document.createElement('div');
    credit.className = 'ytml-credit';
    credit.textContent = 'Letras: ' + S.source;
    S.list.appendChild(credit);
    S.root.scrollTop = 0;
    S.active = -2;
    sizeRoot();
    updateActive(true, true);
  }

  function sizeRoot() {
    if (!S.root || !S.root.offsetParent) return;
    const top = S.root.getBoundingClientRect().top;
    const bar = document.querySelector('ytmusic-player-bar');
    const barH = bar ? bar.getBoundingClientRect().height : 72;
    const h = Math.max(240, Math.round(window.innerHeight - top - barH - 8));
    if (Math.abs((parseInt(S.root.style.height, 10) || 0) - h) > 2) {
      S.root.style.height = h + 'px';
      S.root.style.setProperty('--ytml-h', h + 'px');
    }
  }

  function idxAt(time) {
    let lo = 0, hi = S.lines.length - 1, r = -1;
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      if (S.lines[mid].t <= time) { r = mid; lo = mid + 1; } else hi = mid - 1;
    }
    return r;
  }

  function updateActive(force, instant) {
    const v = getVideo();
    if (!v || S.status !== 'ready' || !S.els.length) return;
    const i = idxAt(v.currentTime + CFG.OFFSET);
    if (i === S.active && !force) return;
    S.active = i;
    for (let k = 0; k < S.els.length; k++) {
      const d = k - i;
      const el = S.els[k];
      el.dataset.state = d === 0 ? 'active' : d < 0 ? 'past' : 'next';
      el.style.setProperty('--d', Math.abs(d));
    }
    const userBusy = Date.now() - S.lastUserScroll < CFG.USER_SCROLL_PAUSE_MS;
    if (!userBusy || instant) {
      if (i >= 0) scrollToLine(S.els[i], !!instant);
      else if (instant) S.root.scrollTop = 0;
    }
  }

  function scrollToLine(el, instant) {
    const root = S.root;
    if (!root || !root.offsetParent) return;
    const target = Math.max(0, el.offsetTop + el.offsetHeight / 2 - root.clientHeight * CFG.ANCHOR);
    cancelAnimationFrame(S.anim);
    if (instant) { root.scrollTop = target; return; }
    const from = root.scrollTop, dist = target - from, start = performance.now();
    const dur = Math.min(900, 450 + Math.abs(dist) * 0.4);
    const step = (now) => {
      const p = Math.min(1, (now - start) / dur);
      root.scrollTop = from + dist * (1 - Math.pow(1 - p, 3));
      if (p < 1) S.anim = requestAnimationFrame(step);
    };
    S.anim = requestAnimationFrame(step);
  }

  function seek(t) {
    const p = document.getElementById('movie_player');
    if (p && typeof p.seekTo === 'function') p.seekTo(t, true);
    else { const v = getVideo(); if (v) v.currentTime = t; }
    S.lastUserScroll = 0;
    setTimeout(() => updateActive(true), 60);
  }

  /* ------------------------------------------------------------------ *
   *  Tab "Letras": reativar se o YT Music a desativou
   * ------------------------------------------------------------------ */
  function getLyricsTab() {
    const tabs = [...document.querySelectorAll('ytmusic-player-page tp-yt-paper-tab')];
    if (!tabs.length) return null;
    return tabs.find((t) => /letras|lyrics|letra/i.test(t.textContent)) || tabs[1] || null;
  }

  // A nossa camada só aparece quando a tab "Letras" está mesmo selecionada.
  function refreshSelected() {
    const tab = getLyricsTab();
    const sel = !!tab && (tab.getAttribute('aria-selected') === 'true' || tab.classList.contains('iron-selected'));
    if (sel !== S.sel) { S.sel = sel; ensureMounted(); }
  }

  function enableLyricsTab() {
    const tab = getLyricsTab();
    if (!tab) return;
    if (tab.hasAttribute('disabled') || tab.getAttribute('aria-disabled') === 'true') {
      tab.removeAttribute('disabled');
      tab.setAttribute('aria-disabled', 'false');
      tab.style.pointerEvents = 'auto';
      tab.style.opacity = '1';
    }
  }

  /* ------------------------------------------------------------------ *
   *  Loops
   * ------------------------------------------------------------------ */
  function tick() {
    refreshSelected();
    ensureMounted();
    const t = getTrack();
    if (!t.title || !t.duration) return;

    const key = `${t.artist}|${t.title}|${Math.round(t.duration)}`;
    const now = Date.now();
    if (key !== S.key) {
      if (S.pendingKey !== key) { S.pendingKey = key; S.pendingSince = now; }
      else if (now - S.pendingSince >= CFG.DEBOUNCE_MS) {
        S.key = key; S.track = t;
        load(t, key);
      }
    }
    if (S.status === 'ready' || S.status === 'loading') enableLyricsTab();
    if (S.root && S.root.offsetParent) sizeRoot();
  }

  function frame() {
    const n = performance.now();
    if (n - S.lastSelCheck > 100) { S.lastSelCheck = n; refreshSelected(); }
    if (S.status === 'ready' && S.root) {
      const vis = !!S.root.offsetParent;
      if (vis && !S.wasVisible) { sizeRoot(); updateActive(true, true); }
      else if (vis) updateActive(false);
      S.wasVisible = vis;
    } else {
      S.wasVisible = false;
    }
    requestAnimationFrame(frame);
  }

  function init() {
    injectStyle();
    setInterval(tick, CFG.POLL_MS);
    requestAnimationFrame(frame);
    window.addEventListener('resize', () => { sizeRoot(); updateActive(true, true); });
    log('iniciado');
  }

  init();
})();



// UI
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