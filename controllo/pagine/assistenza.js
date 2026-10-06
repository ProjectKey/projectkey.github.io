/**
 * ASSISTENZA (Control Center, blocco C1, §12, §69 — 6 ottobre 2026)
 * ================================================================
 *
 * Quello che i giocatori scrivono con «Segnala un problema» diventa una
 * richiesta da seguire: **aperta** (nessuno l'ha presa), **in corso**,
 * **risolta**. Nella scheda c'è tutto quello che serve per rispondere senza
 * cercare altrove (§69): le ultime partite, gli acquisti, gli errori, i
 * telefoni e le versioni, e quello che gli si è già scritto.
 *
 * Si risponde con la **posta del gioco** (0070): il giocatore la trova
 * aprendo l'app, anche con un compenso in monete o gemme che ritira una volta
 * sola. La risposta resta nelle note della richiesta, con il suo id.
 *
 * Prende il posto della pagina Segnalazioni: le «lette» di prima sono «in corso».
 */
import * as api from '../api.js';
import { h, scheda, tabella, pill, kpi, num, data, fa, giorniFa, memoria, erroreBox, nonDisponibile, avvisa, finestra } from '../ui.js';

const STATI = { aperta: ['aperta', 'rosso'], in_corso: ['in corso', 'ambra'], risolta: ['risolta', 'verde'] };
const DOVE = { tavolo: 'al tavolo', impostazioni: 'dalla home' };

export async function disegna(ctx) {
  const [appId, id] = ctx.param;
  if (appId && id) {
    const app = ctx.apps.find((a) => a.id === appId);
    if (!app) return erroreBox(new Error(`App sconosciuta: ${appId}`));
    return richiesta(ctx, app, id);
  }
  ctx.ricordaRecente('Assistenza');
  const app = ctx.app ?? ctx.apps.find((a) => api.sa(a, 'assistenza.elenco'));
  if (!app || !api.sa(app, 'assistenza.elenco')) return [nonDisponibile('Assistenza', 'nessun gioco espone ancora le richieste (`assistenza.elenco`).')];
  const f = { stati: memoria.leggi('assistenza.stati', ['aperta', 'in_corso']), da: giorniFa(89), a: giorniFa(0) };
  let r;
  try { r = await api.assistenzaElenco(app.id, f); } catch (e) { return [erroreBox(e)]; }

  const caselle = Object.entries(STATI).map(([k, [nome]]) => {
    const c = h('input', { type: 'checkbox', checked: f.stati.includes(k), onchange: () => {
      const scelti = [...document.querySelectorAll('[data-stato]')].filter((x) => x.checked).map((x) => x.dataset.stato);
      memoria.scrivi('assistenza.stati', scelti.length ? scelti : ['aperta', 'in_corso']);
      ctx.vai(`#/assistenza?${Date.now()}`);
    } });
    c.dataset.stato = k;
    return h('label', { class: 'campo', style: { flexDirection: 'row', alignItems: 'center', gap: '6px' } }, c, h('span', {}, nome));
  });

  return [
    h('div', { class: 'griglia g4' },
      kpi('Aperte', num(r.conti?.aperta), 'nessuno le ha ancora prese'),
      kpi('In corso', num(r.conti?.in_corso)),
      kpi('Risolte', num(r.conti?.risolta)),
      kpi('Le più vecchie aperte', (() => { const v = r.richieste.filter((x) => x.stato === 'aperta').at(-1); return v ? fa(v.creata_il) : '—'; })())),
    scheda(null, h('div', { class: 'filtri' }, h('span', {}, 'Mostra:'), ...caselle)),
    scheda(`Richieste (${r.richieste.length})`, tabella([
      { titolo: 'Quando', cella: (x) => data(x.creata_il) },
      { titolo: 'Stato', cella: (x) => pill(...(STATI[x.stato] ?? [x.stato, ''])) },
      { titolo: 'Giocatore', cella: (x) => [x.giocatore ?? '—', x.escluso ? pill('robot o prova', '') : null] },
      { titolo: 'Testo', cella: (x) => h('span', { style: { whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' } }, x.testo.length > 140 ? `${x.testo.slice(0, 140)}…` : x.testo) },
      { titolo: 'Da', cella: (x) => DOVE[x.dove] ?? x.dove },
      { titolo: 'Versione', cella: (x) => h('span', { class: 'mono' }, x.versione ?? '—') },
      { titolo: 'Segue', cella: (x) => x.seguita_da ?? '—' },
      { titolo: 'Risposte', cella: (x) => (x.risposte ? pill(`${x.risposte}`, 'verde') : '—') },
    ], r.richieste, { vuoto: 'Nessuna richiesta con questi stati. Bene così.', clic: (x) => ctx.vai(`#/assistenza/${app.id}/${x.id}`) })),
  ];
}

async function richiesta(ctx, app, id) {
  let r;
  try { r = await api.assistenzaScheda(app.id, id); } catch (e) { return erroreBox(e); }
  const q = r.richiesta;
  const g = r.giocatore ?? {};
  const c = r.contesto ?? {};
  ctx.ricordaRecente(`Richiesta di ${g.nome ?? '—'}`);
  ctx.briciole([{ testo: app.nome }, { testo: 'Assistenza', hash: '#/assistenza' }, { testo: g.nome ?? id.slice(0, 8) }]);
  document.querySelector('.titolo-pagina h1').textContent = `Richiesta di ${g.nome ?? 'un giocatore'}`;
  const ricarica = () => ctx.vai(`#/assistenza/${app.id}/${id}?${Date.now()}`);
  const aggiorna = async (x, ok) => {
    try { await api.assistenzaAggiorna(app.id, { id, ...x }); avvisa(ok); ricarica(); } catch (e) { avvisa(e.message, true); }
  };

  const nota = h('textarea', { rows: 2, maxlength: 1000, placeholder: 'Nota interna: la legge solo chi lavora sul pannello', 'aria-label': 'Nota interna' });
  const tasti = h('div', { style: { display: 'flex', gap: '8px', flexWrap: 'wrap' } },
    q.seguita_da ? null : h('button', { class: 'bottone', onclick: () => aggiorna({ prendo: true }, 'La segui tu') }, 'La seguo io'),
    q.stato !== 'in_corso' ? h('button', { class: 'bottone', onclick: () => aggiorna({ stato: 'in_corso' }, 'In corso') }, 'In corso') : null,
    q.stato !== 'risolta' ? h('button', { class: 'bottone', onclick: () => aggiorna({ stato: 'risolta' }, 'Risolta') }, 'Risolta') : h('button', { class: 'bottone', onclick: () => aggiorna({ stato: 'aperta' }, 'Riaperta') }, 'Riapri'),
    q.profilo_id ? h('button', { class: 'bottone primario', onclick: () => rispondi(app, q, g, aggiorna) }, 'Rispondi nel gioco') : null,
    q.profilo_id ? h('a', { class: 'bottone', href: `#/giocatori/${app.id}/${q.profilo_id}` }, 'Scheda del giocatore') : null);

  return [
    h('div', { class: 'griglia g4' },
      kpi('Stato', (STATI[q.stato] ?? [q.stato])[0], q.seguita_da ? `la segue ${q.seguita_da}` : 'nessuno la segue'),
      kpi('Scritta', fa(q.creata_il), `${DOVE[q.dove] ?? q.dove} · ${data(q.creata_il)}`),
      kpi('Versione', q.versione ?? '—', q.aggiornamento ? `aggiornamento ${String(q.aggiornamento).slice(0, 8)}` : ''),
      kpi('Telefono', q.telefono ?? '—', `${num(c.richieste)} richieste in tutto`)),
    scheda('Cosa ha scritto', h('div', {},
      h('p', { style: { whiteSpace: 'pre-wrap', fontSize: '1.05em' } }, q.testo),
      q.partita_id ? h('p', {}, 'Durante la partita ', h('a', { class: 'mono', href: `#/partite/${app.id}/${q.partita_id}` }, String(q.partita_id).slice(0, 8))) : null,
      tasti)),
    scheda('Note e risposte', h('div', {},
      h('ol', { class: 'linea-tempo' }, (q.note ?? []).map((n) => h('li', {},
        h('span', { class: 'ora' }, (() => { const d = data(n.quando); return `${d.slice(0, 5)}\n${d.split(', ')[1] ?? ''}`; })()),
        h('span', { class: `punto${n.tipo === 'risposta' ? ' partita' : n.tipo === 'stato' ? '' : ' admin'}` }),
        h('span', { style: { whiteSpace: 'pre-wrap' } }, h('strong', {}, n.tipo === 'risposta' ? 'Risposta nel gioco' : n.tipo === 'stato' ? 'Stato' : 'Nota'),
          h('span', { style: { color: 'var(--ink3)' } }, ` · ${n.chi}`), '\n', n.testo)))),
      (q.note ?? []).length ? null : h('p', {}, 'Ancora niente.'),
      h('form', { style: { display: 'grid', gap: '8px', marginTop: '8px' }, onsubmit: (e) => { e.preventDefault(); if (nota.value.trim()) void aggiorna({ nota: nota.value.trim() }, 'Nota aggiunta'); } },
        nota, h('div', {}, h('button', { class: 'bottone', type: 'submit' }, 'Aggiungi nota'))))),
    h('div', { class: 'griglia g2' },
      scheda('Ultime partite', tabella([
        { titolo: 'Quando', cella: (p) => h('a', { href: `#/partite/${app.id}/${p.id}` }, data(p.creata)) },
        { titolo: 'Gioco', cella: (p) => `${p.modo} · ${p.tavolo ?? ''}` },
        { titolo: 'Esito', cella: (p) => (p.stato !== 'finita' ? pill(p.stato, 'ambra') : p.vinta ? pill('vinta', 'verde') : p.motivo === 'conta' ? 'persa' : `persa · ${p.motivo}`) },
      ], c.partite ?? [], { vuoto: 'Nessuna partita sul server.' })),
      scheda('Telefoni e versioni', tabella([
        { titolo: 'Piattaforma', cella: (t) => t.piattaforma },
        { titolo: 'Versione', cella: (t) => h('span', { class: 'mono' }, t.versione ?? '—') },
        { titolo: 'Ultima volta', cella: (t) => fa(t.ultima) },
        { titolo: 'Aperture', cella: (t) => num(t.aperture) },
      ], c.telefoni ?? [], { vuoto: '—' })),
      scheda('Acquisti', tabella([
        { titolo: 'Quando', cella: (x) => data(x.quando) }, { titolo: 'Prodotto', cella: (x) => x.prodotto },
        { titolo: 'Stato', cella: (x) => pill(x.stato, x.stato === 'valido' ? 'verde' : '') }, { titolo: 'Ordine', cella: (x) => h('span', { class: 'mono' }, x.ordine ?? '—') },
      ], c.acquisti ?? [], { vuoto: 'Nessun acquisto.' })),
      scheda('Errori dell\'app', tabella([
        { titolo: 'Quando', cella: (x) => data(x.quando) }, { titolo: 'Errore', cella: (x) => x.messaggio },
      ], c.errori ?? [], { vuoto: 'Nessun errore registrato.' }))),
    scheda('Posta che gli abbiamo mandato', tabella([
      { titolo: 'Quando', cella: (x) => data(x.creata) }, { titolo: 'Titolo', cella: (x) => x.titolo },
      { titolo: 'Premio', cella: (x) => [x.monete ? `${num(x.monete)} monete` : '', x.gemme ? `${num(x.gemme)} gemme` : ''].filter(Boolean).join(' + ') || '—' },
      { titolo: 'Letta', cella: (x) => (x.letta ? pill('sì', 'verde') : 'no') }, { titolo: 'Ritirata', cella: (x) => (x.monete || x.gemme ? (x.ritirata ? pill('sì', 'verde') : 'no') : '—') },
    ], c.posta ?? [], { vuoto: 'Niente, finora.' })),
  ];
}

/** La risposta: un messaggio nella posta del gioco solo per lui, con un compenso facoltativo. */
async function rispondi(app, q, g, aggiorna) {
  const titolo = h('input', { type: 'text', maxlength: 60, value: 'Grazie per la segnalazione', 'aria-label': 'Titolo' });
  const testo = h('textarea', { rows: 4, maxlength: 500, placeholder: 'Abbiamo controllato: …', 'aria-label': 'Testo' });
  const monete = h('input', { type: 'number', min: 0, max: 5000, step: 50, value: 0, 'aria-label': 'Monete' });
  const gemme = h('input', { type: 'number', min: 0, max: 100, value: 0, 'aria-label': 'Gemme' });
  const chiudi = h('input', { type: 'checkbox', checked: true, 'aria-label': 'Segna come risolta' });
  const errore = h('div', { class: 'errore-testo' });
  const ok = await finestra({
    titolo: `Rispondi a ${g.nome ?? 'questo giocatore'}`,
    corpo: [
      h('p', {}, 'Arriva nella sua posta del gioco: la vede aprendo l\'app. Il compenso lo ritira lui, una volta sola (tetti: 5.000 monete, 100 gemme).'),
      h('label', { class: 'campo' }, h('span', {}, 'Titolo'), titolo),
      h('label', { class: 'campo' }, h('span', {}, 'Testo'), testo),
      h('div', { class: 'filtri' }, h('label', { class: 'campo' }, h('span', {}, 'Monete'), monete), h('label', { class: 'campo' }, h('span', {}, 'Gemme'), gemme)),
      h('label', { class: 'campo', style: { flexDirection: 'row', gap: '6px', alignItems: 'center' } }, chiudi, h('span', {}, 'E segna la richiesta come risolta')),
      errore],
    tasti: [{ testo: 'Annulla', risposta: false }, { testo: 'Manda', classe: 'primario', valore: () => {
      if (!titolo.value.trim() || !testo.value.trim()) { errore.textContent = 'Servono titolo e testo.'; return false; }
      return true;
    } }],
  });
  if (!ok) return;
  try {
    const premio = Number(monete.value) > 0 || Number(gemme.value) > 0;
    const res = await api.postaManda(app.id, {
      titolo: titolo.value.trim(), testo: testo.value.trim(), monete: Number(monete.value) || 0, gemme: Number(gemme.value) || 0,
      giorni: 30, perTutti: false, destinatari: [q.profilo_id], motivo: `Risposta alla richiesta di assistenza ${q.id.slice(0, 8)}${premio ? ' (compenso)' : ''}`,
    });
    const postaId = res?.id ?? res?.dati?.id ?? '';
    await aggiorna({ nota: `${titolo.value.trim()}\n${testo.value.trim()}${premio ? `\nCompenso: ${Number(monete.value) || 0} monete, ${Number(gemme.value) || 0} gemme` : ''}`, posta: postaId || 'mandata', ...(chiudi.checked ? { stato: 'risolta' } : {}) }, 'Risposta mandata');
  } catch (e) { avvisa(e.message, true); }
}
