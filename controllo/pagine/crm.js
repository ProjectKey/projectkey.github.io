/**
 * CRM · LA POSTA (Control Center fase 2, blocco B3, §40–42)
 * ========================================================
 *
 * Messaggi dentro al gioco, con un premio allegato che il giocatore ritira una
 * volta sola (la cassa: `ritiraPosta`). A tutti — chi ha già un account adesso:
 * chi arriva dopo non eredita le compensazioni — oppure a giocatori scelti per
 * ID (dalla scheda del giocatore). Una posta a tutti con un premio è critica
 * (§10): codice e dieci minuti annullabili.
 *
 * Le notifiche push stanno in fondo alla fase 2 (serve una build con Firebase):
 * qui lo si dice invece di mostrare un tasto che non fa niente.
 */
import * as api from '../api.js';
import { h, scheda, tabella, pill, data, num, confermaConMotivo, avvisa, erroreBox, nonDisponibile } from '../ui.js';

export async function disegna(ctx) {
  ctx.ricordaRecente('CRM');
  const app = ctx.app ?? ctx.apps.find((a) => api.sa(a, 'posta.manda'));
  if (!app || !api.sa(app, 'posta.manda')) return [nonDisponibile('Posta', 'nessun gioco espone ancora la posta (`posta.manda`).')];
  let messaggi = [];
  try { messaggi = await api.postaElenco(app.id); } catch (e) { return [erroreBox(e)]; }
  return [
    scheda(`Nuovo messaggio · ${app.nome}`, modulo(ctx, app), {
      nota: 'Il premio lo paga la cassa quando il giocatore preme RITIRA, una volta sola. Tetti: 5.000 monete e 100 gemme per messaggio.',
    }),
    scheda('Messaggi mandati', tabella([
      { titolo: 'Quando', cella: (m) => data(m.creata_il) },
      { titolo: 'Titolo', cella: (m) => m.titolo },
      { titolo: 'A chi', cella: (m) => (m.per_tutti ? pill('tutti', 'blu') : `${num(m.destinatari)} giocatori`) },
      { titolo: 'Premio', cella: (m) => [m.monete ? `${num(m.monete)} monete` : '', m.gemme ? `${num(m.gemme)} gemme` : ''].filter(Boolean).join(' + ') || '—' },
      { titolo: 'Letti', cella: (m) => num(m.letti) },
      { titolo: 'Ritirati', cella: (m) => num(m.ritirati) },
      { titolo: 'Scade', cella: (m) => (Date.parse(m.scade_il) < Date.now() ? pill('scaduto', '') : data(m.scade_il)) },
      { titolo: 'Da', cella: (m) => m.creata_da },
    ], messaggi, { vuoto: 'Nessun messaggio ancora.' })),
    scheda('Notifiche push', h('p', {}, 'Arrivano per ultime nella fase 2: serve una versione dell\'app con Firebase (decisione del 5 ottobre 2026). Intanto la posta si vede aprendo il gioco.')),
  ];
}

function modulo(ctx, app) {
  const titolo = h('input', { type: 'text', maxlength: 60, placeholder: 'Scusate il disservizio', 'aria-label': 'Titolo' });
  const testo = h('textarea', { maxlength: 500, rows: 3, placeholder: 'Ieri sera le partite online si sono fermate per mezz\'ora: ecco un regalo.', 'aria-label': 'Testo' });
  const monete = h('input', { type: 'number', min: 0, max: 5000, value: 0, step: 50, 'aria-label': 'Monete' });
  const gemme = h('input', { type: 'number', min: 0, max: 100, value: 0, 'aria-label': 'Gemme' });
  const giorni = h('input', { type: 'number', min: 1, max: 30, value: 7, 'aria-label': 'Giorni' });
  const chi = h('select', { 'aria-label': 'Destinatari' }, h('option', { value: 'tutti' }, 'Tutti i giocatori di adesso'), h('option', { value: 'elenco' }, 'Giocatori scelti (ID)'));
  const elenco = h('textarea', { rows: 2, placeholder: 'ID dei giocatori, uno per riga', hidden: true, 'aria-label': 'ID dei giocatori' });
  chi.addEventListener('change', () => { elenco.hidden = chi.value !== 'elenco'; });
  const err = h('div', { class: 'errore-testo', role: 'alert' });

  const manda = async (e) => {
    e.preventDefault();
    err.textContent = '';
    const destinatari = elenco.value.split(/[\s,;]+/).map((x) => x.trim()).filter(Boolean);
    if (!titolo.value.trim()) { err.textContent = 'Serve un titolo.'; return; }
    if (chi.value === 'elenco' && destinatari.length === 0) { err.textContent = 'Scrivi almeno un ID di giocatore.'; return; }
    const premio = Number(monete.value) > 0 || Number(gemme.value) > 0;
    const r = await confermaConMotivo({
      titolo: 'Manda il messaggio', tasto: 'Manda',
      testo: `«${titolo.value.trim()}» a ${chi.value === 'tutti' ? 'tutti i giocatori di adesso' : `${destinatari.length} giocatori`}${premio ? `, con ${Number(monete.value) || 0} monete e ${Number(gemme.value) || 0} gemme da ritirare` : ''}. Scade fra ${giorni.value} giorni.${chi.value === 'tutti' && premio ? ' A tutti con un premio è un\'operazione critica: codice e dieci minuti annullabili.' : ''}`,
    });
    if (!r) return;
    try {
      const res = await api.postaManda(app.id, {
        titolo: titolo.value.trim(), testo: testo.value.trim(), monete: Number(monete.value) || 0, gemme: Number(gemme.value) || 0,
        giorni: Number(giorni.value) || 7, perTutti: chi.value === 'tutti', destinatari, motivo: r.motivo,
      });
      avvisa(res?.inApprovazione ? 'Messaggio in approvazione: parte fra dieci minuti, annullabile' : 'Messaggio mandato');
      ctx.vai(`#/crm?${Date.now()}`);
    } catch (x) { err.textContent = x.message; }
  };

  return h('form', { style: { display: 'grid', gap: '10px' }, onsubmit: manda },
    h('label', { class: 'campo' }, h('span', {}, 'Titolo'), titolo),
    h('label', { class: 'campo' }, h('span', {}, 'Testo'), testo),
    h('div', { class: 'filtri' },
      h('label', { class: 'campo' }, h('span', {}, 'Monete'), monete),
      h('label', { class: 'campo' }, h('span', {}, 'Gemme'), gemme),
      h('label', { class: 'campo' }, h('span', {}, 'Scade fra (giorni)'), giorni),
      h('label', { class: 'campo' }, h('span', {}, 'A chi'), chi)),
    elenco, err,
    h('div', {}, h('button', { class: 'bottone primario', type: 'submit' }, 'Manda')));
}
