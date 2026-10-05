/**
 * BAULI E REGALI (Control Center fase 2, blocco B6, §18–20)
 * =========================================================
 *
 * Il listino: cosa c'è nei bauli (monete in gettoni del tavolo dove si vincono,
 * gemme, probabilità di un pezzo, ore di apertura — da cui il prezzo in gemme),
 * con che probabilità esce ogni grado all'Osteria e all'Olimpo, i sette regali
 * della serie e i tre scalini del rientro.
 *
 * È la parte più pericolosa per l'economia: ogni modifica passa dalla verifica,
 * dal **rubinetto** (blocca se si regala oltre il tetto) e dall'approvazione
 * critica. Nel gioco la schermata delle probabilità legge gli stessi numeri
 * che usa la cassa: quello che si mostra è quello che esce.
 */
import * as api from '../api.js';
import { h, scheda, tabella, pill, finestra, confermaConMotivo, avvisa, erroreBox, nonDisponibile } from '../ui.js';

const NOMI = { legno: 'Legno', argento: 'Argento', oro: 'Oro', leggendario: 'Leggendario' };

export async function disegna(ctx) {
  ctx.ricordaRecente('Bauli e regali');
  const app = ctx.app ?? ctx.apps.find((a) => api.sa(a, 'listino.leggi'));
  if (!app || !api.sa(app, 'listino.leggi')) return [nonDisponibile('Bauli e regali', 'nessun gioco espone ancora il listino (`listino.leggi`).')];
  let l; let attuale;
  try { [l, attuale] = await Promise.all([api.listinoLeggi(app.id), api.configLeggi(app.id)]); } catch (e) { return [erroreBox(e)]; }

  const b = JSON.parse(JSON.stringify(l.inUso));
  const err = h('div', { class: 'errore-testo', role: 'alert' });
  const num = (oggetto, chiave, passo = 1, larghezza = '72px') => h('input', {
    type: 'number', step: passo, value: oggetto[chiave], style: { width: larghezza },
    oninput: (e) => { oggetto[chiave] = Number(e.target.value); },
  });

  const proponi = async (listino, cosa) => {
    err.textContent = '';
    const r = await confermaConMotivo({ titolo: 'Proponi il listino', tasto: 'Proponi', testo: `${cosa} È un'operazione critica: verifica, rubinetto, codice e dieci minuti.` });
    if (!r) return;
    const valori = { ...(attuale.valori ?? {}) };
    if (listino) valori.listino = listino; else delete valori.listino;
    const invia = (forza) => api.configProponi(app.id, { valori, portata: { livello: 'app', valore: null }, motivo: r.motivo, forza });
    try {
      let res;
      try { res = await invia(false); } catch (x) {
        if (x.codice !== 'rubinetto') throw x;
        const rb = x.dati?.rubinetto ?? {};
        const ok = await finestra({
          titolo: 'Il rubinetto non regge',
          corpo: [h('p', {}, `Con questo listino, al locale peggiore (${rb.tavolo ?? '?'}) si regalano ${rb.monete ?? '?'} monete al giorno contro un tetto di ${rb.tetto ?? '?'} (${Math.round((rb.quota ?? 0) * 100)}%) e ${rb.gemme ?? '?'} gemme contro ${rb.tettoGemme ?? '?'}.`)],
          tasti: [{ testo: 'Torna a correggere', risposta: false }, { testo: 'Forza (va in approvazione)', classe: 'pericolo', risposta: true }],
        });
        if (!ok) return;
        res = await invia(true);
      }
      avvisa(res?.approvazione ? `Listino in approvazione: ${res.approvazione.stato}` : 'Listino proposto');
      ctx.vai(`#/listino?${Date.now()}`);
    } catch (x) { err.textContent = x.message; }
  };

  const listinoDaInviare = () => ({
    bauli: Object.fromEntries(Object.keys(NOMI).map((k) => [k, { gettoni: b.bauli[k].gettoni, gemme: b.bauli[k].gemme, pezzo: b.bauli[k].pezzo, ore: b.bauli[k].ore }])),
    pesi: b.pesi, regali: b.regali, rientro: b.rientro.map((x) => ({ monete: x.monete, baule: x.baule })),
  });
  const somma = (i) => Object.keys(NOMI).reduce((s, k) => s + Number(b.pesi[k][i]), 0);

  return [
    h('div', { class: 'avviso ambra' }, h('span', { class: 'ico' }, '⚠'),
      h('div', {}, h('strong', {}, 'La parte più delicata dell\'economia. '), 'Ogni modifica passa dal rubinetto e dall\'approvazione. Le probabilità che il gioco mostra sono quelle che la cassa usa: cambiano insieme.')),
    scheda('I bauli', tabella([
      { titolo: 'Baule', cella: ([k]) => NOMI[k] },
      { titolo: 'Monete (gettoni) min–max', cella: ([, x]) => h('span', {}, num(x.gettoni, 0, 0.1), ' – ', num(x.gettoni, 1, 0.1)) },
      { titolo: 'Gemme min–max', cella: ([, x]) => h('span', {}, num(x.gemme, 0), ' – ', num(x.gemme, 1)) },
      { titolo: 'Pezzo (0–1)', cella: ([, x]) => num(x, 'pezzo', 0.01) },
      { titolo: 'Ore', cella: ([, x]) => num(x, 'ore', 0.5) },
      { titolo: 'Prezzo in gemme', cella: ([, x]) => String(x.prezzoGemme) },
    ], Object.entries(b.bauli)), { nota: 'Le monete sono in gettoni del tavolo dove il baule si vince. Il prezzo per aprirlo subito viene dalle ore.', azioni: [pill(l.dalPannello ? 'pannello' : 'di casa', l.dalPannello ? 'blu' : '')] }),
    scheda('Che grado esce', tabella([
      { titolo: 'Grado', cella: (k) => NOMI[k] },
      { titolo: 'All\'Osteria (%)', cella: (k) => num(b.pesi[k], 0, 1) },
      { titolo: 'All\'Olimpo (%)', cella: (k) => num(b.pesi[k], 1, 1) },
    ], Object.keys(NOMI)), { nota: `Ogni colonna deve fare 100 (adesso: ${somma(0)} e ${somma(1)}). Fra i locali in mezzo si va per gradi.` }),
    scheda('I regali della serie (7 giorni)', h('div', { class: 'filtri' }, b.regali.map((_, i) => h('label', { class: 'campo' }, h('span', {}, `Giorno ${i + 1}`), num(b.regali, i))))),
    scheda('Il rientro', tabella([
      { titolo: 'Dopo', cella: (x) => `${x.giorni} giorni` },
      { titolo: 'Monete', cella: (x) => num(x, 'monete', 5) },
      { titolo: 'Baule', cella: (x) => h('select', { onchange: (e) => { x.baule = e.target.value || null; } },
        h('option', { value: '', selected: !x.baule }, 'nessuno'), Object.keys(NOMI).map((k) => h('option', { value: k, selected: x.baule === k }, NOMI[k]))) },
    ], b.rientro)),
    scheda(null, h('div', { style: { display: 'flex', gap: '10px', flexWrap: 'wrap' } },
      h('button', { class: 'bottone primario', onclick: () => void proponi(listinoDaInviare(), 'Bauli, probabilità, regali e rientro come scritti qui.') }, 'Proponi il listino'),
      h('button', { class: 'bottone', onclick: () => void proponi(null, 'Si torna al listino di casa (quello scritto nell\'app).') }, 'Torna al listino di casa'),
      err)),
  ];
}
