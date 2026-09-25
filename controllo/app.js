/**
 * IL GUSCIO DEL PANNELLO
 * ======================
 *
 * Menu (§94), selettore dell'app sempre in alto (§4), ricerca globale (§79),
 * briciole, preferiti e recenti (§95), tema chiaro/scuro. Ogni pagina sta in
 * `pagine/` ed è una funzione che riceve il contesto e restituisce i suoi nodi:
 * il guscio non sa niente di cosa c'è dentro.
 */
import * as api from './api.js';
import { h, svuota, metti, memoria, avvisa, erroreBox, caricamento } from './ui.js';

const MENU = [
  { gruppo: 'Panoramica', voci: [
    { k: 'comando', nome: 'Command Center', ico: '◎' },
    { k: 'apps', nome: 'App', ico: '▦' },
  ] },
  { gruppo: 'Giocatori', voci: [
    { k: 'giocatori', nome: 'Giocatori', ico: '☺' },
    { k: 'partite', nome: 'Partite', ico: '♠' },
    { k: 'assistenza', nome: 'Assistenza', ico: '✉', fase: 2 },
    { k: 'moderazione', nome: 'Moderazione', ico: '⚑', fase: 2 },
    { k: 'frodi', nome: 'Frodi', ico: '⛨', fase: 2 },
  ] },
  { gruppo: 'Gioco', voci: [
    { k: 'giochi', nome: 'Giochi', ico: '♦', fase: 2 },
    { k: 'liveops', nome: 'Live Ops', ico: '◷', fase: 2 },
    { k: 'tornei', nome: 'Tornei', ico: '♛', fase: 2 },
    { k: 'economia', nome: 'Economia', ico: '◈', fase: 2 },
    { k: 'negozio', nome: 'Negozio', ico: '▣', fase: 2 },
  ] },
  { gruppo: 'Ricavi e crescita', voci: [
    { k: 'monetizzazione', nome: 'Monetizzazione', ico: '€' },
    { k: 'crm', nome: 'CRM', ico: '✆', fase: 2 },
    { k: 'crescita', nome: 'Crescita', ico: '↗', fase: 3 },
    { k: 'esperimenti', nome: 'Esperimenti', ico: '⚗', fase: 3 },
    { k: 'analisi', nome: 'Analisi', ico: '▤', fase: 2 },
  ] },
  { gruppo: 'Operazioni', voci: [
    { k: 'tecnica', nome: 'Tecnica', ico: '⚙' },
    { k: 'rilasci', nome: 'Rilasci', ico: '⇪' },
    { k: 'contenuti', nome: 'Contenuti', ico: '✎', fase: 2 },
    { k: 'configurazione', nome: 'Configurazione', ico: '⚒' },
  ] },
  { gruppo: 'Sicurezza', voci: [
    { k: 'sicurezza', nome: 'Admin e sicurezza', ico: '⚿' },
  ] },
];
const VOCI = MENU.flatMap((g) => g.voci.map((v) => ({ ...v, gruppo: g.gruppo })));
const voceDi = (k) => VOCI.find((v) => v.k === k) ?? VOCI[0];

/** Quale modulo disegna quale pagina (caricati solo quando servono). */
const PAGINE = {
  comando: () => import('./pagine/comando.js'),
  apps: () => import('./pagine/apps.js'),
  giocatori: () => import('./pagine/giocatori.js'),
  partite: () => import('./pagine/partite.js'),
  monetizzazione: () => import('./pagine/monetizzazione.js'),
  tecnica: () => import('./pagine/tecnica.js'),
  rilasci: () => import('./pagine/rilasci.js'),
  configurazione: () => import('./pagine/configurazione.js'),
  sicurezza: () => import('./pagine/sicurezza.js'),
};

/* ------------------------------------------------------------ il tema */

function applicaTema(t) {
  if (t === 'light' || t === 'dark') document.documentElement.dataset.theme = t;
  else delete document.documentElement.dataset.theme;
}

/* ------------------------------------------------------------ l'avvio */

export async function avvia(radice, { email, token }) {
  api.usaSessione(token);
  applicaTema(memoria.leggi('tema', 'auto'));
  metti(svuota(radice), caricamento('Apro il Control Center…'));

  let io = { email, ruolo: '—', permessi: [] };
  let apps = [];
  try {
    [io, apps] = await Promise.all([api.io(), api.apps()]);
  } catch (e) {
    metti(svuota(radice), h('div', { class: 'ingresso' }, h('div', { class: 'box' },
      h('h1', {}, 'Il server del pannello non risponde'), erroreBox(e),
      h('p', {}, 'Se sei appena entrato, può essere che la funzione `controllo` non sia ancora pubblicata o che il tuo account non sia fra gli amministratori.'),
      h('button', { class: 'bottone', onclick: () => location.reload() }, 'Riprova'))));
    return;
  }

  const stato = {
    io, apps,
    appId: memoria.leggi('app', '*'),
  };
  if (stato.appId !== '*' && !apps.some((a) => a.id === stato.appId)) stato.appId = '*';

  const menuNodo = h('nav', { class: 'barra', 'aria-label': 'Menu' });
  const briciole = h('nav', { class: 'briciole', 'aria-label': 'Sei qui' });
  const corpo = h('main', { class: 'contenuto', id: 'contenuto' });
  const guscio = h('div', { class: 'guscio' });

  const selettore = h('select', {
    'aria-label': 'App selezionata',
    onchange: () => { stato.appId = selettore.value; memoria.scrivi('app', stato.appId); disegna(); },
  }, h('option', { value: '*' }, 'Tutte le app'),
  ...raggruppaPerFamiglia(apps).map(([fam, lista]) => h('optgroup', { label: fam },
    lista.map((a) => h('option', { value: a.id }, a.nome)))));
  selettore.value = stato.appId;

  const ricerca = cercaGlobale(stato);
  const tema = h('button', {
    class: 'bottone piccolo', title: 'Tema chiaro / scuro', 'aria-label': 'Cambia tema',
    onclick: () => {
      const ora = memoria.leggi('tema', 'auto');
      const dopo = ora === 'auto' ? 'dark' : ora === 'dark' ? 'light' : 'auto';
      memoria.scrivi('tema', dopo); applicaTema(dopo);
      avvisa(`Tema: ${dopo === 'auto' ? 'come il sistema' : dopo === 'dark' ? 'scuro' : 'chiaro'}`);
      disegna();
    },
  }, '◐');

  const testata = h('header', { class: 'testata' },
    h('button', { class: 'bottone piccolo menu-apri', 'aria-label': 'Apri il menu', onclick: () => guscio.classList.toggle('menu-aperto') }, '☰'),
    h('div', { class: 'selettore' }, selettore),
    ricerca,
    h('div', { class: 'spazio' }),
    tema,
    h('div', { class: 'chi', title: `${io.email} · ${io.ruolo}` },
      h('span', { class: 'avatar' }, (io.email ?? '?').slice(0, 2).toUpperCase()),
      h('span', { class: 'email' }, io.ruolo)),
    h('button', { class: 'bottone piccolo', onclick: async () => (await import('./accesso.js')).esci() }, 'Esci'));

  metti(guscio, menuNodo, h('div', { class: 'principale' },
    api.inProva() ? h('div', { class: 'fascia-prova' }, 'DATI DI PROVA — niente di quello che vedi è vero') : null,
    testata, corpo));
  metti(svuota(radice), guscio);

  function disegnaMenu(attiva) {
    const preferiti = memoria.leggi('preferiti', []);
    const recenti = memoria.leggi('recenti', []);
    metti(svuota(menuNodo), 
      h('div', { class: 'marchio' }, h('span', { class: 'logo' }, 'CC'), h('div', {}, 'Control Center', h('small', {}, 'PK - Project Key'))),
      preferiti.length ? [h('div', { class: 'gruppo' }, 'Preferiti'),
        preferiti.map((p) => h('a', { class: 'voce', href: p.hash }, h('span', { class: 'ico' }, '★'), p.titolo))] : null,
      MENU.map((g) => [h('div', { class: 'gruppo' }, g.gruppo), g.voci.map((v) => h('a', {
        class: `voce${v.k === attiva ? ' attiva' : ''}${v.fase ? ' spenta' : ''}`, href: `#/${v.k}`,
        onclick: () => guscio.classList.remove('menu-aperto'),
        title: v.fase ? `${v.nome}: fase ${v.fase}` : v.nome,
      }, h('span', { class: 'ico', 'aria-hidden': 'true' }, v.ico), v.nome, v.fase ? h('span', { class: 'fase' }, `F${v.fase}`) : null))]),
      recenti.length ? [h('div', { class: 'gruppo' }, 'Recenti'),
        recenti.slice(0, 6).map((p) => h('a', { class: 'voce', href: p.hash, title: p.titolo }, h('span', { class: 'ico' }, '↺'), p.titolo))] : null,
    );
  }

  let giro = 0;
  async function disegna() {
    const mio = ++giro;
    const [, kGrezzo = 'comando', ...resto] = location.hash.replace(/^#/, '').split('?')[0].split('/');
    const k = kGrezzo || 'comando';
    const voce = voceDi(k);
    disegnaMenu(voce.k);
    const app = stato.appId === '*' ? null : apps.find((a) => a.id === stato.appId);
    const ctx = {
      io, apps, app, param: resto.map(decodeURIComponent),
      vai: (hash) => { location.hash = hash; },
      ricordaRecente: (titolo) => ricorda(titolo),
      briciole: (pezzi) => {
        metti(svuota(briciole), h('a', { href: '#/comando' }, 'Control Center'),
          ...pezzi.flatMap((p) => [h('span', { class: 'sep' }, '›'), p.hash ? h('a', { href: p.hash }, p.testo) : h('span', {}, p.testo)]));
      },
    };
    ctx.briciole([{ testo: app ? app.nome : 'Tutte le app' }, { testo: voce.nome, hash: `#/${voce.k}` }]);
    const titolo = h('div', { class: 'titolo-pagina' },
      h('div', { class: 'testo' }, h('h1', {}, voce.nome)),
      bottoneStella(voce));
    metti(svuota(corpo), briciole, titolo, caricamento());
    try {
      const nodi = voce.fase || !PAGINE[voce.k]
        ? (await import('./pagine/fasi.js')).disegna(ctx, voce)
        : await (await PAGINE[voce.k]()).disegna(ctx, titolo);
      if (mio !== giro) return;
      corpo.lastChild.replaceWith(h('div', { style: { display: 'contents' } }, nodi));
    } catch (e) {
      if (mio !== giro) return;
      corpo.lastChild.replaceWith(erroreBox(e));
    }
    corpo.focus?.();
  }

  function ricorda(titolo) {
    const hash = location.hash || '#/comando';
    const r = memoria.leggi('recenti', []).filter((x) => x.hash !== hash);
    r.unshift({ hash, titolo });
    memoria.scrivi('recenti', r.slice(0, 10));
  }

  function bottoneStella(voce) {
    const hash = () => location.hash || `#/${voce.k}`;
    const accesa = () => memoria.leggi('preferiti', []).some((p) => p.hash === hash());
    const b = h('button', {
      class: `stella${accesa() ? ' accesa' : ''}`, title: 'Aggiungi ai preferiti', 'aria-pressed': String(accesa()),
      onclick: () => {
        const p = memoria.leggi('preferiti', []);
        const i = p.findIndex((x) => x.hash === hash());
        if (i >= 0) p.splice(i, 1); else p.push({ hash: hash(), titolo: document.querySelector('.titolo-pagina h1')?.textContent ?? voce.nome });
        memoria.scrivi('preferiti', p.slice(0, 12));
        b.classList.toggle('accesa', i < 0);
        disegnaMenu(voce.k);
      },
    }, '★');
    return b;
  }

  addEventListener('hashchange', disegna);
  addEventListener('keydown', (e) => {
    if (e.key === '/' && !/INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName ?? '')) {
      e.preventDefault(); ricerca.querySelector('input')?.focus();
    }
  });
  await disegna();
}

function raggruppaPerFamiglia(apps) {
  const m = new Map();
  for (const a of apps) m.set(a.famiglia ?? 'Altre', [...(m.get(a.famiglia ?? 'Altre') ?? []), a]);
  return [...m.entries()];
}

/* ------------------------------------------------------------ la ricerca */

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function cercaGlobale(stato) {
  const input = h('input', { type: 'search', placeholder: 'Cerca giocatore, ID, partita, ordine, pagina…  ( / )', 'aria-label': 'Ricerca globale', autocomplete: 'off' });
  const lista = h('div', { class: 'risultati', hidden: true, role: 'listbox' });
  let attesa = null;
  let righe = [];
  let scelta = -1;

  const chiudi = () => { lista.hidden = true; scelta = -1; };
  const vai = (r) => { chiudi(); input.value = ''; location.hash = r.hash; };
  const mostra = () => {
    svuota(lista);
    if (righe.length === 0) { lista.append(h('div', { class: 'riga-ris', style: { cursor: 'default', color: 'var(--ink3)' } }, 'Nessun risultato')); }
    righe.forEach((r, i) => lista.append(h('div', {
      class: `riga-ris${i === scelta ? ' scelta' : ''}`, role: 'option', onclick: () => vai(r),
    }, h('span', { class: 'pill' }, r.tipo), h('span', {}, r.testo), r.nota ? h('span', { style: { marginLeft: 'auto', color: 'var(--ink3)', fontSize: '12px' } }, r.nota) : null)));
    lista.hidden = false;
  };

  async function trova(q) {
    const pagine = VOCI.filter((v) => v.nome.toLowerCase().includes(q.toLowerCase()))
      .map((v) => ({ tipo: 'Pagina', testo: v.nome, hash: `#/${v.k}` }));
    const bersagli = stato.appId === '*' ? stato.apps : stato.apps.filter((a) => a.id === stato.appId);
    const trovati = [];
    await Promise.all(bersagli.map(async (app) => {
      if (api.sa(app, 'cercaGiocatori')) {
        try {
          for (const g of (await api.cercaGiocatori(app.id, q)).slice(0, 6)) {
            trovati.push({ tipo: 'Giocatore', testo: g.nome ?? g.id, nota: app.nome, hash: `#/giocatori/${app.id}/${g.id}` });
          }
        } catch { /* un gioco che non risponde non ferma gli altri */ }
      }
      if (api.sa(app, 'cercaPartite') && q.length >= 6) {
        try {
          for (const p of (await api.cercaPartite(app.id, { q })).slice(0, 4)) {
            trovati.push({ tipo: 'Partita', testo: p.id, nota: app.nome, hash: `#/partite/${app.id}/${p.id}` });
          }
        } catch { /* idem */ }
      }
    }));
    return [...pagine, ...trovati];
  }

  input.addEventListener('input', () => {
    clearTimeout(attesa);
    const q = input.value.trim();
    if (q.length < 2) { chiudi(); return; }
    attesa = setTimeout(async () => { righe = await trova(q); scelta = righe.length ? 0 : -1; mostra(); }, 250);
  });
  input.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown') { scelta = Math.min(righe.length - 1, scelta + 1); mostra(); e.preventDefault(); }
    else if (e.key === 'ArrowUp') { scelta = Math.max(0, scelta - 1); mostra(); e.preventDefault(); }
    else if (e.key === 'Escape') chiudi();
    else if (e.key === 'Enter') {
      e.preventDefault();
      const q = input.value.trim();
      if (righe[scelta]) vai(righe[scelta]);
      // Un ID incollato va dritto alla scheda (§79), anche prima che la ricerca risponda.
      else if (UUID.test(q)) {
        const app = stato.appId === '*' ? stato.apps.find((a) => api.sa(a, 'scheda')) : stato.apps.find((a) => a.id === stato.appId);
        if (app) vai({ hash: `#/giocatori/${app.id}/${q}` });
      }
    }
  });
  input.addEventListener('blur', () => setTimeout(chiudi, 200));
  return h('div', { class: 'cerca-globale' }, input, lista);
}
