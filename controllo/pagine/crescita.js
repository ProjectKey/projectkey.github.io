/**
 * CRESCITA (Control Center, blocco C7, §50 — 6 ottobre 2026)
 * =========================================================
 *
 * Da dove arrivano i giocatori e quanto restano, fonte per fonte:
 *
 *  - **le fonti** vengono dall'Install Referrer di Google Play (1.0.9): una
 *    campagna dei nostri link, «google-play» per chi arriva dallo Store senza
 *    campagna, «invito» per chi è arrivato col codice di un amico. Prima della
 *    1.0.9 la fonte non si sa;
 *  - **quanti restano** per fonte: le coorti dell'Analisi raggruppate per
 *    provenienza (D1, D7, partite a testa, chi paga);
 *  - **gli inviti**: quanti mandati, da dove, quanti aperti, quanti account
 *    nuovi col codice di qualcuno e il **K** (account invitati ÷ chi gioca:
 *    PIANO.md punta a 0,1–0,3).
 *
 * Spesa, CPI e ROAS non ci sono perché non c'è una campagna a pagamento (la
 * crescita per ora è solo organica, decisione di Giorgio del 2 ott 2026).
 */
import * as api from '../api.js';
import { h, scheda, tabella, kpi, num, perc, giorniFa, memoria, erroreBox, nonDisponibile, grafico } from '../ui.js';

const COLORI = ['--cielo', '--viola', '--verde', '--ambra', '--rosso', '--ink3'];
const DOVE = { fine_partita: 'a fine partita', amici: 'dalla pagina Amici' };

export async function disegna(ctx) {
  ctx.ricordaRecente('Crescita');
  const app = ctx.app ?? ctx.apps.find((a) => api.sa(a, 'crescita'));
  if (!app || !api.sa(app, 'crescita')) return [nonDisponibile('Crescita', 'nessun gioco espone ancora la crescita (`crescita`).')];
  const salvati = memoria.leggi('crescita.periodo', null);
  const f = salvati?.giorno === giorniFa(0) ? salvati : { da: giorniFa(29), a: giorniFa(0) };
  let r; let coorti = [];
  try {
    [r, coorti] = await Promise.all([api.crescita(app.id, f.da, f.a), api.sa(app, 'analisi.coorti') ? api.analisiCoorti(app.id, 'provenienza', f.da, f.a) : []]);
  } catch (e) { return [erroreBox(e)]; }
  const inv = r.inviti ?? {};
  const k = inv.giocano ? inv.account_invitati / inv.giocano : null;
  const fonti = (r.perFonte ?? []).map((x) => x.fonte);
  const giorni = [];
  for (let d = new Date(f.da); d <= new Date(f.a); d.setDate(d.getDate() + 1)) giorni.push(d.toISOString().slice(0, 10));
  const conta = {};
  for (const x of r.perGiorno ?? []) conta[`${x.giorno}|${x.fonte}`] = x.n;

  const da = h('input', { type: 'date', value: f.da, 'aria-label': 'Dal' });
  const a = h('input', { type: 'date', value: f.a, 'aria-label': 'Al' });
  const quota = (x) => (x && x[1] ? h('span', { title: `${x[0]} su ${x[1]}` }, perc(x[0] / x[1])) : '…');

  return [
    scheda(null, h('form', {
      class: 'filtri', onsubmit: (e) => { e.preventDefault(); memoria.scrivi('crescita.periodo', { da: da.value, a: a.value, giorno: giorniFa(0) }); ctx.vai(`#/crescita?${Date.now()}`); },
    }, h('label', { class: 'campo' }, h('span', {}, 'Dal'), da), h('label', { class: 'campo' }, h('span', {}, 'al'), a),
    h('button', { class: 'bottone primario', type: 'submit' }, 'Applica'),
    h('span', { style: { color: 'var(--ink3)' } }, 'Senza i tuoi telefoni, i robot di Google e le prove.'))),
    h('div', { class: 'griglia g4' },
      kpi('Telefoni nuovi', num(r.nati), `${f.da} → ${f.a}`),
      kpi('Al giorno', (r.nati / Math.max(1, giorni.length)).toLocaleString('it-IT', { maximumFractionDigits: 1 }), 'nel periodo'),
      kpi('Inviti mandati', num(inv.mandati), `da ${num(inv.da_quanti)} telefoni · ${num(inv.aperti)} aperti`),
      kpi('K', k === null ? '—' : k.toLocaleString('it-IT', { maximumFractionDigits: 2 }), `${num(inv.account_invitati)} account invitati su ${num(inv.giocano)} che giocano · obiettivo 0,1–0,3`)),
    scheda('Fonti: quanti e quanto restano', tabella([
      { titolo: 'Fonte', cella: (c) => h('strong', {}, c.gruppo) },
      { titolo: 'Telefoni', num: true, cella: (c) => num(c.quanti) },
      { titolo: 'D1', num: true, cella: (c) => quota(c.d1) },
      { titolo: 'D7', num: true, cella: (c) => quota(c.d7) },
      { titolo: 'D30', num: true, cella: (c) => quota(c.d30) },
      { titolo: 'Partite a testa', num: true, cella: (c) => String(c.partite ?? 0).replace('.', ',') },
      { titolo: 'Pagano', num: true, cella: (c) => num(c.paganti) },
    ], [...coorti].sort((x, y) => y.quanti - x.quanti), { vuoto: 'Nessun telefono nuovo nel periodo.' }), {
      nota: '«google-play» = dallo Store senza una campagna (ricerca, schede, consigliati). Una campagna nostra compare col suo nome, se il link ha utm_campaign.',
    }),
    fonti.length ? scheda('Telefoni nuovi al giorno, per fonte', grafico('line', {
      etichette: giorni.map((g) => g.slice(5).split('-').reverse().join('/')),
      serie: fonti.slice(0, 6).map((fo, i) => ({ nome: fo, valori: giorni.map((g) => conta[`${g}|${fo}`] ?? 0), colore: COLORI[i] })),
    }, false)) : null,
    h('div', { class: 'griglia g2' },
      scheda('Gli inviti, da dove partono', tabella([
        { titolo: 'Da', cella: ([d]) => DOVE[d] ?? d },
        { titolo: 'Mandati', num: true, cella: ([, n]) => num(n) },
      ], Object.entries(inv.dove ?? {}), { vuoto: 'Nessun invito nel periodo.' })),
      scheda('Chi porta più amici', tabella([
        { titolo: 'Giocatore', cella: (g) => h('a', { href: `#/giocatori/${app.id}/${g.id}` }, g.nome ?? g.id.slice(0, 8)) },
        { titolo: 'Account arrivati col suo codice', num: true, cella: (g) => num(g.invitati) },
      ], r.chiInvita ?? [], { vuoto: 'Ancora nessuno è arrivato col codice di un amico.' }))),
    scheda('Campagne a pagamento', h('p', {}, 'Spesa, costo per installazione e ritorno compaiono qui quando c\'è una campagna (Google App Campaigns, Meta, TikTok): finché la crescita è solo organica non c\'è niente da misurare.')),
  ].filter(Boolean);
}
