/**
 * GROWTH CONTROL ROOM (Growth Engine, G1–G3 — 7 ottobre 2026)
 * ==========================================================
 *
 * Il requisito è `docs/crescita/REQUISITO-GROWTH-ENGINE.md` (§7–8, §9–10, §35–37,
 * §45, §49); il piano `docs/crescita/GROWTH-ENGINE.md`.
 *
 * - **North Star**: 10.000 in 90 giorni dal 13 ottobre 2026 (Giorgio). Target al
 *   giorno N (le tappe del requisito, in linea retta fra una e l'altra),
 *   actual, delta, proiezione al giorno 90, nuovi al giorno e media di 7 giorni,
 *   e lo stato: avanti, in linea, a rischio, fuori strada.
 * - **Scoreboard** col semaforo, contro i target del §59.
 * - **Brief del giorno** (§49), scritto con regole: niente intelligenza artificiale.
 * - **Parole** con posizione sulla ricerca Play e Opportunity Score (§10).
 * - **Concorrenti** (§38), **esperimenti** con ICE e backlog (§34–37), **registro** (§45).
 *
 * «Nuovi» sono i telefoni che hanno aperto il gioco la prima volta (senza Giorgio,
 * robot e prove): le installazioni della Play Console arrivano col blocco G2-bis.
 */
import * as api from '../api.js';
import { h, scheda, tabella, pill, kpi, num, perc, data, fa, erroreBox, nonDisponibile, avvisa, grafico, finestra, confermaConMotivo } from '../ui.js';

const STATI = { NOW: 'viola', NEXT: 'blu', LATER: '', WON: 'verde', LOST: 'rosso' };
const DECISIONI = { SCALE: 'verde', ITERATE: 'ambra', HOLD: '', KILL: 'rosso' };

/** Opportunity Score 0–100 (§10): traffico potenziale × rilevanza ÷ difficoltà, pesato dallo spazio che c'è da guadagnare. */
export function opportunita(p) {
  const spazio = p.oggi == null ? 0.8 : p.oggi > 10 ? 1 : p.oggi > 3 ? 0.7 : 0.3;
  return Math.round(100 * (p.volume / 5) * (p.rilevanza / 5) * ((6 - p.difficolta) / 5) * spazio);
}

/** Lo stato del programma (§2): actual contro target al giorno di oggi. */
export function statoDelPiano(attuale, target) {
  if (!target) return { k: 'preparazione', testo: 'In preparazione', colore: 'blu' };
  const r = attuale / target;
  if (r >= 1.1) return { k: 'ahead', testo: 'Avanti sul piano', colore: 'verde' };
  if (r >= 0.9) return { k: 'on-track', testo: 'In linea', colore: 'verde' };
  if (r >= 0.6) return { k: 'at-risk', testo: 'A rischio', colore: 'ambra' };
  return { k: 'off-track', testo: 'Fuori strada', colore: 'rosso' };
}

const semaforo = (v, buono, attento, alto = true) => {
  if (v === null || v === undefined || Number.isNaN(v)) return pill('—', '');
  const ok = alto ? v >= buono : v <= buono;
  const quasi = alto ? v >= attento : v <= attento;
  return pill(ok ? '🟢' : quasi ? '🟡' : '🔴', ok ? 'verde' : quasi ? 'ambra' : 'rosso');
};

export async function disegna(ctx) {
  ctx.ricordaRecente('Growth Control Room');
  const app = ctx.app ?? ctx.apps.find((a) => api.sa(a, 'crescita.cruscotto'));
  if (!app || !api.sa(app, 'crescita.cruscotto')) return [nonDisponibile('Growth Control Room', 'nessun gioco espone ancora il cruscotto della crescita (`crescita.cruscotto`).')];
  let c;
  try { c = await api.crescitaCruscotto(app.id); } catch (e) { return [erroreBox(e)]; }

  const pr = c.programma ?? {};
  const serie = c.serie ?? [];
  const oggi = serie.at(-1) ?? {};
  const giornoN = oggi.giorno_programma ?? 0;
  const inCorso = giornoN >= 1;
  const targetOggi = inCorso ? oggi.target : 0;
  const ultimi7 = serie.slice(-7);
  const media7 = ultimi7.reduce((s, x) => s + x.nuovi, 0) / Math.max(1, ultimi7.length);
  const attivati7 = ultimi7.reduce((s, x) => s + x.attivati, 0);
  const restano = Math.max(0, (pr.giorni ?? 90) - Math.max(0, giornoN));
  const proiezione = Math.round((c.cumulato ?? 0) + media7 * restano);
  const stato = statoDelPiano(c.cumulato ?? 0, targetOggi);
  const ret = c.retention ?? {};
  const quota = (x) => (x && x[1] ? x[0] / x[1] : null);
  const d1 = quota(ret.d1); const d7 = quota(ret.d7); const att = quota(ret.attivazione);
  const inv = c.inviti ?? {};
  const k = inv.giocano ? inv.account_invitati / inv.giocano : null;
  const sc = c.scheda ?? {};
  const parole = (c.parole ?? []).map((p) => ({ ...p, score: opportunita(p) }));
  const inTop10 = parole.filter((p) => p.oggi && p.oggi <= 10).length;
  const comparsi = parole.filter((p) => p.oggi).length;
  const targetGiorno = inCorso ? Math.round((targetOggi - (serie.at(-2)?.target ?? 0)) || 40) : 40;

  // Il brief del giorno (§49): poche righe, scritte con regole.
  const ieri = serie.at(-2) ?? {};
  const problemi = [];
  if (att !== null && att < 0.75) problemi.push(`attivazione ${perc(att)}: un nuovo su ${Math.round(1 / Math.max(att, 0.01))} non finisce una partita vera`);
  if (d1 !== null && d1 < 0.35) problemi.push(`D1 ${perc(d1)}, sotto il 35%`);
  if (media7 < targetGiorno) problemi.push(`${media7.toLocaleString('it-IT', { maximumFractionDigits: 1 })} nuovi al giorno contro ${targetGiorno} del piano`);
  if (!sc.recensioni) problemi.push('nessuna recensione sulla scheda');
  const migliore = [...parole].filter((p) => p.oggi).sort((a, b) => a.oggi - b.oggi)[0];

  const raccogli = async (e) => {
    const b = e.currentTarget; b.disabled = true; b.textContent = 'Leggo Play… (un minuto)';
    try { await api.crescitaRaccogli(app.id); avvisa('Raccolta avviata: fra un paio di minuti è nel registro, ricarica la pagina'); b.textContent = 'Avviata'; }
    catch (x) { avvisa(x.message, true); b.disabled = false; b.textContent = 'Raccogli adesso'; }
  };

  const giorni = serie.map((x) => x.giorno.slice(5).split('-').reverse().join('/'));
  let cum = 0;
  const cumulati = serie.map((x) => { if (x.giorno_programma >= 1) cum += x.nuovi; return x.giorno_programma >= 1 ? cum : null; });

  return [
    h('div', { class: 'avviso' }, h('span', { class: 'ico' }, '★'), h('div', {},
      h('strong', {}, `North Star: ${num(10000)} download in ${pr.giorni ?? 90} giorni. `),
      inCorso ? `Giorno ${giornoN} di ${pr.giorni ?? 90}, partito il ${data(pr.giorno1).slice(0, 10)}.` : `Il conto parte il ${data(pr.giorno1).slice(0, 10)} (giorno 1): questa è la settimana per rendere tutto misurabile.`,
      ' ', pill(stato.testo, stato.colore))),
    h('div', { class: 'griglia g4' },
      kpi('Target ad oggi', num(targetOggi), inCorso ? `giorno ${giornoN}` : 'parte il giorno 1'),
      kpi('Actual', num(c.cumulato ?? 0), `${num(c.cumulato_attivati ?? 0)} attivati · ${num(c.prima_del_programma ?? 0)} prima del giorno 1`),
      kpi('Delta', `${(c.cumulato ?? 0) - targetOggi >= 0 ? '+' : ''}${num((c.cumulato ?? 0) - targetOggi)}`, 'actual − target'),
      kpi('Proiezione al giorno 90', num(proiezione), `al ritmo degli ultimi 7 giorni (${media7.toLocaleString('it-IT', { maximumFractionDigits: 1 })} al giorno)`)),
    scheda('Brief del giorno', h('div', { style: { display: 'grid', gap: '4px' } },
      h('div', {}, h('strong', {}, 'Nuovi ieri: '), num(ieri.nuovi ?? 0), ' · ', h('strong', {}, 'media 7 giorni: '), media7.toLocaleString('it-IT', { maximumFractionDigits: 1 }),
        ' · ', h('strong', {}, 'attivati (7 giorni): '), num(attivati7), ' · ', h('strong', {}, 'stato: '), stato.testo),
      h('div', {}, h('strong', {}, 'Scheda: '), sc.voto ? `voto ${String(sc.voto).replace('.', ',')}, ${num(sc.recensioni)} recensioni` : 'nessun voto ancora', sc.fascia ? ` · ${sc.fascia} installazioni` : '',
        ' · ', h('strong', {}, 'parole: '), `compariamo in ${comparsi} su ${parole.length}, ${inTop10} nei primi dieci`, migliore ? ` · la migliore: «${migliore.parola}» ${migliore.oggi}º` : ''),
      problemi.length ? h('div', {}, h('strong', {}, 'Problemi: '), problemi.join(' · ')) : h('div', {}, 'Nessun problema sopra le soglie.'),
      ['at-risk', 'off-track'].includes(stato.k) ? h('div', {}, h('strong', {}, 'Azione: '), 'stato a rischio: più esperimenti in NOW e backlog da rivedere (§2).') : null),
    { azioni: [h('button', { class: 'bottone', onclick: raccogli }, 'Raccogli adesso')] }),
    h('div', { class: 'griglia g2' },
      scheda('Cumulato contro target', grafico('line', {
        etichette: giorni,
        serie: [{ nome: 'Target', valori: serie.map((x) => (x.giorno_programma >= 1 ? x.target : null)), colore: '--ink3' }, { nome: 'Actual', valori: cumulati, colore: '--verde' }],
      }, false)),
      scheda('Nuovi al giorno', grafico('line', {
        etichette: giorni,
        serie: [{ nome: 'Nuovi', valori: serie.map((x) => x.nuovi), colore: '--cielo' }, { nome: 'Attivati', valori: serie.map((x) => x.attivati), colore: '--viola' },
          { nome: 'Attivi', valori: serie.map((x) => x.attivi), colore: '--ambra' }],
      }, false))),
    scheda('Scoreboard', tabella([
      { titolo: 'KPI', cella: (r) => h('strong', {}, r.k) },
      { titolo: 'Actual', num: true, cella: (r) => r.a },
      { titolo: 'Target', num: true, cella: (r) => r.t },
      { titolo: '', cella: (r) => r.s },
      { titolo: 'Da dove', cella: (r) => h('span', { style: { color: 'var(--ink3)' } }, r.n) },
    ], [
      { k: 'Download al giorno (7 gg)', a: media7.toLocaleString('it-IT', { maximumFractionDigits: 1 }), t: String(targetGiorno), s: semaforo(media7, targetGiorno, targetGiorno * 0.6), n: 'aperture nuove, senza prove e robot' },
      { k: 'Attivati / settimana (North Star)', a: num(attivati7), t: String(Math.round(targetGiorno * 7 * 0.75)), s: semaforo(attivati7, targetGiorno * 7 * 0.75, targetGiorno * 7 * 0.45), n: 'prima partita vera finita' },
      { k: 'Attivazione (14 gg)', a: perc(att), t: '75%', s: semaforo(att, 0.75, 0.5), n: `${ret.attivazione?.[0] ?? 0} su ${ret.attivazione?.[1] ?? 0}` },
      { k: 'D1 (14 gg)', a: perc(d1), t: '35%', s: semaforo(d1, 0.35, 0.25), n: `${ret.d1?.[0] ?? 0} su ${ret.d1?.[1] ?? 0}` },
      { k: 'D7', a: perc(d7), t: '15%', s: semaforo(d7, 0.15, 0.1), n: `${ret.d7?.[0] ?? 0} su ${ret.d7?.[1] ?? 0}` },
      { k: 'Coefficiente K (14 gg)', a: k === null ? '—' : k.toLocaleString('it-IT', { maximumFractionDigits: 2 }), t: '0,1', s: semaforo(k, 0.1, 0.05), n: `${num(inv.mandati ?? 0)} inviti mandati, ${num(inv.account_invitati ?? 0)} account arrivati` },
      { k: 'Recensioni', a: num(sc.recensioni ?? 0), t: '300–500 in 90 gg', s: semaforo(sc.recensioni ?? 0, Math.max(1, giornoN * 4), Math.max(1, giornoN * 2)), n: 'scheda Play, letta ogni mattina' },
      { k: 'Voto', a: sc.voto ? String(sc.voto).replace('.', ',') : '—', t: '4,5', s: semaforo(sc.voto ?? null, 4.5, 4.2), n: '' },
      { k: 'Parole nei primi 10', a: `${inTop10} su ${parole.length}`, t: '—', s: semaforo(inTop10, 10, 4), n: 'ricerca Play, Italia' },
      { k: 'Conversione della scheda', a: '—', t: '30%', s: pill('—', ''), n: 'serve G2-bis (rapporti di Play Console)' },
      { k: 'Installazioni da Search / Explore', a: '—', t: '4.500 / 2.000', s: pill('—', ''), n: 'serve G2-bis' },
    ])),
    scheda(`Parole (${parole.length})`, tabella([
      { titolo: 'Parola', cella: (p) => h('strong', {}, p.parola) },
      { titolo: 'Cluster', cella: (p) => pill(p.cluster, '') },
      { titolo: 'Oggi', num: true, cella: (p) => (p.oggi ? `${p.oggi}º` : h('span', { style: { color: 'var(--ink3)' } }, 'non compare')) },
      { titolo: '7 gg fa', num: true, cella: (p) => (p.settimana_fa ? `${p.settimana_fa}º` : '—') },
      { titolo: 'Migliore', num: true, cella: (p) => (p.migliore ? `${p.migliore}º` : '—') },
      { titolo: 'Vol · Diff · Ril', cella: (p) => `${p.volume} · ${p.difficolta} · ${p.rilevanza}` },
      { titolo: 'Opportunità', num: true, cella: (p) => pill(String(p.score), p.score >= 50 ? 'verde' : p.score >= 25 ? 'ambra' : '') },
      { titolo: 'Primo nella ricerca', cella: (p) => h('span', { class: 'mono', style: { fontSize: '12px' } }, (p.primi ?? [])[0] ?? '—') },
    ], [...parole].sort((a, b) => b.score - a.score), { vuoto: 'Nessuna parola.' }),
    { nota: 'Posizione nella ricerca pubblica di Google Play (Italia, italiano), letta ogni mattina. Volume, difficoltà e rilevanza sono stime da 1 a 5, da correggere coi termini di ricerca della Play Console. Opportunità = volume × rilevanza ÷ difficoltà, pesata dallo spazio da guadagnare.' }),
    scheda('Concorrenti', tabella([
      { titolo: 'App', cella: (x) => h('div', {}, h('strong', {}, x.nome ?? x.pacchetto), h('div', { class: 'mono', style: { fontSize: '11px', color: 'var(--ink3)' } }, x.pacchetto)) },
      { titolo: 'Sviluppatore', cella: (x) => x.sviluppatore ?? '—' },
      { titolo: 'Installazioni', num: true, cella: (x) => (x.installazioni ? num(x.installazioni) : x.fascia ?? '—') },
      { titolo: 'Voto', num: true, cella: (x) => (x.voto ? String(x.voto).replace('.', ',') : '—') },
      { titolo: 'Recensioni', num: true, cella: (x) => num(x.recensioni) },
      { titolo: 'Ultima modifica', cella: (x) => x.aggiornata ?? '—' },
    ], c.concorrenti ?? [], { vuoto: 'Ancora nessuna fotografia: la fa la raccolta del lunedì (o «Raccogli adesso»).' }), { nota: 'Le app che compaiono più spesso nei primi cinque risultati delle nostre parole, una fotografia a settimana.' }),
    scheda('Esperimenti e backlog', h('div', {},
      tabella([
        { titolo: 'ID', cella: (e) => h('span', { class: 'mono' }, e.id) },
        { titolo: 'Stato', cella: (e) => pill(e.stato, STATI[e.stato] ?? '') },
        { titolo: 'Esperimento', cella: (e) => h('div', {}, h('strong', {}, e.titolo), h('div', { style: { color: 'var(--ink3)', fontSize: '12px' } }, e.ipotesi)) },
        { titolo: 'Metrica', cella: (e) => `${e.metrica}${e.baseline ? ` · da ${e.baseline}` : ''}${e.target ? ` a ${e.target}` : ''}` },
        { titolo: 'ICE', num: true, cella: (e) => String(e.ice).replace('.', ',') },
        { titolo: 'Esito', cella: (e) => (e.decisione ? pill(e.decisione, DECISIONI[e.decisione] ?? '') : e.inizio ? `dal ${data(e.inizio).slice(0, 10)}` : '—') },
      ], c.esperimenti ?? [], { clic: (e) => modificaEsperimento(ctx, app, e), vuoto: 'Nessun esperimento.' }),
      h('div', { style: { marginTop: '8px' } }, h('button', { class: 'bottone', onclick: () => modificaEsperimento(ctx, app, null) }, 'Nuovo esperimento'))),
    { nota: 'NOW al massimo 5 (§37). ICE = impatto × fiducia ÷ sforzo. Ogni esperimento chiuso finisce in SCALE, ITERATE, HOLD o KILL (§36).' }),
    scheda('Registro degli agenti', tabella([
      { titolo: 'Quando', cella: (r) => data(r.quando) },
      { titolo: 'Agente', cella: (r) => pill(r.agente, '') },
      { titolo: 'Azione', cella: (r) => h('div', {}, r.azione, r.perche ? h('div', { style: { color: 'var(--ink3)', fontSize: '12px' } }, r.perche) : null) },
      { titolo: 'Effetto atteso', cella: (r) => r.effetto_atteso || '—' },
      { titolo: 'Stato', cella: (r) => r.stato },
      { titolo: 'Esp.', cella: (r) => r.esperimento ?? '' },
    ], c.registro ?? [], { vuoto: 'Ancora niente.' }), { nota: 'Ogni azione di un agente, del server o di Claude, con il suo perché (§45).' }),
  ];
}

/** Crea o aggiorna un esperimento: ipotesi, metrica, stato nel backlog, ICE, esito. */
async function modificaEsperimento(ctx, app, e) {
  const x = e ?? { area: 'aso', stato: 'NEXT', impatto: 5, fiducia: 5, sforzo: 5 };
  const campo = (k, etichetta, tipo = 'text', opzioni) => {
    const el = opzioni
      ? h('select', {}, opzioni.map((o) => h('option', { value: o, selected: x[k] === o }, o || '—')))
      : tipo === 'area' ? h('textarea', { rows: 2 }, x[k] ?? '') : h('input', { type: tipo, value: x[k] ?? '', min: 1, max: 10 });
    return { k, el, nodo: h('label', { class: 'campo' }, h('span', {}, etichetta), el) };
  };
  const campi = [
    campo('titolo', 'Titolo'), campo('area', 'Area', 'text', ['aso', 'scheda', 'seo', 'social', 'referral', 'community', 'retention', 'prodotto', 'pr']),
    campo('ipotesi', 'Ipotesi', 'area'), campo('metrica', 'Metrica'), campo('baseline', 'Baseline'), campo('target', 'Target'), campo('azione', 'Azione', 'area'),
    campo('stato', 'Stato', 'text', ['NOW', 'NEXT', 'LATER', 'WON', 'LOST']),
    campo('impatto', 'Impatto (1–10)', 'number'), campo('fiducia', 'Fiducia (1–10)', 'number'), campo('sforzo', 'Sforzo (1–10)', 'number'),
    campo('inizio', 'Inizio', 'date'), campo('fine', 'Fine', 'date'), campo('risultato', 'Risultato', 'area'),
    campo('decisione', 'Decisione', 'text', ['', 'SCALE', 'ITERATE', 'HOLD', 'KILL']), campo('imparato', 'Cosa abbiamo imparato', 'area'), campo('prossima', 'Prossima azione', 'area'),
  ];
  const ok = await finestra({
    titolo: e ? `${e.id} · ${e.titolo}` : 'Nuovo esperimento',
    corpo: [h('div', { style: { display: 'grid', gap: '8px', maxHeight: '60vh', overflow: 'auto' } }, campi.map((c) => c.nodo))],
    tasti: [{ testo: 'Annulla', risposta: false }, { testo: 'Salva', classe: 'primario', risposta: true }],
  });
  if (!ok) return;
  const esperimento = { ...(e ? { id: e.id } : {}) };
  for (const c of campi) {
    const v = c.el.value;
    esperimento[c.k] = ['impatto', 'fiducia', 'sforzo'].includes(c.k) ? Number(v) || 5 : v;
  }
  const r = await confermaConMotivo({ titolo: 'Salva l\'esperimento', tasto: 'Salva', testo: 'Finisce nel registro degli agenti.' });
  if (!r) return;
  try { const res = await api.crescitaEsperimento(app.id, esperimento, r.motivo); avvisa(`Salvato ${res.id ?? res.dati?.id ?? ''}`); ctx.vai(`#/sala?${Date.now()}`); }
  catch (x) { avvisa(x.message, true); }
}
