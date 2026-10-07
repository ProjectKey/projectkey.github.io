/**
 * ANALISI (Control Center, blocco C4, §46–49 — 6 ottobre 2026)
 * ===========================================================
 *
 * Tre strumenti, tutti senza Giorgio, i robot di Google e le prove (0073):
 *
 *  - **Esplora eventi** (§49): ogni evento che il gioco manda, con le sue
 *    proprietà; si sceglie un evento, si filtra per una proprietà e si divide
 *    per un'altra (es. `partita` diviso per `gioco`, solo `vinta = true`);
 *  - **Percorso a passi scelti** (§47): una fila di eventi, anche con un
 *    filtro (`partita_iniziata:gioco=scopa`), e quanti telefoni nati nel periodo
 *    arrivano a ogni passo nell'ordine. Lo stesso evento due volte = la seconda
 *    volta (due `partita` = la seconda partita finita);
 *  - **Coorti** (§48): per giorno di nascita, versione, piattaforma,
 *    provenienza, e dal G4 (0090) per **primo risultato** e **tipo di
 *    giocatore** del primo giorno (Growth Engine §32): quanti, quanti tornano
 *    il giorno 1, 3, 7, 14, 30, quante partite a testa, quanti pagano.
 */
import * as api from '../api.js';
import { h, svuota, metti, scheda, tabella, pill, kpi, num, perc, data, giorniFa, memoria, erroreBox, nonDisponibile, caricamento } from '../ui.js';

// `prima_carta` c'è solo dalla 1.0.9: nel percorso di serie svuoterebbe tutto quello che viene dopo.
const ONBOARDING = ['avvio', 'partita_iniziata', 'partita', 'partita'];

export async function disegna(ctx) {
  ctx.ricordaRecente('Analisi');
  const app = ctx.app ?? ctx.apps.find((a) => api.sa(a, 'analisi.catalogo'));
  if (!app || !api.sa(app, 'analisi.catalogo')) return [nonDisponibile('Analisi', 'nessun gioco espone ancora l\'analisi (`analisi.catalogo`).')];
  const salvati = memoria.leggi('analisi.periodo', null);
  const f = salvati?.giorno === giorniFa(0) ? salvati : { da: giorniFa(29), a: giorniFa(0) };
  let catalogo;
  try { catalogo = await api.analisiCatalogo(app.id, f.da, f.a); } catch (e) { return [erroreBox(e)]; }

  const da = h('input', { type: 'date', value: f.da, 'aria-label': 'Dal' });
  const a = h('input', { type: 'date', value: f.a, 'aria-label': 'Al' });
  const periodo = scheda(null, h('form', {
    class: 'filtri', onsubmit: (e) => { e.preventDefault(); memoria.scrivi('analisi.periodo', { da: da.value, a: a.value, giorno: giorniFa(0) }); ctx.vai(`#/analisi?${Date.now()}`); },
  }, h('label', { class: 'campo' }, h('span', {}, 'Dal'), da), h('label', { class: 'campo' }, h('span', {}, 'al'), a),
  h('button', { class: 'bottone primario', type: 'submit' }, 'Applica'),
  h('span', { style: { color: 'var(--ink3)' } }, 'Senza i tuoi telefoni, i robot di Google e le prove.')));

  return [periodo, esplora(app, f, catalogo), imbuto(app, f, catalogo), coorti(app, f)];
}

/* ------------------------------------------------------------ esplora eventi */

function esplora(app, f, catalogo) {
  const ultimo = memoria.leggi('analisi.evento', { nome: 'partita', chiave: '', valore: '', per: 'gioco' });
  const nome = h('select', { 'aria-label': 'Evento' }, catalogo.map((e) => h('option', { value: e.nome, selected: e.nome === ultimo.nome }, `${e.nome} (${num(e.quanti)})`)));
  const chiave = h('select', { 'aria-label': 'Filtra per' });
  const valore = h('input', { type: 'text', value: ultimo.valore, placeholder: 'valore', 'aria-label': 'Valore', style: { width: '120px' } });
  const per = h('select', { 'aria-label': 'Dividi per' });
  const esiti = h('div', {});
  const riempi = () => {
    const ev = catalogo.find((e) => e.nome === nome.value);
    const chiavi = (ev?.proprieta ?? []).map((p) => p.chiave);
    svuota(chiave); svuota(per);
    metti(chiave, h('option', { value: '' }, 'nessun filtro'), ...chiavi.map((k) => h('option', { value: k, selected: k === ultimo.chiave }, k)));
    metti(per, h('option', { value: '' }, 'non dividere'), ...chiavi.map((k) => h('option', { value: k, selected: k === ultimo.per }, k)));
  };
  nome.addEventListener('change', () => { ultimo.chiave = ''; ultimo.per = ''; riempi(); });
  const cerca = async () => {
    const x = { nome: nome.value, chiave: chiave.value, valore: valore.value, per: per.value };
    memoria.scrivi('analisi.evento', x);
    metti(svuota(esiti), caricamento());
    try {
      const r = await api.analisiEventi(app.id, { ...x, da: f.da, a: f.a });
      const ev = catalogo.find((e) => e.nome === x.nome);
      metti(svuota(esiti),
        h('div', { class: 'griglia g4' }, kpi('Eventi', num(r.quanti)), kpi('Telefoni', num(r.telefoni)),
          kpi('Per telefono', r.telefoni ? (r.quanti / r.telefoni).toLocaleString('it-IT', { maximumFractionDigits: 1 }) : '—'),
          kpi('Proprietà', num((ev?.proprieta ?? []).length), (ev?.proprieta ?? []).slice(0, 4).map((p) => p.chiave).join(', '))),
        x.per ? tabella([
          { titolo: x.per, cella: (v) => h('strong', {}, v.valore) },
          { titolo: 'Eventi', num: true, cella: (v) => num(v.n) },
          { titolo: 'Quota', num: true, cella: (v) => perc(v.n / (r.quanti || 1)) },
          { titolo: 'Telefoni', num: true, cella: (v) => num(v.telefoni) },
        ], r.per ?? []) : null,
        h('details', {}, h('summary', {}, `Gli ultimi ${num((r.ultimi ?? []).length)}`), tabella([
          { titolo: 'Quando', cella: (e) => data(e.quando) },
          { titolo: 'Giocatore', cella: (e) => (e.profilo_id ? h('a', { href: `#/giocatori/${app.id}/${e.profilo_id}` }, e.giocatore ?? '—') : '—') },
          { titolo: 'Versione', cella: (e) => h('span', { class: 'mono' }, e.versione ?? '—') },
          { titolo: 'Proprietà', cella: (e) => h('span', { class: 'mono', style: { fontSize: '12px', overflowWrap: 'anywhere' } }, JSON.stringify(e.dati ?? {})) },
        ], r.ultimi ?? [])));
    } catch (e) { metti(svuota(esiti), erroreBox(e)); }
  };
  riempi();
  void cerca();
  return scheda('Esplora eventi', h('div', {},
    h('form', { class: 'filtri', onsubmit: (e) => { e.preventDefault(); void cerca(); } },
      h('label', { class: 'campo' }, h('span', {}, 'Evento'), nome),
      h('label', { class: 'campo' }, h('span', {}, 'Solo dove'), chiave),
      h('label', { class: 'campo' }, h('span', {}, '='), valore),
      h('label', { class: 'campo' }, h('span', {}, 'Dividi per'), per),
      h('button', { class: 'bottone primario', type: 'submit' }, 'Mostra')),
    esiti), { nota: 'Ogni evento che il gioco manda, con le sue proprietà. Il filtro vuole il valore esatto (true, scopa, 1.0.9…).' });
}

/* ------------------------------------------------------------ il percorso a passi scelti */

function imbuto(app, f, catalogo) {
  const passi = h('textarea', { rows: 5, 'aria-label': 'Passi', style: { fontFamily: 'var(--mono, monospace)' } }, memoria.leggi('analisi.passi', ONBOARDING).join('\n'));
  const esiti = h('div', {});
  const calcola = async () => {
    const lista = passi.value.split('\n').map((x) => x.trim()).filter(Boolean);
    memoria.scrivi('analisi.passi', lista);
    metti(svuota(esiti), caricamento());
    try {
      const r = await api.analisiImbuto(app.id, lista, f.da, f.a);
      const base = r[0]?.quanti || 0;
      metti(svuota(esiti), tabella([
        { titolo: 'Passo', cella: (p, i) => h('span', { class: 'mono' }, p.passo) },
        { titolo: 'Telefoni', num: true, cella: (p) => num(p.quanti) },
        { titolo: 'Dal primo', num: true, cella: (p) => (base ? perc(p.quanti / base) : '—') },
        { titolo: '', cella: (p) => h('div', { style: { background: 'var(--cielo)', height: '10px', borderRadius: '5px', width: `${base ? Math.max(2, Math.round((p.quanti / base) * 260)) : 2}px` } }) },
      ], r.map((p, i) => ({ ...p, i }))));
    } catch (e) { metti(svuota(esiti), erroreBox(e)); }
  };
  void calcola();
  return scheda('Percorso a passi scelti', h('div', { style: { display: 'grid', gridTemplateColumns: 'minmax(220px, 320px) 1fr', gap: '16px' } },
    h('div', { style: { display: 'grid', gap: '8px', alignContent: 'start' } },
      h('span', {}, 'Un passo per riga: un evento, o evento:proprietà=valore.'), passi,
      h('div', { style: { display: 'flex', gap: '8px', flexWrap: 'wrap' } },
        h('button', { class: 'bottone primario', onclick: () => void calcola() }, 'Calcola'),
        h('button', { class: 'bottone', onclick: () => { passi.value = ONBOARDING.join('\n'); void calcola(); } }, 'Il primo giorno')),
      h('span', { style: { color: 'var(--ink3)', fontSize: '12px' } }, `Eventi: ${catalogo.slice(0, 14).map((e) => e.nome).join(', ')}`)),
    esiti), { nota: 'Telefoni nati nel periodo; un passo conta se viene dopo il precedente. Lo stesso evento due volte vuol dire la seconda volta.' });
}

/* ------------------------------------------------------------ le coorti */

function coorti(app, f) {
  const per = h('select', { 'aria-label': 'Coorti per' }, [['giorno', 'giorno di nascita'], ['versione', 'versione'], ['piattaforma', 'piattaforma'], ['provenienza', 'provenienza'],
    ['primo_risultato', 'primo risultato (1º giorno)'], ['tipo', 'tipo di giocatore (1º giorno)']]
    .map(([k, t]) => h('option', { value: k, selected: k === memoria.leggi('analisi.coorti', 'giorno') }, t)));
  const esiti = h('div', {});
  const quota = (x) => (x && x[1] ? h('span', { title: `${x[0]} su ${x[1]}` }, perc(x[0] / x[1])) : h('span', { style: { color: 'var(--ink3)' } }, '…'));
  const calcola = async () => {
    memoria.scrivi('analisi.coorti', per.value);
    metti(svuota(esiti), caricamento());
    try {
      const r = await api.analisiCoorti(app.id, per.value, f.da, f.a);
      metti(svuota(esiti), tabella([
        { titolo: per.options[per.selectedIndex].text, cella: (c) => h('strong', {}, c.gruppo) },
        { titolo: 'Telefoni', num: true, cella: (c) => num(c.quanti) },
        ...['d1', 'd3', 'd7', 'd14', 'd30'].map((k) => ({ titolo: k.toUpperCase(), num: true, cella: (c) => quota(c[k]) })),
        { titolo: 'Partite a testa', num: true, cella: (c) => String(c.partite ?? 0).replace('.', ',') },
        { titolo: 'Pagano', num: true, cella: (c) => num(c.paganti) },
      ], r, { vuoto: 'Nessun telefono nato nel periodo.' }));
    } catch (e) { metti(svuota(esiti), erroreBox(e)); }
  };
  per.addEventListener('change', () => void calcola());
  void calcola();
  return scheda('Coorti', h('div', {}, h('div', { class: 'filtri' }, h('label', { class: 'campo' }, h('span', {}, 'Raggruppa per'), per)), esiti),
    { nota: 'D1 = tornati il giorno dopo la nascita, e così via. «…» = troppo presto per saperlo. Passa il mouse su una percentuale per vedere quanti su quanti. '
      + 'Primo risultato e tipo guardano solo il giorno della nascita: la prima partita vera (non la lezione) vinta, persa o pari; online, contro il computer, solo la lezione o niente.' });
}
