/**
 * NEGOZIO E OFFERTE (Control Center fase 2, blocco B9, §33–34, §22)
 * =================================================================
 *
 * Quello che si cambia senza una versione nuova: i prezzi **in gemme e in
 * monete** (pacchi di monete, giorni senza pubblicità, Pass, salvadanaio,
 * Seconda chiave, missioni nuove), cosa c'è nel pacchetto di benvenuto, e a chi
 * vanno le tre offerte in cima al Negozio (accesa o spenta, e la soglia).
 *
 * Quello che **non** si cambia da qui: i prezzi in euro e i prodotti nuovi in
 * euro. Stanno nella Play Console, e un prodotto nuovo vuole anche il codice
 * che lo consegna; qui si vedono, con quanti se ne sono venduti.
 *
 * Ogni modifica è critica (§10): verifica dei limiti, rubinetto (le missioni
 * nuove più economiche regalano di più), codice e dieci minuti annullabili.
 */
import * as api from '../api.js';
import { h, scheda, tabella, pill, num as numero, finestra, confermaConMotivo, avvisa, erroreBox, nonDisponibile } from '../ui.js';

const OFFERTE = {
  starter: { nome: 'Pacchetto di benvenuto', soglia: 'partite', dice: 'da quante partite giocate' },
  torneo: { nome: 'Gemme per il torneo', soglia: 'gemmeSotto', dice: 'dentro a un torneo, con meno di tante gemme' },
  club: { nome: 'Il Club', soglia: 'partite', dice: 'da quante partite giocate' },
};

export async function disegna(ctx) {
  ctx.ricordaRecente('Negozio');
  const app = ctx.app ?? ctx.apps.find((a) => api.sa(a, 'negozio.leggi'));
  if (!app || !api.sa(app, 'negozio.leggi')) return [nonDisponibile('Negozio', 'nessun gioco espone ancora il negozio (`negozio.leggi`).')];
  let n; let attuale;
  try { [n, attuale] = await Promise.all([api.negozioLeggi(app.id), api.configLeggi(app.id)]); } catch (e) { return [erroreBox(e)]; }

  const b = JSON.parse(JSON.stringify(n.inUso));
  const L = n.limiti;
  const err = h('div', { class: 'errore-testo', role: 'alert' });
  const campo = (oggetto, chiave, [min, max], passo = 1, larghezza = '90px') => h('input', {
    type: 'number', step: passo, min, max, value: oggetto[chiave], style: { width: larghezza },
    oninput: (e) => { oggetto[chiave] = Number(e.target.value); },
  });
  const casa = (v, c) => (v === c ? '' : h('span', { class: 'piccolo', style: { opacity: 0.7 } }, ` (casa ${numero(c)})`));

  const proponi = async (negozio, cosa) => {
    err.textContent = '';
    const r = await confermaConMotivo({ titolo: 'Proponi il negozio', tasto: 'Proponi', testo: `${cosa} È un'operazione critica: verifica, rubinetto, codice e dieci minuti.` });
    if (!r) return;
    const valori = { ...(attuale.valori ?? {}) };
    if (negozio) valori.negozio = negozio; else delete valori.negozio;
    const invia = (forza) => api.configProponi(app.id, { valori, portata: { livello: 'app', valore: null }, motivo: r.motivo, forza });
    try {
      let res;
      try { res = await invia(false); } catch (x) {
        if (x.codice !== 'rubinetto') throw x;
        const rb = x.dati?.rubinetto ?? {};
        const ok = await finestra({
          titolo: 'Il rubinetto non regge',
          corpo: [h('p', {}, `Con questi prezzi, al locale peggiore (${rb.tavolo ?? '?'}) si regalano ${rb.monete ?? '?'} monete al giorno contro un tetto di ${rb.tetto ?? '?'} (${Math.round((rb.quota ?? 0) * 100)}%).`)],
          tasti: [{ testo: 'Torna a correggere', risposta: false }, { testo: 'Forza (va in approvazione)', classe: 'pericolo', risposta: true }],
        });
        if (!ok) return;
        res = await invia(true);
      }
      avvisa(res?.approvazione ? `Negozio in approvazione: ${res.approvazione.stato}` : 'Negozio proposto');
      ctx.vai(`#/negozio?${Date.now()}`);
    } catch (x) { err.textContent = x.message; }
  };

  const cambio = (p) => (p.gemme > 0 ? Math.round(p.monete / p.gemme) : 0);

  return [
    h('div', { class: 'avviso ambra' }, h('span', { class: 'ico' }, '⚠'),
      h('div', {}, h('strong', {}, 'Prezzi veri, giocatori veri. '), 'Ogni modifica è critica e passa dal rubinetto. Il Negozio del gioco legge gli stessi numeri della cassa: il prezzo mostrato è quello che si paga. Le offerte non hanno mai finte scadenze né finti sconti (F-110).')),
    scheda('Monete in cambio di gemme', tabella([
      { titolo: 'Taglio', cella: ({ i }) => String(i + 1) },
      { titolo: 'Monete', cella: ({ p, i }) => h('span', {}, campo(p, 'monete', L.monete, 100, '110px'), casa(p.monete, n.diCasa.pacchiMonete[i].monete)) },
      { titolo: 'Gemme', cella: ({ p, i }) => h('span', {}, campo(p, 'gemme', L.gemmePacco), casa(p.gemme, n.diCasa.pacchiMonete[i].gemme)) },
      { titolo: 'Monete a gemma (di casa)', cella: ({ i }) => String(cambio(n.diCasa.pacchiMonete[i])) },
    ], b.pacchiMonete.map((p, i) => ({ p, i }))), { nota: 'Sei tagli, monete crescenti, e un taglio più grosso non può dare meno monete a gemma di quello sotto.', azioni: [pill(n.dalPannello ? 'pannello' : 'di casa', n.dalPannello ? 'blu' : '')] }),
    scheda('Prezzi in gemme e monete', h('div', { class: 'filtri' },
      ...b.noAds.map((_, i) => h('label', { class: 'campo' }, h('span', {}, `Senza pubblicità ${n.noAdsGiorni[i]} giorni (gemme)`), campo(b.noAds, i, L.noAds))),
      h('label', { class: 'campo' }, h('span', {}, 'Pass Premium (gemme)'), campo(b.pass, 'gemme', L.passGemme)),
      h('label', { class: 'campo' }, h('span', {}, 'Pass Premium (monete)'), campo(b.pass, 'monete', L.passMonete, 500, '110px')),
      h('label', { class: 'campo' }, h('span', {}, 'Rompere il salvadanaio (gemme)'), campo(b.prezzi, 'salvadanaio', L.salvadanaio)),
      h('label', { class: 'campo' }, h('span', {}, 'Seconda chiave (gemme)'), campo(b.prezzi, 'dueBauli', L.dueBauli)),
      h('label', { class: 'campo' }, h('span', {}, 'Tre missioni nuove (gemme)'), campo(b.prezzi, 'missioniNuove', L.missioniNuove))),
    { nota: `Il Pass in gemme resta sopra il pacchetto da 4,49 € (${n.pacchiGemme[2]?.gemme} gemme): se no pagarlo in gemme è uno sconto. Le missioni nuove sono una porta sul rubinetto: più economiche, più regali.` }),
    scheda('Pacchetto di benvenuto (2,99 €)', h('div', { class: 'filtri' },
      h('label', { class: 'campo' }, h('span', {}, 'Gemme'), campo(b.starter, 'gemme', L.starterGemme)),
      h('label', { class: 'campo' }, h('span', {}, 'Monete'), campo(b.starter, 'monete', L.starterMonete, 500, '110px'))),
    { nota: 'Il prezzo in euro e il dorso del Golfo restano quelli. Vale per chi lo compra da adesso.' }),
    scheda('Offerte in cima al Negozio', tabella([
      { titolo: 'Offerta', cella: ([k]) => OFFERTE[k].nome },
      { titolo: 'Accesa', cella: ([, o]) => h('input', { type: 'checkbox', checked: o.accesa, onchange: (e) => { o.accesa = e.target.checked; } }) },
      { titolo: 'A chi', cella: ([k]) => OFFERTE[k].dice },
      { titolo: 'Soglia', cella: ([k, o]) => campo(o, OFFERTE[k].soglia, OFFERTE[k].soglia === 'gemmeSotto' ? L.gemmeSotto : (k === 'club' ? L.partiteClub : L.partiteStarter)) },
    ], Object.entries(b.offerte)), { nota: 'Si mostra la prima accesa che ha senso, in quest\'ordine. Spenta vuol dire niente riquadro, mai un\'altra al suo posto.' }),
    scheda(null, h('div', { style: { display: 'flex', gap: '10px', flexWrap: 'wrap' } },
      h('button', { class: 'bottone primario', onclick: () => void proponi(b, 'Prezzi, pacchetto di benvenuto e offerte come scritti qui.') }, 'Proponi il negozio'),
      h('button', { class: 'bottone', onclick: () => void proponi(null, 'Si torna al negozio di casa (quello scritto nell\'app).') }, 'Torna al negozio di casa'),
      err)),
    scheda('Prodotti in euro', tabella([
      { titolo: 'Prodotto', cella: (p) => p.nome },
      { titolo: 'ID nella Play Console', cella: (p) => h('code', {}, p.id) },
      { titolo: 'Tipo', cella: (p) => ({ consumabile: 'si ricompra', unaVolta: 'una volta', abbonamento: 'abbonamento' }[p.tipo] ?? p.tipo) },
      { titolo: 'Prezzo', cella: (p) => p.euro },
      { titolo: 'Venduti', cella: (p) => numero(p.venduti) },
      { titolo: 'Rimborsati o altro', cella: (p) => (p.altri ? numero(p.altri) : '—') },
    ], n.prodotti), { nota: 'Prezzi e prodotti in euro si cambiano nella Play Console; un prodotto nuovo vuole anche una versione dell\'app che lo consegni.' }),
  ];
}
