/**
 * TECNICA (§55-§61, §76)
 * ======================
 *
 * Lo stato dei servizi di ogni gioco, gli errori raggruppati (dall'app e dal
 * server), e gli allarmi. CPU, RAM e latenze P95 non si leggono dal piano
 * gratuito di Supabase: si dice, invece di mostrare riquadri a zero.
 */
import * as api from '../api.js';
import { h, scheda, tabella, pill, num, data, fa, giorniFa, memoria, erroreBox } from '../ui.js';
import { servizio } from './comando.js';

const SEVERITA = { CRITICAL: 'rosso', WARNING: 'ambra', INFO: 'cielo' };

export async function disegna(ctx) {
  ctx.ricordaRecente('Tecnica');
  const apps = ctx.app ? [ctx.app] : ctx.apps;
  const giorni = memoria.leggi('tecnica.giorni', 7);
  const [salute, errori, allarmi] = await Promise.all([
    Promise.all(apps.filter((a) => api.sa(a, 'salute')).map(async (a) => ({ app: a, s: await api.salute(a.id).catch((e) => ({ errore: e })) }))),
    Promise.all(apps.filter((a) => api.sa(a, 'errori')).map(async (a) => ({ app: a, e: await api.errori(a.id, giorniFa(giorni - 1), giorniFa(0)).catch((err) => ({ errore: err })) }))),
    api.allarmi().catch((e) => ({ errore: e })),
  ]);
  const listaAllarmi = Array.isArray(allarmi) ? allarmi.filter((a) => !ctx.app || !a.app || a.app === ctx.app.id) : [];
  const righeErrori = errori.flatMap(({ app, e }) => (Array.isArray(e) ? e : []).map((x) => ({ ...x, app })))
    .sort((a, b) => (b.conteggio ?? 0) - (a.conteggio ?? 0));

  return [
    scheda('Stato dei servizi (§61)', salute.length === 0 ? h('p', {}, 'Nessuna app espone lo stato dei servizi.')
      : salute.map(({ app, s }) => [
        apps.length > 1 ? h('h3', { style: { margin: '8px 0' } }, app.nome) : null,
        s.errore ? erroreBox(s.errore) : h('div', { class: 'stato-servizi' }, (s.servizi ?? []).map((sv) => servizio(sv))),
        s.controllato ? h('p', { style: { color: 'var(--ink3)', fontSize: '12px', margin: '6px 0 0' } }, `Controllato ${fa(s.controllato)}`) : null,
      ]), { nota: 'Operativo · Degradato · Guasto parziale · Guasto grave · Spento (per scelta)' }),

    scheda('Allarmi (§76)', allarmi.errore ? erroreBox(allarmi.errore) : tabella([
      { titolo: 'Gravità', cella: (a) => pill(a.severita, SEVERITA[a.severita] ?? '') },
      { titolo: 'Quando', cella: (a) => fa(a.quando) },
      { titolo: 'App', cella: (a) => ctx.apps.find((x) => x.id === a.app)?.nome ?? 'Tutte' },
      { titolo: 'Cosa', chiave: 'titolo' },
      { titolo: 'Stato', cella: (a) => pill(a.stato ?? '—', a.stato === 'aperto' ? 'ambra' : '') },
    ], listaAllarmi, { vuoto: 'Nessun allarme.' }), {
      nota: 'l\'email automatica quando il server si ferma arriva col controllo di GitHub (F-124-ter)',
    }),

    scheda('Errori (§57)', [
      h('div', { class: 'azioni', style: { marginBottom: '10px' } }, [1, 7, 30].map((g) => h('button', {
        class: `bottone piccolo${g === giorni ? ' primario' : ''}`, onclick: () => { memoria.scrivi('tecnica.giorni', g); ctx.vai(`#/tecnica?${Date.now()}`); },
      }, g === 1 ? 'Oggi' : `${g} giorni`))),
      ...errori.filter((x) => x.e?.errore).map((x) => erroreBox(new Error(`${x.app.nome}: ${x.e.errore.message}`))),
      tabella([
        { titolo: 'Errore', cella: (e) => h('span', { class: 'mono', style: { overflowWrap: 'anywhere' } }, e.messaggio) },
        { titolo: 'Dove', cella: (e) => pill(e.dove === 'server' ? `server${e.funzione ? ` · ${e.funzione}` : ''}` : 'app', e.dove === 'server' ? 'viola' : 'cielo') },
        { titolo: 'App', cella: (e) => e.app.nome },
        { titolo: 'Volte', num: true, cella: (e) => num(e.conteggio) },
        { titolo: 'Utenti', num: true, cella: (e) => num(e.utenti) },
        { titolo: 'Versioni', cella: (e) => (e.versioni ?? []).join(', ') || '—' },
        { titolo: 'Prima volta', cella: (e) => data(e.primo) },
        { titolo: 'Ultima', cella: (e) => fa(e.ultimo) },
      ], righeErrori, { vuoto: 'Nessun errore nel periodo.' }),
    ], { nota: 'raggruppati per messaggio' }),

    scheda('Quello che non si vede ancora', h('ul', { style: { margin: 0, paddingLeft: '18px', color: 'var(--ink2)' } },
      h('li', {}, 'CPU, RAM, connessioni e latenze P50/P95/P99 del server (§55, §60): il piano gratuito di Supabase non le espone via API. Con Pro arrivano dal pannello di Supabase.'),
      h('li', {}, 'Crash nativi e crash-free per dispositivo (§58): oggi si leggono in Play Console → Android Vitals; per portarli qui serve uno strumento come Sentry (build nativa).'),
      h('li', {}, 'Prestazioni dell\'app (avvio, FPS, memoria, §59): da misurare nell\'app, fase 2.'))),
  ];
}
