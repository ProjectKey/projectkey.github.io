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
 */
import * as api from '../api.js';
import { h, scheda, tabella, kpi, num, perc, giorniFa, memoria, erroreBox, nonDisponibile, grafico } from '../ui.js';

const COLORI = ['--blu', '--viola', '--verde', '--ambra', '--rosso', '--testo-2'];

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
  ].filter(Boolean);
}
