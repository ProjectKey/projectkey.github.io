/**
 * CONTENUTI (Control Center, blocco C5, §66 — 6 ottobre 2026)
 * ==========================================================
 *
 * Quello che il gioco dice senza una versione nuova:
 *
 *  - una **riga nella home**: la «cosa da fare» della mascotte e della home,
 *    con un tasto che porta in un posto del gioco (gioca, missioni, Pass,
 *    torneo, negozio, posta). Sta dietro all'evento Live Ops e davanti a
 *    bauli e Pass;
 *  - una **finestra una tantum**: compare una volta sola per telefono,
 *    all'apertura, prima di tutto il resto. Per una novità, una scusa, un
 *    annuncio.
 *
 * Ognuno ha un «dal» e un «al» facoltativi: si accende e si spegne da solo.
 * Al massimo sei. Non muovono valuta, quindi non sono un'operazione critica:
 * una nuova versione della configurazione, nel registro come le altre. Per un
 * messaggio a qualcuno in particolare, o con un premio, c'è la posta (CRM).
 */
import * as api from '../api.js';
import { h, scheda, tabella, pill, data, erroreBox, nonDisponibile, avvisa, confermaConMotivo } from '../ui.js';

const DOVE = { gioca: 'Gioca', missioni: 'Missioni', pass: 'Pass', torneo: 'Torneo', negozio: 'Negozio', posta: 'Posta' };
const TIPI = { riga: 'Riga in home', finestra: 'Finestra una tantum' };

const statoDi = (a, ora = Date.now()) => (a.dal && Date.parse(a.dal) > ora ? ['programmato', 'blu'] : a.al && Date.parse(a.al) <= ora ? ['finito', ''] : ['acceso', 'verde']);
const daLocale = (v) => (v ? new Date(v).toISOString() : null);
const aLocale = (iso) => { if (!iso) return ''; const d = new Date(iso); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 16); };

export async function disegna(ctx) {
  ctx.ricordaRecente('Contenuti');
  const app = ctx.app ?? ctx.apps.find((a) => api.sa(a, 'config.verifica'));
  if (!app || !api.sa(app, 'config.verifica')) return [nonDisponibile('Contenuti', 'nessun gioco sa ancora ricevere contenuti dalla configurazione.')];
  let attuale;
  try { attuale = await api.configLeggi(app.id); } catch (e) { return [erroreBox(e)]; }
  const avvisi = Array.isArray(attuale.valori?.avvisi) ? attuale.valori.avvisi : [];

  const salva = async (nuovi, cosa) => {
    const r = await confermaConMotivo({ titolo: 'Pubblica i contenuti', tasto: 'Pubblica', testo: `${cosa} Arriva ai telefoni alla prossima apertura del gioco.` });
    if (!r) return;
    const valori = { ...(attuale.valori ?? {}), avvisi: nuovi };
    if (!nuovi.length) delete valori.avvisi;
    try {
      const res = await api.configProponi(app.id, { valori, portata: { livello: 'app', valore: null }, motivo: r.motivo });
      avvisa(res?.approvazione ? `Contenuti: ${res.approvazione.stato}` : 'Contenuti pubblicati');
      ctx.vai(`#/contenuti?${Date.now()}`);
    } catch (x) { avvisa(x.message, true); }
  };

  return [
    scheda(`Nuovo contenuto · ${app.nome}`, modulo(avvisi, salva), {
      nota: 'Riga: la cosa da fare in home finché è accesa. Finestra: una volta sola per telefono, all\'apertura. Titolo fino a 40 caratteri, testo fino a 140.',
    }),
    scheda(`Contenuti in configurazione (${avvisi.length} di 6)`, tabella([
      { titolo: 'Stato', cella: (a) => pill(...statoDi(a)) },
      { titolo: 'Tipo', cella: (a) => TIPI[a.tipo] ?? a.tipo },
      { titolo: 'Titolo', cella: (a) => h('strong', {}, a.titolo) },
      { titolo: 'Testo', cella: (a) => a.testo || '—' },
      { titolo: 'Tasto', cella: (a) => `${a.tasto || 'VAI'} → ${DOVE[a.dove] ?? a.dove}` },
      { titolo: 'Dal', cella: (a) => (a.dal ? data(a.dal) : 'subito') },
      { titolo: 'Al', cella: (a) => (a.al ? data(a.al) : 'finché non lo togli') },
      { titolo: '', cella: (a) => h('button', { class: 'bottone piccolo', onclick: () => salva(avvisi.filter((x) => x.id !== a.id), `Si toglie «${a.titolo}».`) }, 'Togli') },
    ], avvisi, { vuoto: 'Nessun contenuto: la home mostra solo le cose del gioco.' })),
    scheda('Come si vede nel gioco', h('p', {}, 'La riga è la stessa della mascotte e del riquadro «da fare» in home, con la stella. La finestra è la mascotte che compare all\'apertura, una volta sola: chi l\'ha vista non la rivede, anche se resta accesa.')),
  ];
}

function modulo(avvisi, salva) {
  const tipo = h('select', { 'aria-label': 'Tipo' }, Object.entries(TIPI).map(([k, t]) => h('option', { value: k }, t)));
  const titolo = h('input', { type: 'text', maxlength: 40, placeholder: 'Stasera si gioca a scopone', 'aria-label': 'Titolo' });
  const testo = h('input', { type: 'text', maxlength: 140, placeholder: 'Al tavolo in quattro, dalle 21.', 'aria-label': 'Testo' });
  const tasto = h('input', { type: 'text', maxlength: 14, value: 'GIOCA', 'aria-label': 'Tasto', style: { width: '110px' } });
  const dove = h('select', { 'aria-label': 'Dove porta' }, Object.entries(DOVE).map(([k, t]) => h('option', { value: k }, t)));
  const dal = h('input', { type: 'datetime-local', 'aria-label': 'Dal' });
  const al = h('input', { type: 'datetime-local', 'aria-label': 'Al' });
  const err = h('div', { class: 'errore-testo', role: 'alert' });
  const manda = (e) => {
    e.preventDefault();
    err.textContent = '';
    if (!titolo.value.trim()) { err.textContent = 'Serve un titolo.'; return; }
    if (avvisi.length >= 6) { err.textContent = 'Ce ne sono già sei: togline uno.'; return; }
    if (dal.value && al.value && Date.parse(al.value) <= Date.parse(dal.value)) { err.textContent = '«Al» viene prima di «dal».'; return; }
    const base = titolo.value.trim().toLowerCase().normalize('NFD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 30) || 'avviso';
    let id = base; let n = 2;
    while (avvisi.some((a) => a.id === id)) id = `${base}-${n++}`;
    const nuovo = { id, tipo: tipo.value, titolo: titolo.value.trim(), testo: testo.value.trim(), tasto: (tasto.value.trim() || 'VAI').toUpperCase(), dove: dove.value, dal: daLocale(dal.value), al: daLocale(al.value) };
    void salva([...avvisi, nuovo], `${TIPI[nuovo.tipo]}: «${nuovo.titolo}»${nuovo.dal ? ` dal ${data(nuovo.dal)}` : ''}${nuovo.al ? ` al ${data(nuovo.al)}` : ''}.`);
  };
  return h('form', { style: { display: 'grid', gap: '10px' }, onsubmit: manda },
    h('div', { class: 'filtri' }, h('label', { class: 'campo' }, h('span', {}, 'Tipo'), tipo), h('label', { class: 'campo', style: { flex: 1 } }, h('span', {}, 'Titolo'), titolo)),
    h('label', { class: 'campo' }, h('span', {}, 'Testo'), testo),
    h('div', { class: 'filtri' },
      h('label', { class: 'campo' }, h('span', {}, 'Tasto'), tasto), h('label', { class: 'campo' }, h('span', {}, 'Porta a'), dove),
      h('label', { class: 'campo' }, h('span', {}, 'Dal (facoltativo)'), dal), h('label', { class: 'campo' }, h('span', {}, 'Al (facoltativo)'), al)),
    err, h('div', {}, h('button', { class: 'bottone primario', type: 'submit' }, 'Pubblica')));
}
export { aLocale };
