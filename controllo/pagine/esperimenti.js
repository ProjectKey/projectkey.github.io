/**
 * ESPERIMENTI (Control Center, blocco C6, §45 — 6 ottobre 2026)
 * ============================================================
 *
 * Un test A/B: una quota di telefoni prende la **variante**, gli altri sono il
 * **controllo**. Il gruppo lo decide l'identificativo dell'installazione, ed è
 * sempre lo stesso per lo stesso telefono. I risultati confrontano i due
 * gruppi dal momento in cui ogni telefono è entrato: tornati il giorno dopo e
 * la settimana dopo, aperture, partite e spot al giorno, acquisti.
 *
 * **Cosa si può provare**: la frequenza della pubblicità e le offerte (accese,
 * soglie). Premi e prezzi no: li paga la cassa con una configurazione per
 * tutti, e un telefono nella variante si vedrebbe promettere quello che la
 * cassa non dà (ARCHITETTURA.md, C6). Creare e fermare un esperimento è
 * un'operazione critica, come ogni modifica della configurazione che conta.
 */
import * as api from '../api.js';
import { h, scheda, tabella, pill, kpi, num, perc, data, erroreBox, nonDisponibile, avvisa, confermaConMotivo, finestra } from '../ui.js';

const ANNUNCI = {
  maniPerAnnuncio: ['Spot ogni quante mani', 1], minutiFraAnnunci: ['Minuti almeno fra due spot', 1],
  maniFranchigia: ['Mani senza spot a inizio sessione', 1], maxAlGiorno: ['Spot al massimo al giorno', 1],
};
const OFFERTE = { starter: 'Pacchetto di benvenuto', torneo: 'Gemme per il torneo', club: 'Il Club' };

export async function disegna(ctx) {
  ctx.ricordaRecente('Esperimenti');
  const app = ctx.app ?? ctx.apps.find((a) => api.sa(a, 'esperimenti.risultati'));
  if (!app || !api.sa(app, 'esperimenti.risultati')) return [nonDisponibile('Esperimenti', 'nessun gioco espone ancora gli esperimenti (`esperimenti.risultati`).')];
  let attuale;
  try { attuale = await api.configLeggi(app.id); } catch (e) { return [erroreBox(e)]; }
  const esperimenti = Array.isArray(attuale.valori?.esperimenti) ? attuale.valori.esperimenti : [];
  const risultati = await Promise.all(esperimenti.map((e) => api.esperimentiRisultati(app.id, e.id).catch((x) => ({ errore: x }))));

  const salva = async (nuovi, cosa) => {
    const r = await confermaConMotivo({ titolo: 'Esperimenti', tasto: 'Proponi', testo: `${cosa} È un'operazione critica: codice e dieci minuti annullabili.` });
    if (!r) return;
    const valori = { ...(attuale.valori ?? {}), esperimenti: nuovi };
    if (!nuovi.length) delete valori.esperimenti;
    try {
      const res = await api.configProponi(app.id, { valori, portata: { livello: 'app', valore: null }, motivo: r.motivo });
      avvisa(res?.approvazione ? `In approvazione: ${res.approvazione.stato}` : 'Proposto');
      ctx.vai(`#/esperimenti?${Date.now()}`);
    } catch (x) { avvisa(x.message, true); }
  };

  return [
    ...esperimenti.map((e, i) => blocco(e, risultati[i], () => salva(esperimenti.filter((x) => x.id !== e.id), `Si ferma «${e.nome}»: tutti tornano al controllo. I risultati restano.`))),
    esperimenti.length ? null : scheda(null, h('p', {}, 'Nessun esperimento acceso.')),
    esperimenti.length >= 3 ? scheda(null, h('p', {}, 'Ce ne sono già tre: fermane uno per crearne un altro.'))
      : scheda(`Nuovo esperimento · ${app.nome}`, modulo(attuale, esperimenti, salva), {
        nota: 'Un esperimento si legge dopo almeno una settimana e con qualche decina di telefoni per gruppo: con pochi, la differenza è rumore.',
      }),
  ].filter(Boolean);
}

function blocco(e, r, ferma) {
  const g = r?.gruppi ?? {};
  const v = g.variante ?? {}; const c = g.controllo ?? {};
  const quota = (x) => (x && x[1] ? `${perc(x[0] / x[1])} (${x[0]}/${x[1]})` : '…');
  const riga = (nome, f) => ({ nome, v: f(v), c: f(c) });
  const cambia = Object.entries(e.variante ?? {}).flatMap(([k, x]) => (k === 'annunci'
    ? Object.entries(x).map(([kk, n]) => `${ANNUNCI[kk]?.[0] ?? kk}: ${n}`)
    : k === 'offerte' ? Object.entries(x).map(([kk, o]) => `${OFFERTE[kk] ?? kk}: ${o.accesa === false ? 'spenta' : 'accesa'}${o.partite !== undefined ? `, da ${o.partite} partite` : ''}${o.gemmeSotto !== undefined ? `, sotto ${o.gemmeSotto} gemme` : ''}`)
      : [`${k}: cambiato`]));
  return scheda(e.nome, h('div', {},
    h('p', {}, pill(`${e.quota}% variante`, 'viola'), ' ', cambia.join(' · '), e.dal ? ` · dal ${data(e.dal)}` : '', e.al ? ` · al ${data(e.al)}` : ''),
    r?.errore ? erroreBox(r.errore) : tabella([
      { titolo: '', cella: (x) => h('strong', {}, x.nome) },
      { titolo: 'Variante', num: true, cella: (x) => x.v },
      { titolo: 'Controllo', num: true, cella: (x) => x.c },
    ], [
      riga('Telefoni entrati', (x) => num(x.telefoni ?? 0)),
      riga('Tornati il giorno dopo', (x) => quota(x.d1)),
      riga('Tornati dopo 7 giorni', (x) => quota(x.d7)),
      riga('Aperture al giorno', (x) => String(x.aperture_al_giorno ?? '—').replace('.', ',')),
      riga('Partite al giorno', (x) => String(x.partite_al_giorno ?? '—').replace('.', ',')),
      riga('Spot al giorno', (x) => String(x.spot_al_giorno ?? '—').replace('.', ',')),
      riga('Acquisti (paganti)', (x) => `${num(x.acquisti ?? 0)} (${num(x.paganti ?? 0)})`),
    ]),
    h('div', { style: { marginTop: '8px' } }, h('button', { class: 'bottone', onclick: ferma }, 'Ferma l\'esperimento'))),
  { nota: `id ${e.id} · i numeri contano ogni telefono dal momento in cui è entrato` });
}

function modulo(attuale, esperimenti, salva) {
  const cfg = attuale.effettiva ?? {};
  const nome = h('input', { type: 'text', maxlength: 60, placeholder: 'Uno spot ogni due mani invece di una', 'aria-label': 'Nome' });
  const quota = h('input', { type: 'number', min: 1, max: 99, value: 50, 'aria-label': 'Quota in variante', style: { width: '90px' } });
  const tipo = h('select', { 'aria-label': 'Cosa cambia' }, h('option', { value: 'annunci' }, 'La pubblicità'), h('option', { value: 'offerte' }, 'Le offerte'));
  const campiAnnunci = Object.entries(ANNUNCI).map(([k, [t]]) => {
    const i = h('input', { type: 'number', min: 0, placeholder: String(cfg.annunci?.[k] ?? ''), 'aria-label': t, style: { width: '110px' } });
    return { k, i, nodo: h('label', { class: 'campo' }, h('span', {}, `${t} (ora ${cfg.annunci?.[k] ?? '—'})`), i) };
  });
  const campiOfferte = Object.entries(OFFERTE).map(([k, t]) => {
    const c = h('input', { type: 'checkbox', checked: cfg.negozio?.offerte?.[k]?.accesa ?? true, 'aria-label': `${t} accesa` });
    return { k, c, nodo: h('label', { class: 'campo', style: { flexDirection: 'row', gap: '6px', alignItems: 'center' } }, c, h('span', {}, `${t} accesa nella variante`)) };
  });
  const boxA = h('div', { class: 'filtri' }, campiAnnunci.map((x) => x.nodo));
  const boxO = h('div', { class: 'filtri', hidden: true }, campiOfferte.map((x) => x.nodo));
  tipo.addEventListener('change', () => { boxA.hidden = tipo.value !== 'annunci'; boxO.hidden = tipo.value !== 'offerte'; });
  const al = h('input', { type: 'datetime-local', 'aria-label': 'Fino a' });
  const err = h('div', { class: 'errore-testo', role: 'alert' });
  const manda = (ev) => {
    ev.preventDefault();
    err.textContent = '';
    if (!nome.value.trim()) { err.textContent = 'Serve un nome.'; return; }
    const variante = {};
    if (tipo.value === 'annunci') {
      const a = Object.fromEntries(campiAnnunci.filter((x) => x.i.value !== '').map((x) => [x.k, Number(x.i.value)]));
      if (!Object.keys(a).length) { err.textContent = 'Scrivi almeno un valore diverso per la variante.'; return; }
      variante.annunci = a;
    } else {
      variante.offerte = Object.fromEntries(campiOfferte.map((x) => [x.k, { accesa: x.c.checked }]));
    }
    const base = nome.value.trim().toLowerCase().normalize('NFD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 24) || 'esp';
    let id = base; let n = 2;
    while (esperimenti.some((e) => e.id === id)) id = `${base}-${n++}`;
    const nuovo = { id, nome: nome.value.trim(), quota: Math.round(Number(quota.value) || 50), variante, dal: new Date().toISOString(), al: al.value ? new Date(al.value).toISOString() : null };
    void salva([...esperimenti, nuovo], `«${nuovo.nome}»: ${nuovo.quota}% dei telefoni nella variante.`);
  };
  return h('form', { style: { display: 'grid', gap: '10px' }, onsubmit: manda },
    h('div', { class: 'filtri' }, h('label', { class: 'campo', style: { flex: 1 } }, h('span', {}, 'Nome'), nome),
      h('label', { class: 'campo' }, h('span', {}, '% nella variante'), quota), h('label', { class: 'campo' }, h('span', {}, 'Cosa cambia'), tipo),
      h('label', { class: 'campo' }, h('span', {}, 'Fino a (facoltativo)'), al)),
    boxA, boxO, err, h('div', {}, h('button', { class: 'bottone primario', type: 'submit' }, 'Proponi')));
}
