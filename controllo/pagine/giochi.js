/**
 * GIOCHI (6 ottobre 2026)
 * =======================
 *
 * Quali giochi si giocano di più, e quali tengono la gente: per ogni gioco
 * (scopa, scopone, asso piglia tutto…) le partite finite, quante persone, quante
 * partite a testa, quante ci sono **tornate** (tre partite o più), quanto dura,
 * quante si vincono, quante online, quante abbandonate a metà.
 *
 * Giorgio, 6 ott 2026: «statistiche dei giochi più giocati per capire quali
 * funzionano meglio». Il numero che dice «funziona» non è quante partite (uno
 * che gioca cento partite le fa tutte lui), ma **quante persone ci tornano**.
 *
 * Viene dagli eventi di fine partita, online e senza rete (0072). Persone =
 * telefoni.
 *
 * **Bauli e giochi del giorno** (8 ott 2026, 0093). Giorgio: «capire se le
 * persone stanno aprendo bauli e minigiochi del giorno». Giorno per giorno, su
 * chi ha aperto l'app: chi fa la ruota, la carta alta e la busta, chi gioca la
 * mano del giorno, chi avvia e apre i bauli. E quanti bauli sono fermi sulle
 * mensole senza essere mai stati avviati. Qui persone = profili.
 */
import * as api from '../api.js';
import { h, scheda, tabella, kpi, num, perc, giorniFa, memoria, erroreBox, nonDisponibile, grafico } from '../ui.js';

const COLORI = ['--cielo', '--viola', '--verde', '--ambra', '--rosso', '--ink3'];

export async function disegna(ctx) {
  ctx.ricordaRecente('Giochi');
  const app = ctx.app ?? ctx.apps.find((a) => api.sa(a, 'giochi'));
  if (!app || !api.sa(app, 'giochi')) return [nonDisponibile('Giochi', 'nessun gioco espone ancora le statistiche per gioco (`giochi`).')];
  const salvati = memoria.leggi('giochi.filtri', null);
  const f = salvati?.giorno === giorniFa(0) ? salvati : { da: giorniFa(29), a: giorniFa(0) };
  let r;
  try { r = await api.giochi(app.id, f.da, f.a); } catch (e) { return [erroreBox(e)]; }

  const da = h('input', { type: 'date', value: f.da, 'aria-label': 'Dal' });
  const a = h('input', { type: 'date', value: f.a, 'aria-label': 'Al' });
  const nome = (k) => r.nomi?.[k] ?? k;
  const giochi = r.giochi ?? [];
  const tot = giochi.reduce((s, g) => s + g.partite, 0);
  const primo = giochi[0];
  const piuTornati = [...giochi].sort((x, y) => y.tornati - x.tornati)[0];

  // Il grafico: partite al giorno per gioco, giorno per giorno nel periodo.
  const giorni = [];
  for (let d = new Date(f.da); d <= new Date(f.a); d.setDate(d.getDate() + 1)) giorni.push(d.toISOString().slice(0, 10));
  const conta = {};
  for (const x of r.perGiorno ?? []) conta[`${x.giorno}|${x.gioco}`] = x.partite;

  const dg = r.delGiorno;
  const pg = dg?.periodo ?? {};
  const quota = (n, su) => `${num(n)} (${perc(n / (su || 1))})`;
  const etichetta = (g) => g.slice(5).split('-').reverse().join('/');

  return [
    scheda(null, h('form', {
      class: 'filtri',
      onsubmit: (e) => { e.preventDefault(); memoria.scrivi('giochi.filtri', { da: da.value, a: a.value, giorno: giorniFa(0) }); ctx.vai(`#/giochi?${Date.now()}`); },
    }, h('label', { class: 'campo' }, h('span', {}, 'Dal'), da), h('label', { class: 'campo' }, h('span', {}, 'al'), a),
    h('button', { class: 'bottone primario', type: 'submit' }, 'Applica'))),
    h('div', { class: 'griglia g4' },
      kpi('Partite finite', num(tot), `${f.da} → ${f.a}`),
      kpi('Persone che hanno giocato', num(r.persone), 'telefoni diversi'),
      kpi('Il più giocato', primo ? nome(primo.gioco) : '—', primo ? `${perc(primo.partite / (tot || 1))} delle partite` : ''),
      kpi('Quello che tiene di più', piuTornati?.tornati ? nome(piuTornati.gioco) : '—', piuTornati?.tornati ? `${num(piuTornati.tornati)} persone con 3+ partite` : 'nessuno ancora con 3+ partite')),
    scheda('Gioco per gioco', tabella([
      { titolo: 'Gioco', cella: (g) => h('strong', {}, nome(g.gioco)) },
      { titolo: 'Partite', num: true, cella: (g) => num(g.partite) },
      { titolo: 'Quota', num: true, cella: (g) => perc(g.partite / (tot || 1)) },
      { titolo: 'Persone', num: true, cella: (g) => num(g.persone) },
      { titolo: 'Tornate (3+)', num: true, cella: (g) => `${num(g.tornati)} (${perc(g.tornati / (g.persone || 1))})` },
      { titolo: 'Partite a testa', num: true, cella: (g) => String(g.perPersona).replace('.', ',') },
      { titolo: 'Durata media', num: true, cella: (g) => (g.secondi ? `${Math.floor(g.secondi / 60)}:${String(g.secondi % 60).padStart(2, '0')}` : '—') },
      { titolo: 'Vinte', num: true, cella: (g) => perc(g.vinte / (g.partite || 1)) },
      { titolo: 'Online', num: true, cella: (g) => perc(g.online / (g.partite || 1)) },
      { titolo: 'Abbandonate', num: true, cella: (g) => `${num(g.abbandoni)} (${perc(g.abbandoni / ((g.partite + g.abbandoni) || 1))})` },
    ], giochi, { vuoto: 'Nessuna partita finita in questo periodo.' }), {
      nota: '«Tornate» = persone che a quel gioco hanno fatto almeno tre partite: dice se un gioco piace più del numero di partite, che uno solo può gonfiare. «Vinte» lontano dal 50% vuol dire avversari troppo facili o troppo difficili.',
    }),
    giochi.length ? scheda('Partite al giorno, per gioco', grafico('line', {
      etichette: giorni.map((g) => g.slice(5).split('-').reverse().join('/')),
      serie: giochi.slice(0, 6).map((g, i) => ({ nome: nome(g.gioco), valori: giorni.map((d) => conta[`${d}|${g.gioco}`] ?? 0), colore: COLORI[i] })),
    }, false)) : null,
    dg ? h('h2', {}, 'Bauli e giochi del giorno') : null,
    dg ? h('div', { class: 'griglia g4' },
      kpi('Persone attive', num(pg.attivi), 'hanno aperto l\'app nel periodo'),
      kpi('Giochi del giorno', perc(pg.giochini / (pg.attivi || 1)), `${num(pg.giochini)} persone almeno una volta`),
      kpi('Mano del giorno', perc(pg.mano / (pg.attivi || 1)), `${num(pg.mano)} persone (c'è dal 7 ott)`),
      kpi('Bauli', perc(pg.bauli / (pg.attivi || 1)), `${num(pg.bauli)} persone ne hanno avviato o aperto uno`)) : null,
    dg ? scheda('Giorno per giorno', tabella([
      { titolo: 'Giorno', cella: (x) => h('strong', {}, etichetta(x.giorno)) },
      { titolo: 'Attivi', num: true, cella: (x) => num(x.attivi) },
      { titolo: 'Giochi del giorno', num: true, cella: (x) => quota(x.giochini, x.attivi) },
      { titolo: 'Ruota · carta · busta', num: true, cella: (x) => `${num(x.ruota)} · ${num(x.carta)} · ${num(x.tre)}` },
      { titolo: 'Mano del giorno', num: true, cella: (x) => (x.mano ? `${quota(x.mano, x.attivi)}, ${num(x.manoGiuste)} giuste` : '—') },
      { titolo: 'Avviano un baule', num: true, cella: (x) => quota(x.avviano, x.attivi) },
      { titolo: 'Aprono un baule', num: true, cella: (x) => quota(x.aprono, x.attivi) },
      { titolo: 'Bauli aperti', num: true, cella: (x) => num(x.aperti) + (x.conGemme ? ` (${num(x.conGemme)} con gemme)` : '') },
    ], [...(dg.perGiorno ?? [])].filter((x) => x.attivi || x.giochini || x.aperti).reverse(), { vuoto: 'Nessun dato in questo periodo.' }), {
      nota: 'Persone = profili, senza Giorgio, robot e prove. Le percentuali sono sugli attivi del giorno. I giochi del giorno e i bauli si contano dal 24 set (registro della cassa); gli attivi dal 2 ott.',
    }) : null,
    dg ? scheda('Bauli sulle mensole, adesso', h('div', { class: 'griglia g4' },
      kpi('Bauli sulle mensole', num(dg.mensole.bauli), `di ${num(dg.mensole.persone)} persone`),
      kpi('Mai avviati', num(dg.mensole.fermi), perc(dg.mensole.fermi / (dg.mensole.bauli || 1))),
      kpi('Persone con bauli fermi', num(dg.mensole.personeConFermi), perc(dg.mensole.personeConFermi / (dg.mensole.persone || 1))),
      kpi('In apertura', num(dg.mensole.inApertura), 'timer partito')), {
      nota: 'Un baule mai avviato è un premio che nessuno ha visto: se sono tanti, il baule non si nota o non si capisce che va avviato.',
    }) : null,
  ].filter(Boolean);
}
