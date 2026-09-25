/**
 * MONETIZZAZIONE (§33, §38)
 * =========================
 *
 * Gli acquisti veri, verificati dal server con Google, e i rimborsi letti ogni
 * ora (F-111-decies). La pubblicità è spenta finché AdMob non approva: la sua
 * parte resta vuota con la ragione, non a zero.
 */
import * as api from '../api.js';
import { h, scheda, tabella, pill, kpi, num, soldi, perc, data, giorniFa, memoria, erroreBox, nonDisponibile } from '../ui.js';

export async function disegna(ctx) {
  ctx.ricordaRecente('Monetizzazione');
  const f = memoria.leggi('monetizzazione.filtri', { da: giorniFa(29), a: giorniFa(0), stato: '' });
  const apps = (ctx.app ? [ctx.app] : ctx.apps);
  const conAcquisti = apps.filter((a) => api.sa(a, 'acquisti'));
  const risposte = await Promise.all(conAcquisti.map(async (a) => ({ app: a, r: await api.acquisti(a.id, f.da, f.a).catch((e) => ({ errore: e })) })));
  const tutti = risposte.flatMap(({ app, r }) => (Array.isArray(r) ? r : []).map((x) => ({ ...x, app })))
    .sort((a, b) => String(b.quando).localeCompare(String(a.quando)));
  const visibili = tutti.filter((x) => !f.stato || x.stato === f.stato);
  const consegnati = tutti.filter((x) => x.stato === 'consegnato' || x.stato === 'rimborsato');
  const rimborsati = tutti.filter((x) => x.stato === 'rimborsato');
  const lordo = consegnati.reduce((s, x) => s + (x.prezzo ?? 0), 0);
  const perso = rimborsati.reduce((s, x) => s + (x.prezzo ?? 0), 0);
  const paganti = new Set(consegnati.map((x) => x.giocatore)).size;
  const perProdotto = new Map();
  for (const x of consegnati) {
    const p = perProdotto.get(x.prodotto) ?? { prodotto: x.prodotto, venduti: 0, entrate: 0 };
    p.venduti += 1; p.entrate += x.prezzo ?? 0; perProdotto.set(x.prodotto, p);
  }

  const da = h('input', { type: 'date', value: f.da, 'aria-label': 'Dal' });
  const a = h('input', { type: 'date', value: f.a, 'aria-label': 'Al' });
  const stato = h('select', { 'aria-label': 'Stato' }, [['', 'Tutti'], ['consegnato', 'Consegnati'], ['rimborsato', 'Rimborsati'], ['in-attesa', 'In attesa']].map(([v, t]) => h('option', { value: v }, t)));
  stato.value = f.stato;

  return [
    ...apps.filter((x) => !api.sa(x, 'acquisti')).map((x) => nonDisponibile(`Acquisti di ${x.nome}`, 'l\'adattatore non espone `acquisti`.')),
    ...risposte.filter((x) => x.r?.errore).map((x) => erroreBox(new Error(`${x.app.nome}: ${x.r.errore.message}`))),
    scheda(null, h('form', {
      class: 'filtri', onsubmit: (e) => { e.preventDefault(); memoria.scrivi('monetizzazione.filtri', { da: da.value, a: a.value, stato: stato.value }); ctx.vai(`#/monetizzazione?${Date.now()}`); },
    }, h('label', { class: 'campo' }, h('span', {}, 'Dal'), da), h('label', { class: 'campo' }, h('span', {}, 'Al'), a),
    h('label', { class: 'campo' }, h('span', {}, 'Stato'), stato), h('button', { class: 'bottone primario', type: 'submit' }, 'Applica'))),
    h('div', { class: 'griglia g6' },
      kpi('Entrate lorde', soldi(lordo), 'IVA e commissione comprese'),
      kpi('Stima netta', soldi((lordo - perso) / 1.22 * 0.85), 'senza IVA 22% e 15% di Google'),
      kpi('Acquisti', num(consegnati.length), `${num(paganti)} paganti`),
      kpi('ARPPU', paganti ? soldi(lordo / paganti) : '—', 'entrate / paganti'),
      kpi('Rimborsi', num(rimborsati.length), consegnati.length ? `${perc(rimborsati.length / consegnati.length)} · ${soldi(perso)}` : ''),
      kpi('Pubblicità', '—', 'spenta: AdMob in attesa')),
    h('div', { class: 'griglia g2' },
      scheda('Per prodotto', tabella([
        { titolo: 'Prodotto', cella: (p) => h('span', { class: 'mono' }, p.prodotto) },
        { titolo: 'Venduti', num: true, cella: (p) => num(p.venduti) },
        { titolo: 'Entrate', num: true, cella: (p) => soldi(p.entrate) },
      ], [...perProdotto.values()].sort((x, y) => y.entrate - x.entrate), { vuoto: 'Nessuna vendita nel periodo.' })),
      scheda('Da sapere', h('ul', { style: { margin: 0, paddingLeft: '18px', color: 'var(--ink2)' } },
        h('li', {}, 'Le ricevute le verifica la cassa con Google prima di consegnare: un acquisto qui è un acquisto vero.'),
        h('li', {}, 'I rimborsi di Google si leggono ogni ora e tolgono quello che l\'acquisto aveva dato (F-111-decies).'),
        h('li', {}, 'La stima netta è indicativa: il netto vero arriva dai report finanziari di Google Play (fase 2).'),
        h('li', {}, 'Offerte, prezzi e prodotti da pannello (§33, §34) sono in fase 2: oggi i prodotti si creano con lo script prodotti-play.ts.')))),
    scheda(`Acquisti (${visibili.length})`, tabella([
      { titolo: 'Quando', cella: (x) => data(x.quando) },
      { titolo: 'Giocatore', cella: (x) => x.giocatore ? h('a', { href: `#/giocatori/${x.app.id}/${x.giocatore}` }, x.nome ?? x.giocatore.slice(0, 8)) : '—' },
      { titolo: 'App', cella: (x) => x.app.nome },
      { titolo: 'Prodotto', cella: (x) => h('span', { class: 'mono' }, x.prodotto) },
      { titolo: 'Prezzo', num: true, cella: (x) => soldi(x.prezzo) },
      { titolo: 'Stato', cella: (x) => pill(x.stato, x.stato === 'consegnato' ? 'verde' : x.stato === 'rimborsato' ? 'rosso' : 'ambra') },
      { titolo: 'Ordine', cella: (x) => h('span', { class: 'mono' }, x.ordine ?? '—') },
    ], visibili, { vuoto: 'Nessun acquisto nel periodo.' })),
  ];
}
