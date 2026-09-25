/**
 * I MATTONI DELLA PAGINA
 * ======================
 *
 * Tutto il DOM passa da `h()`: niente `innerHTML` con dati che arrivano dal
 * server. I nomi dei giocatori li scrivono i giocatori, e un nome come
 * `<img onerror=…>` in un pannello da amministratore è il modo più corto per
 * rubare una sessione con i poteri di tutto.
 */
import { CONFIG } from './config.js';

export function h(tag, attributi, ...figli) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attributi ?? {})) {
    if (v === false || v === null || v === undefined) continue;
    if (k === 'class') el.className = v;
    else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
    else if (k === 'dataset') Object.assign(el.dataset, v);
    else if (v === true) el.setAttribute(k, '');
    else el.setAttribute(k, String(v));
  }
  aggiungi(el, figli);
  return el;
}

function aggiungi(el, figli) {
  for (const f of figli) {
    if (f === null || f === undefined || f === false) continue;
    if (Array.isArray(f)) aggiungi(el, f);
    else el.append(f instanceof Node ? f : document.createTextNode(String(f)));
  }
}

export const svuota = (el) => { while (el.firstChild) el.firstChild.remove(); return el; };

/**
 * **Aggiunge figli come fa `h()`**: appiattisce le liste e salta `null`. Il
 * `.append()` del browser invece scrive `null` e `[object HTMLDivElement]`
 * come testo — il menu del primo giro di foto era così.
 */
export const metti = (el, ...figli) => { aggiungi(el, figli); return el; };

/* ------------------------------------------------------------ i formati */

const numeri = new Intl.NumberFormat('it-IT');
const euro = new Intl.NumberFormat('it-IT', { style: 'currency', currency: CONFIG.valuta });
const percento = new Intl.NumberFormat('it-IT', { style: 'percent', maximumFractionDigits: 1 });

export const num = (n) => (n === null || n === undefined || Number.isNaN(n)) ? '—' : numeri.format(n);
export const soldi = (n) => (n === null || n === undefined || Number.isNaN(n)) ? '—' : euro.format(n);
export const perc = (n) => (n === null || n === undefined || Number.isNaN(n)) ? '—' : percento.format(n);

export function data(d, conOra = true) {
  if (!d) return '—';
  const x = new Date(d);
  if (Number.isNaN(x.getTime())) return String(d);
  return x.toLocaleString('it-IT', {
    timeZone: CONFIG.fuso, day: '2-digit', month: '2-digit', year: 'numeric',
    ...(conOra ? { hour: '2-digit', minute: '2-digit' } : {}),
  });
}
export const ora = (d) => new Date(d).toLocaleTimeString('it-IT', { timeZone: CONFIG.fuso, hour: '2-digit', minute: '2-digit' });
export const giornoDi = (d) => new Date(d).toLocaleDateString('it-IT', { timeZone: CONFIG.fuso, weekday: 'long', day: 'numeric', month: 'long' });

export function fa(d) {
  if (!d) return '—';
  const s = (Date.now() - new Date(d).getTime()) / 1000;
  if (s < 60) return 'adesso';
  if (s < 3600) return `${Math.round(s / 60)} min fa`;
  if (s < 86400) return `${Math.round(s / 3600)} h fa`;
  return `${Math.round(s / 86400)} g fa`;
}

/** Oggi e N giorni fa, come date ISO del calendario di Roma. */
export function giorniFa(n) {
  const d = new Date(Date.now() - n * 86400000);
  return d.toLocaleDateString('sv-SE', { timeZone: CONFIG.fuso });
}

/* ------------------------------------------------------------ la memoria */

/** localStorage può mancare (finestre private, anteprime): mai farci conto. */
export const memoria = {
  leggi(k, ripiego) {
    try { const v = localStorage.getItem(`cc.${k}`); return v === null ? ripiego : JSON.parse(v); } catch { return ripiego; }
  },
  scrivi(k, v) { try { localStorage.setItem(`cc.${k}`, JSON.stringify(v)); } catch { /* niente */ } },
};

/* ------------------------------------------------------------ gli avvisi */

let scatola = null;
export function avvisa(testo, rosso = false) {
  if (!scatola) { scatola = h('div', { class: 'avvisi', role: 'status', 'aria-live': 'polite' }); document.body.append(scatola); }
  const m = h('div', { class: `msg${rosso ? ' rosso' : ''}` }, testo);
  scatola.append(m);
  setTimeout(() => m.remove(), rosso ? 7000 : 4000);
}

/* ------------------------------------------------------------ le finestre */

export function finestra({ titolo, corpo, tasti }) {
  return new Promise((risolvi) => {
    const chiudi = (v) => { velo.remove(); document.removeEventListener('keydown', esc); risolvi(v); };
    const esc = (e) => { if (e.key === 'Escape') chiudi(null); };
    const velo = h('div', { class: 'velo', onclick: (e) => { if (e.target === velo) chiudi(null); } },
      h('div', { class: 'finestra', role: 'dialog', 'aria-modal': 'true', 'aria-label': titolo },
        h('header', {}, h('h2', {}, titolo)),
        h('div', { class: 'corpo' }, corpo),
        h('footer', {}, (tasti ?? []).map((t) => h('button', {
          class: `bottone ${t.classe ?? ''}`, type: 'button',
          onclick: async () => { const v = t.valore ? await t.valore() : t.risposta; if (v !== undefined && v !== false) chiudi(v); },
        }, t.testo)))));
    document.body.append(velo);
    document.addEventListener('keydown', esc);
    velo.querySelector('input, textarea, select, button')?.focus();
  });
}

/**
 * **Conferma con motivo obbligatorio** (§12, §102): ogni azione che cambia un
 * giocatore o l'economia chiede perché. Per le più pericolose si deve anche
 * riscrivere una parola (`parola`), così un doppio clic non fa danni.
 */
export async function confermaConMotivo({ titolo, testo, parola, tasto = 'Conferma', pericolo = false, campi = [] }) {
  const motivo = h('textarea', { placeholder: 'Perché lo fai? (resta nel registro)', 'aria-label': 'Motivo', maxlength: 500 });
  const scritta = parola ? h('input', { type: 'text', placeholder: parola, 'aria-label': `Scrivi ${parola}` }) : null;
  const errore = h('div', { class: 'errore-testo' });
  const valori = {};
  const nodiCampi = campi.map((c) => {
    const input = c.tipo === 'select'
      ? h('select', {}, c.opzioni.map((o) => h('option', { value: o.valore }, o.testo)))
      : h('input', { type: c.tipo ?? 'text', value: c.valore ?? '', min: c.min, step: c.step, placeholder: c.segnaposto ?? '' });
    valori[c.nome] = input;
    return h('label', { class: 'campo' }, h('span', {}, c.etichetta), input);
  });
  return finestra({
    titolo,
    corpo: [testo ? h('p', {}, testo) : null, ...nodiCampi,
      h('label', { class: 'campo' }, h('span', {}, 'Motivo (obbligatorio)'), motivo),
      scritta ? h('label', { class: 'campo' }, h('span', {}, `Per confermare scrivi ${parola}`), scritta) : null,
      errore],
    tasti: [
      { testo: 'Annulla', risposta: null },
      {
        testo: tasto, classe: pericolo ? 'pericolo pieno' : 'primario',
        valore: () => {
          const m = motivo.value.trim();
          if (m.length < 5) { errore.textContent = 'Scrivi un motivo di almeno 5 caratteri.'; return false; }
          if (scritta && scritta.value.trim().toUpperCase() !== parola.toUpperCase()) { errore.textContent = `Scrivi ${parola} per confermare.`; return false; }
          const out = { motivo: m };
          for (const [k, el] of Object.entries(valori)) out[k] = el.value;
          return out;
        },
      },
    ],
  });
}

/* ------------------------------------------------------------ i pezzi fatti */

export const scheda = (titolo, contenuto, { nota, azioni } = {}) =>
  h('section', { class: 'scheda' },
    titolo ? h('header', {}, h('h2', {}, titolo), nota ? h('span', { class: 'nota' }, nota) : null, azioni ?? null) : null,
    contenuto);

export function kpi(etichetta, valore, sotto, tendenza) {
  const vuoto = valore === '—';
  return h('div', { class: `kpi${vuoto ? ' vuoto' : ''}` },
    h('div', { class: 'et', title: etichetta }, etichetta),
    h('div', { class: 'val', title: String(valore) }, valore),
    sotto ? h('div', { class: 'sotto' },
      tendenza ? h('span', { class: tendenza > 0 ? 'su' : tendenza < 0 ? 'giu' : '' }, `${tendenza > 0 ? '▲' : tendenza < 0 ? '▼' : '■'} `) : null,
      sotto) : null);
}

export const pill = (testo, colore = '') => h('span', { class: `pill ${colore}` }, testo);

export function tabella(colonne, righe, { vuoto = 'Niente da mostrare.', clic } = {}) {
  return h('div', { class: 'tabella-scorre' }, h('table', {},
    h('thead', {}, h('tr', {}, colonne.map((c) => h('th', { class: c.num ? 'num' : '' }, c.titolo)))),
    h('tbody', {}, righe.length === 0
      ? h('tr', {}, h('td', { colspan: colonne.length, class: 'vuoto-tab' }, vuoto))
      : righe.map((r) => h('tr', { class: clic ? 'cliccabile' : '', onclick: clic ? () => clic(r) : null },
        colonne.map((c) => h('td', { class: c.num ? 'num' : '' }, c.cella ? c.cella(r) : (r[c.chiave] ?? '—'))))))));
}

export const caricamento = (testo = 'Carico…') => h('div', { class: 'caricamento' }, testo);

export function erroreBox(e) {
  const msg = e?.message ?? String(e);
  return h('div', { class: 'avviso rosso' }, h('span', { class: 'ico' }, '⚠'),
    h('div', {}, h('strong', {}, 'Non riesco a leggere questi dati. '), msg));
}

/** Una sezione che il gioco selezionato non sa ancora fare (capacità dell'adattatore). */
export function nonDisponibile(cosa, perche) {
  return h('div', { class: 'avviso ambra' }, h('span', { class: 'ico' }, 'ⓘ'),
    h('div', {}, h('strong', {}, `${cosa}: non disponibile per questa app. `), perche));
}

/* ------------------------------------------------------------ i grafici */

const coloreVar = (v) => getComputedStyle(document.documentElement).getPropertyValue(v).trim();

export function grafico(tipo, { etichette, serie, pila = false, percentuale = false, soldi: inSoldi = false }, alto = true) {
  const tela = h('canvas', { role: 'img', 'aria-label': serie.map((s) => s.nome).join(', ') });
  const box = h('div', { class: `grafico${alto ? '' : ' basso'}` }, tela);
  const colori = ['--viola', '--cielo', '--ambra', '--verde', '--rosso'];
  requestAnimationFrame(() => {
    if (!window.Chart) { box.replaceChildren(h('div', { class: 'caricamento' }, 'Grafico non disponibile (libreria non caricata).')); return; }
    const ink = coloreVar('--ink3');
    const filo = coloreVar('--filo');
    const formato = (v) => percentuale ? perc(v) : inSoldi ? soldi(v) : num(v);
    // eslint-disable-next-line no-new
    new window.Chart(tela, {
      type: tipo,
      data: {
        labels: etichette,
        datasets: serie.map((s, i) => {
          const c = coloreVar(s.colore ?? colori[i % colori.length]);
          return {
            label: s.nome, data: s.valori, borderColor: c, backgroundColor: tipo === 'line' ? `${c}22` : c,
            fill: tipo === 'line' && serie.length === 1, tension: .3, pointRadius: 0, borderWidth: 2,
            stack: pila ? 'uno' : undefined, borderRadius: tipo === 'bar' ? 4 : 0, spanGaps: true,
          };
        }),
      },
      options: {
        responsive: true, maintainAspectRatio: false, animation: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: { display: serie.length > 1, labels: { color: ink, boxWidth: 10, usePointStyle: true } },
          tooltip: { callbacks: { label: (ctx) => `${ctx.dataset.label}: ${formato(ctx.parsed.y)}` } },
        },
        scales: {
          x: { stacked: pila, ticks: { color: ink, maxRotation: 0, autoSkipPadding: 12 }, grid: { display: false } },
          y: { stacked: pila, beginAtZero: true, ticks: { color: ink, callback: formato }, grid: { color: filo } },
        },
      },
    });
  });
  return box;
}
