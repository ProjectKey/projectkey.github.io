/**
 * PARTITE (§29, §32)
 * ==================
 *
 * «Mi avete fatto perdere, avevo preso il settebello»: si cerca la partita, e
 * la sua cronologia dice cosa ha deciso l'arbitro, mossa per mossa, con le
 * disconnessioni e i premi pagati.
 */
import * as api from '../api.js';
import { h, svuota, metti, scheda, tabella, pill, kpi, num, data, ora, giorniFa, memoria, caricamento, erroreBox, nonDisponibile } from '../ui.js';

export async function disegna(ctx) {
  const [appId, id] = ctx.param;
  if (appId && id) {
    const app = ctx.apps.find((a) => a.id === appId);
    if (!app) return erroreBox(new Error(`App sconosciuta: ${appId}`));
    return schedaPartita(ctx, app, id);
  }
  ctx.ricordaRecente('Partite');
  const bersagli = (ctx.app ? [ctx.app] : ctx.apps).filter((a) => api.sa(a, 'cercaPartite'));
  if (bersagli.length === 0) return nonDisponibile('Ricerca partite', 'l\'adattatore di questa app non espone `partite.cerca`.');

  const f = memoria.leggi('partite.filtri', { q: '', da: giorniFa(7), a: giorniFa(0) });
  const q = h('input', { type: 'search', value: f.q, placeholder: 'ID partita o ID giocatore', 'aria-label': 'ID partita o giocatore', style: { flex: 1, minWidth: '200px' } });
  const da = h('input', { type: 'date', value: f.da, 'aria-label': 'Dal' });
  const a = h('input', { type: 'date', value: f.a, 'aria-label': 'Al' });
  const esiti = h('div', {});
  const cerca = async () => {
    const filtri = { q: q.value.trim(), da: da.value, a: a.value };
    memoria.scrivi('partite.filtri', filtri);
    metti(svuota(esiti), caricamento());
    const righe = [];
    const errori = [];
    await Promise.all(bersagli.map(async (app) => {
      try { for (const p of await api.cercaPartite(app.id, filtri)) righe.push({ ...p, app }); } catch (e) { errori.push(`${app.nome}: ${e.message}`); }
    }));
    righe.sort((x, y) => String(y.inizio).localeCompare(String(x.inizio)));
    metti(svuota(esiti), errori.length ? erroreBox(new Error(errori.join(' · '))) : null, scheda(`${righe.length} partite`, tabella([
      { titolo: 'Inizio', cella: (p) => data(p.inizio) },
      { titolo: 'Gioco', cella: (p) => `${p.gioco ?? p.app.nome}${p.modo ? ` · ${p.modo}` : ''}` },
      { titolo: 'Giocatori', cella: (p) => (p.giocatori ?? []).map((g) => g.bot ? pill(g.nome, '') : pill(g.nome, 'viola')) },
      { titolo: 'Risultato', chiave: 'risultato' },
      { titolo: 'Stato', cella: (p) => pill(p.stato ?? '—', p.stato === 'in corso' ? 'ambra' : '') },
      { titolo: 'ID', cella: (p) => h('span', { class: 'mono' }, p.id) },
    ], righe, { vuoto: 'Nessuna partita in questo periodo.', clic: (p) => ctx.vai(`#/partite/${p.app.id}/${p.id}`) })));
  };
  void cerca();
  return [
    scheda(null, h('form', { class: 'filtri', onsubmit: (e) => { e.preventDefault(); void cerca(); } },
      q, h('label', { class: 'campo' }, h('span', {}, 'Dal'), da), h('label', { class: 'campo' }, h('span', {}, 'Al'), a),
      h('button', { class: 'bottone primario', type: 'submit' }, 'Cerca'))),
    esiti,
  ];
}

async function schedaPartita(ctx, app, id) {
  if (!api.sa(app, 'partita')) return nonDisponibile('Scheda partita', `${app.nome} non espone ancora \`partite.scheda\`.`);
  const p = await api.partita(app.id, id);
  if (!p) return erroreBox(new Error('Partita non trovata'));
  ctx.ricordaRecente(`Partita ${id.slice(0, 8)}`);
  ctx.briciole([{ testo: app.nome }, { testo: 'Partite', hash: '#/partite' }, { testo: id.slice(0, 13) }]);
  document.querySelector('.titolo-pagina h1').textContent = `Partita ${id.slice(0, 8)}…`;
  const durata = p.inizio && p.fine ? Math.round((new Date(p.fine) - new Date(p.inizio)) / 1000) : null;
  return [
    h('div', { class: 'griglia g4' },
      kpi('Gioco', p.gioco ?? '—', `${p.modo ?? ''}${p.tavolo ? ` · ${p.tavolo}` : ''}`),
      kpi('Durata', durata === null ? '—' : `${Math.floor(durata / 60)}:${String(durata % 60).padStart(2, '0')}`, `${data(p.inizio)} → ${p.fine ? ora(p.fine) : 'in corso'}`),
      kpi('Stato', p.stato ?? '—'),
      kpi('Disconnessioni', num((p.disconnessioni ?? []).length))),
    h('div', { class: 'griglia g2' },
      scheda('Giocatori e premi', tabella([
        { titolo: 'Giocatore', cella: (g) => g.id && !g.bot ? h('a', { href: `#/giocatori/${app.id}/${g.id}` }, g.nome) : `${g.nome}${g.bot ? ' (bot)' : ''}` },
        { titolo: 'Punti', num: true, cella: (g) => num(g.punti) },
        { titolo: 'Premio', num: true, cella: (g) => num(g.premio) },
      ], p.giocatori ?? [])),
      scheda('Disconnessioni (§32)', tabella([
        { titolo: 'Quando', cella: (d) => ora(d.quando) }, { titolo: 'Chi', chiave: 'chi' },
        { titolo: 'Fuori per', num: true, cella: (d) => d.durata_s === undefined ? '—' : `${d.durata_s} s` },
      ], p.disconnessioni ?? [], { vuoto: 'Nessuna disconnessione.' }))),
    scheda('Cronologia della partita', h('ol', { class: 'linea-tempo' },
      (p.timeline ?? []).map((e) => h('li', {}, h('span', { class: 'ora' }, ora(e.quando)),
        h('span', { class: `punto${e.chi === 'arbitro' ? ' admin' : ' partita'}` }), h('span', {}, h('strong', {}, `${e.chi}: `), e.testo)))),
    { nota: 'quello che ha deciso il server, in ordine' }),
    p.premi ? scheda('Premi pagati', h('pre', { class: 'mono' }, JSON.stringify(p.premi, null, 2))) : null,
    h('p', { class: 'mono', style: { color: 'var(--ink3)', margin: 0, overflowWrap: 'anywhere' } }, `ID ${id}`),
  ];
}
