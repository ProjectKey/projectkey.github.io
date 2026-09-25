/**
 * COMMAND CENTER (§3, §80)
 * ========================
 *
 * «Come stanno andando tutti i nostri giochi?» in meno di trenta secondi.
 * Con «Tutte le app» somma e mette a confronto; con un'app sola scende nel
 * dettaglio. I numeri che non esistono ancora (acquisizione, pubblicità)
 * restano «—» con la ragione scritta: un riquadro a zero direbbe il falso.
 */
import * as api from '../api.js';
import { h, kpi, num, soldi, perc, grafico, scheda, tabella, pill, giorniFa, memoria, erroreBox, fa } from '../ui.js';

const PERIODI = [{ g: 7, t: '7 giorni' }, { g: 30, t: '30 giorni' }, { g: 90, t: '90 giorni' }];

export async function disegna(ctx) {
  ctx.ricordaRecente('Command Center');
  const giorni = memoria.leggi('comando.periodo', 30);
  const bersagli = (ctx.app ? [ctx.app] : ctx.apps).filter((a) => api.sa(a, 'kpi'));

  const scelta = h('div', { class: 'azioni' }, PERIODI.map((p) => h('button', {
    class: `bottone piccolo${p.g === giorni ? ' primario' : ''}`,
    onclick: () => { memoria.scrivi('comando.periodo', p.g); ctx.vai(`#/comando?${Date.now()}`); },
  }, p.t)));

  // Dal primo del mese scorso, così «mese precedente» e «da inizio mese» si possono contare.
  const oggi = giorniFa(0);
  const primoMeseScorso = (() => { const d = new Date(`${oggi}T12:00:00`); d.setDate(1); d.setMonth(d.getMonth() - 1); return d.toISOString().slice(0, 10); })();
  const da = [giorniFa(giorni - 1), primoMeseScorso].sort()[0];

  const risposte = await Promise.all(bersagli.map(async (app) => {
    try { return { app, k: await api.kpi(app.id, da, oggi) }; } catch (e) { return { app, errore: e }; }
  }));
  const buone = risposte.filter((r) => r.k);
  const [salute, allarmi] = await Promise.all([
    Promise.all((ctx.app ? [ctx.app] : ctx.apps).filter((a) => api.sa(a, 'salute')).map(async (a) => ({ app: a, s: await api.salute(a.id).catch(() => null) }))),
    api.allarmi().catch(() => []),
  ]);

  const somma = sommaSerie(buone.map((r) => r.k.giorni ?? []));
  const periodo = somma.slice(-giorni);
  const ultimo = periodo.at(-1) ?? {};
  const prima = periodo.at(-8) ?? {};
  const mese = oggi.slice(0, 7);
  const meseScorso = primoMeseScorso.slice(0, 7);
  const tot = (serie, k) => serie.reduce((s, g) => s + (g[k] ?? 0), 0);
  const mtd = somma.filter((g) => g.giorno.startsWith(mese));
  const mp = somma.filter((g) => g.giorno.startsWith(meseScorso));
  const dauMedio = periodo.length ? tot(periodo, 'dau') / periodo.length : null;
  const entratePeriodo = tot(periodo, 'entrate_lorde');
  const pagantiPeriodo = tot(periodo, 'paganti');
  const wau = buone.reduce((s, r) => s + (r.k.wau ?? 0), 0) || null;
  const mau = buone.reduce((s, r) => s + (r.k.mau ?? 0), 0) || null;
  const ret = buone.length === 1 ? buone[0].k.retention ?? {} : {};
  const variazione = (a, b) => (a && b ? (a - b) / b : null);
  const etichette = periodo.map((g) => g.giorno.slice(5).split('-').reverse().join('/'));

  const aperti = allarmi.filter((a) => a.stato !== 'chiuso' && (!ctx.app || !a.app || a.app === ctx.app.id));

  return [
    h('div', { class: 'azioni', style: { justifyContent: 'space-between' } },
      h('span', { style: { color: 'var(--ink3)' } }, `${ctx.app ? ctx.app.nome : `${bersagli.length} app`} · fuso di Roma · euro`),
      scelta),
    ...risposte.filter((r) => r.errore).map((r) => erroreBox(new Error(`${r.app.nome}: ${r.errore.message}`))),

    aperti.length ? h('div', { class: `avviso ${aperti.some((a) => a.severita === 'CRITICAL') ? 'rosso' : 'ambra'}` },
      h('span', { class: 'ico' }, '⚠'),
      h('div', {}, h('strong', {}, `${aperti.length} ${aperti.length === 1 ? 'allarme aperto' : 'allarmi aperti'}: `),
        aperti.slice(0, 3).map((a) => a.titolo).join(' · '), ' ', h('a', { href: '#/tecnica' }, 'Vedi'))) : null,

    h('h2', {}, 'Business'),
    h('div', { class: 'griglia g6' },
      kpi('DAU oggi', num(ultimo.dau), `${pct(variazione(ultimo.dau, prima.dau))} su 7 g fa`, variazione(ultimo.dau, prima.dau)),
      kpi('WAU', num(wau), 'ultimi 7 giorni'),
      kpi('MAU', num(mau), 'ultimi 30 giorni'),
      kpi('DAU/MAU', mau && ultimo.dau ? perc(ultimo.dau / mau) : '—', 'stickiness'),
      kpi('Nuovi oggi', num(ultimo.nuovi), `${num(tot(periodo, 'nuovi'))} nel periodo`),
      kpi('Retention D1', perc(ret.d1), buone.length > 1 ? 'scegli un\'app' : `D7 ${perc(ret.d7)} · D30 ${perc(ret.d30)}`)),

    h('div', { class: 'griglia g2' },
      scheda('Utenti attivi al giorno', grafico('line', { etichette, serie: [{ nome: 'DAU', valori: periodo.map((g) => g.dau) }, { nome: 'Nuovi', valori: periodo.map((g) => g.nuovi) }] })),
      scheda('Entrate al giorno', grafico('bar', { etichette, soldi: true, serie: [{ nome: 'Lorde', valori: periodo.map((g) => g.entrate_lorde) }, { nome: 'Nette', valori: periodo.map((g) => g.entrate_nette) }] }),
        { nota: 'nette = senza IVA e commissione' })),

    h('h2', {}, 'Monetizzazione'),
    h('div', { class: 'griglia g6' },
      kpi('Entrate oggi', soldi(ultimo.entrate_lorde), `nette ${soldi(ultimo.entrate_nette)}`),
      kpi('Da inizio mese', soldi(tot(mtd, 'entrate_lorde')), `nette ${soldi(tot(mtd, 'entrate_nette'))}`),
      kpi('Mese scorso', mp.length ? soldi(tot(mp, 'entrate_lorde')) : '—', mp.length ? `nette ${soldi(tot(mp, 'entrate_nette'))}` : 'dati non ancora raccolti'),
      kpi('ARPDAU', dauMedio ? soldi(entratePeriodo / tot(periodo, 'dau')) : '—', 'entrate / utenti-giorno'),
      kpi('Acquisti', num(tot(periodo, 'acquisti')), `${num(pagantiPeriodo)} paganti`),
      kpi('Pubblicità', '—', 'spenta: AdMob in attesa')),

    h('h2', {}, 'Gioco'),
    h('div', { class: 'griglia g6' },
      kpi('Partite oggi', num(ultimo.partite_iniziate), `${num(ultimo.partite_finite)} finite`),
      kpi('Completamento', ultimo.partite_iniziate ? perc(ultimo.partite_finite / ultimo.partite_iniziate) : '—', 'finite / iniziate'),
      kpi('Abbandoni oggi', num(ultimo.abbandoni), ultimo.partite_iniziate ? `${perc(ultimo.abbandoni / ultimo.partite_iniziate)} delle partite` : ''),
      kpi('Partite per utente', ultimo.dau ? (ultimo.partite_iniziate / ultimo.dau).toLocaleString('it-IT', { maximumFractionDigits: 1 }) : '—', 'oggi'),
      kpi('Sessioni per utente', ultimo.dau && ultimo.sessioni ? (ultimo.sessioni / ultimo.dau).toLocaleString('it-IT', { maximumFractionDigits: 1 }) : '—', 'oggi'),
      kpi('Live Ops', '—', 'eventi: fase 2')),

    h('div', { class: 'griglia g2' },
      scheda('Partite al giorno', grafico('line', { etichette, serie: [{ nome: 'Iniziate', valori: periodo.map((g) => g.partite_iniziate) }, { nome: 'Finite', valori: periodo.map((g) => g.partite_finite) }, { nome: 'Abbandoni', valori: periodo.map((g) => g.abbandoni), colore: '--rosso' }] }, false)),
      scheda('Tecnica', [
        h('div', { class: 'griglia g2', style: { marginBottom: '12px' } },
          kpi('Crash-free utenti', buone.length === 1 ? perc(buone[0].k.crash_free_utenti) : '—', buone.length === 1 ? 'obiettivo 99,5%' : 'scegli un\'app'),
          kpi('Errori app oggi', num(ultimo.errori_app), 'eventi `errore` dal telefono')),
        h('div', { class: 'stato-servizi' }, ctx.app
          ? salute.flatMap(({ s }) => (s?.servizi ?? []).map((sv) => servizio(sv)))
          // Tutte le app: una riga per gioco, col servizio messo peggio.
          : salute.map(({ app, s }) => servizio({ nome: app.nome, ...peggiore(s?.servizi ?? []) }))),
      ], { azioni: h('a', { href: '#/tecnica', class: 'bottone piccolo' }, 'Dettagli') })),

    h('h2', {}, 'Acquisizione'),
    h('div', { class: 'avviso ambra' }, h('span', { class: 'ico' }, 'ⓘ'),
      h('div', {}, 'Installazioni, CPI, ROAS e organico/paid richiedono uno strumento di attribuzione (AppsFlyer, Adjust o simili) e i costi delle campagne: oggi non ce n\'è nessuno collegato. Le installazioni dagli store arriveranno dai report di Google Play.')),

    !ctx.app && buone.length > 1 ? [h('h2', {}, 'Confronto fra le app'), scheda(null, tabella([
      { titolo: 'App', cella: (r) => h('a', { href: '#/comando', onclick: (e) => { e.preventDefault(); memoria.scrivi('app', r.app.id); location.reload(); } }, r.app.nome) },
      { titolo: 'DAU oggi', num: true, cella: (r) => num(r.k.giorni?.at(-1)?.dau) },
      { titolo: 'MAU', num: true, cella: (r) => num(r.k.mau) },
      { titolo: 'D1', num: true, cella: (r) => perc(r.k.retention?.d1) },
      { titolo: 'D7', num: true, cella: (r) => perc(r.k.retention?.d7) },
      { titolo: 'Partite oggi', num: true, cella: (r) => num(r.k.giorni?.at(-1)?.partite_iniziate) },
      { titolo: `Entrate ${giorni} g`, num: true, cella: (r) => soldi((r.k.giorni ?? []).slice(-giorni).reduce((s, g) => s + (g.entrate_lorde ?? 0), 0)) },
      { titolo: 'Crash-free', num: true, cella: (r) => perc(r.k.crash_free_utenti) },
    ], buone)),
    scheda('DAU per app', grafico('line', {
      etichette, serie: buone.map((r) => ({ nome: r.app.nome, valori: (r.k.giorni ?? []).slice(-giorni).map((g) => g.dau) })),
    }, false))] : null,

    bersagli.length === 0 ? h('div', { class: 'avviso ambra' }, 'Nessuna app selezionata sa dare i KPI: il suo adattatore non espone ancora `kpi`.') : null,
    h('p', { style: { color: 'var(--ink3)', fontSize: '12px', margin: 0 } }, `Aggiornato ${fa(new Date())}. «Attivo» = ha aperto l'app quel giorno.`),
  ];
}

function pct(v) { return v === null ? '—' : `${v > 0 ? '+' : ''}${perc(v)}`; }

/** Somma giorno per giorno le serie di più app. */
function sommaSerie(liste) {
  const m = new Map();
  for (const serie of liste) {
    for (const g of serie) {
      const t = m.get(g.giorno) ?? { giorno: g.giorno };
      for (const [k, v] of Object.entries(g)) if (typeof v === 'number') t[k] = (t[k] ?? 0) + v;
      m.set(g.giorno, t);
    }
  }
  return [...m.values()].sort((a, b) => a.giorno.localeCompare(b.giorno));
}

const ORDINE = ['operational', 'degraded', 'partial', 'major'];
function peggiore(servizi) {
  if (!servizi.length) return { stato: 'sconosciuto', dettaglio: 'nessun dato' };
  // «spento» è una scelta, non un guasto: non conta.
  const attivi = servizi.filter((s) => ORDINE.includes(s.stato));
  if (!attivi.length) return { stato: 'spento', dettaglio: 'tutti spenti' };
  const w = attivi.reduce((a, b) => (ORDINE.indexOf(b.stato) > ORDINE.indexOf(a.stato) ? b : a));
  return { stato: w.stato, dettaglio: w.stato === 'operational' ? 'tutti i servizi operativi' : `${w.nome}: ${w.dettaglio ?? w.stato}` };
}

export function servizio(sv, prefisso) {
  const colori = { spento: ['', 'Spento'], sconosciuto: ['', 'Nessun dato'], operational: ['verde', 'Operativo'], degraded: ['ambra', 'Degradato'], partial: ['ambra', 'Guasto parziale'], major: ['rosso', 'Guasto grave'] };
  const [c, t] = colori[sv.stato] ?? ['', sv.stato];
  return h('div', { class: 'servizio', title: sv.dettaglio ?? '' },
    h('span', { class: `pill ${c}` }, h('span', { class: 'pallino' })),
    h('span', { class: 'nome' }, prefisso ? `${prefisso} · ${sv.nome}` : sv.nome),
    pill(t, c));
}
