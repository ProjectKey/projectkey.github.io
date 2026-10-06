/**
 * FRODI (Control Center, blocco C3, §54 — 6 ottobre 2026)
 * ======================================================
 *
 * Un punteggio di rischio da 0 a 100 per ogni giocatore visto di recente, **con
 * i motivi** (0076): saldo che non torna con i movimenti, monete arrivate da
 * riallineamenti del telefono, regali oltre ogni misura in un giorno, video
 * premiati oltre il tetto, rimborsi, acquisti rifiutati, partite vinte in un
 * lampo, nessuna sconfitta con persone vere, troppe partite in un'ora.
 *
 * Non punisce nessuno da solo: dice dove guardare. Le azioni (blocco, nome,
 * rettifica del saldo) stanno nella scheda del giocatore.
 */
import * as api from '../api.js';
import { h, scheda, tabella, pill, kpi, num, fa, memoria, erroreBox, nonDisponibile } from '../ui.js';

const NOMI = {
  saldo: 'saldo che non torna', riallineati: 'monete dal telefono', regali: 'troppi regali', video: 'video oltre il tetto',
  rimborsi: 'rimborsi', acquisti: 'acquisti rifiutati', lampo: 'vittorie lampo', imbattibile: 'mai una sconfitta', instancabile: 'troppe partite',
};

export async function disegna(ctx) {
  ctx.ricordaRecente('Frodi');
  const app = ctx.app ?? ctx.apps.find((a) => api.sa(a, 'rischio'));
  if (!app || !api.sa(app, 'rischio')) return [nonDisponibile('Frodi', 'nessun gioco espone ancora il rischio (`rischio`).')];
  const giorni = memoria.leggi('frodi.giorni', 30);
  let r;
  try { r = await api.rischio(app.id, giorni); } catch (e) { return [erroreBox(e)]; }
  const gs = r.giocatori ?? [];
  const veri = gs.filter((g) => !g.escluso);
  const scegli = h('select', { 'aria-label': 'Periodo', onchange: (e) => { memoria.scrivi('frodi.giorni', Number(e.target.value)); ctx.vai(`#/frodi?${Date.now()}`); } },
    [7, 30, 90, 365].map((d) => h('option', { value: d, selected: d === giorni }, `Ultimi ${d} giorni`)));
  const colore = (p) => (p >= 50 ? 'rosso' : p >= 25 ? 'ambra' : '');

  return [
    h('div', { class: 'griglia g4' },
      kpi('Giocatori guardati', num(r.guardati), `visti negli ultimi ${giorni} giorni`),
      kpi('Con qualche segnale', num(veri.length), gs.length > veri.length ? `più ${num(gs.length - veri.length)} esclusi (prove, robot)` : ''),
      kpi('Rischio alto (50+)', num(veri.filter((g) => g.punti >= 50).length)),
      kpi('Il segnale più frequente', (() => {
        const conta = {};
        for (const g of veri) for (const m of g.motivi) conta[m.k] = (conta[m.k] ?? 0) + 1;
        const k = Object.entries(conta).sort((x, y) => y[1] - x[1])[0]?.[0];
        return k ? NOMI[k] ?? k : '—';
      })())),
    scheda(null, h('div', { class: 'filtri' }, scegli)),
    scheda('Giocatori con segnali', tabella([
      { titolo: 'Rischio', num: true, cella: (g) => pill(String(g.punti), colore(g.punti)) },
      { titolo: 'Giocatore', cella: (g) => [g.nome ?? g.id.slice(0, 8), g.escluso ? pill('escluso', '') : null,
        g.bandito_fino && Date.parse(g.bandito_fino) > Date.now() ? pill('bloccato', 'rosso') : null] },
      { titolo: 'Perché', cella: (g) => h('div', { style: { display: 'grid', gap: '2px' } },
        g.motivi.map((m) => h('span', {}, pill(NOMI[m.k] ?? m.k, colore(m.peso * 2)), ' ', m.perche))) },
      { titolo: 'Livello', num: true, cella: (g) => num(g.livello) },
      { titolo: 'Visto', cella: (g) => fa(g.visto) },
    ], gs, { vuoto: 'Nessun segnale nel periodo. Bene così.', clic: (g) => ctx.vai(`#/giocatori/${app.id}/${g.id}`) }), {
      nota: 'Il punteggio somma i segnali (fino a 100) e non decide niente: si apre la scheda, si guarda la timeline e i movimenti, poi si sceglie. Più account sullo stesso telefono non si possono ancora vedere: il gioco tiene un solo account per installazione.',
    }),
  ];
}
