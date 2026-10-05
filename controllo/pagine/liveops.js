/**
 * LIVE OPS (Control Center fase 2, blocco B2, §23–24)
 * ===================================================
 *
 * Gli eventi a tempo: «Monete doppie il venerdì», un weekend speciale. Un
 * evento è una **versione programmata della configurazione** (inizio e fine):
 * a inizio il pannello la mette in linea da solo, a fine torna com'era. Dentro
 * c'è la chiave `evento` (nome, moltiplicatore, fine), che il gioco legge.
 *
 * Il moltiplicatore vale solo per la vincita al tavolo e per le missioni, mai
 * per bauli, regali e acquisti, e non passa x2 (decisione di Giorgio, 5 ott
 * 2026). Un evento tocca l'economia, quindi è critico (§10): codice TOTP e
 * dieci minuti annullabili prima di partire. E siccome alza le monete, il conto
 * del rubinetto di solito non regge: la proposta va forzata, e lo si dice.
 */
import * as api from '../api.js';
import { h, scheda, tabella, kpi, pill, data, finestra, confermaConMotivo, avvisa, erroreBox, nonDisponibile } from '../ui.js';

const COLORE = { 'in linea': 'verde', programmata: 'blu', 'in approvazione': 'ambra', superata: '', fallita: 'rosso' };

export async function disegna(ctx) {
  ctx.ricordaRecente('Live Ops');
  const app = ctx.app ?? ctx.apps.find((a) => api.sa(a, 'config.verifica'));
  if (!app) return [nonDisponibile('Live Ops', 'nessun gioco sa ancora leggere gli eventi (`config.verifica`).')];
  if (!api.sa(app, 'config.verifica')) return [nonDisponibile(`Live Ops di ${app.nome}`, 'questo gioco non legge ancora gli eventi.')];

  let attuale; let versioni;
  try {
    [attuale, versioni] = await Promise.all([api.configLeggi(app.id), api.configVersioni(app.id).catch(() => [])]);
  } catch (e) { return [erroreBox(e)]; }
  const ora = Date.now();
  const eventi = versioni.filter((v) => v.valori?.evento?.nome);
  const inCorso = attuale.effettiva?.evento?.nome && (!attuale.effettiva.evento.fino || Date.parse(attuale.effettiva.evento.fino) > ora)
    ? attuale.effettiva.evento : null;

  return [
    h('div', { class: 'griglia g3' },
      kpi('Evento in corso', inCorso ? inCorso.nome : '—',
        inCorso ? `x${inCorso.moltiplicatoreMonete} su vincite e missioni${inCorso.fino ? `, fino al ${data(inCorso.fino)}` : ''}` : 'nessuno')),
    scheda(`Nuovo evento · ${app.nome}`, modulo(ctx, app, attuale), {
      nota: 'Moltiplica le monete della vincita al tavolo e delle missioni, per il periodo scelto. A fine evento la configurazione torna com\'era.',
    }),
    scheda('Eventi programmati e passati', tabella([
      { titolo: 'Evento', cella: (v) => v.valori.evento.nome },
      { titolo: 'Monete', cella: (v) => `x${v.valori.evento.moltiplicatoreMonete ?? 1}` },
      { titolo: 'Dal', cella: (v) => (v.inizio ? data(v.inizio) : 'subito') },
      { titolo: 'Al', cella: (v) => (v.fine ? data(v.fine) : '—') },
      { titolo: 'Stato', cella: (v) => pill(v.stato, COLORE[v.stato] ?? '') },
      { titolo: 'Da', cella: (v) => v.admin ?? '' },
    ], [...eventi].sort((x, y) => String(y.inizio ?? y.quando).localeCompare(String(x.inizio ?? x.quando))),
    { vuoto: 'Nessun evento ancora.' }), { nota: 'Annullare o ripristinare un evento si fa dalla pagina Configurazione, nello storico delle versioni.' }),
  ];
}

function modulo(ctx, app, attuale) {
  const nome = h('input', { type: 'text', value: 'Monete doppie', maxlength: 40, 'aria-label': 'Nome dell\'evento' });
  const molt = h('select', { 'aria-label': 'Moltiplicatore' }, h('option', { value: '2' }, 'x2'), h('option', { value: '1.5' }, 'x1,5'));
  const dal = h('input', { type: 'datetime-local', required: true, 'aria-label': 'Dal' });
  const al = h('input', { type: 'datetime-local', required: true, 'aria-label': 'Al' });
  const err = h('div', { class: 'errore-testo', role: 'alert' });

  const proponi = async (e) => {
    e.preventDefault();
    err.textContent = '';
    const inizio = dal.value ? new Date(dal.value) : null;
    const fine = al.value ? new Date(al.value) : null;
    if (!nome.value.trim()) { err.textContent = 'Serve un nome: è quello che il giocatore legge in home.'; return; }
    if (!inizio || !fine || !(fine > inizio)) { err.textContent = 'Inizio e fine, con la fine dopo l\'inizio.'; return; }
    if (fine - inizio > 7 * 86_400_000) { err.textContent = 'Un evento dura al massimo sette giorni.'; return; }
    if (fine <= new Date()) { err.textContent = 'La fine è già passata.'; return; }
    const r = await confermaConMotivo({
      titolo: `Programma «${nome.value.trim()}»`, tasto: 'Programma',
      testo: `Dal ${data(inizio.toISOString())} al ${data(fine.toISOString())}, vincite e missioni x${molt.value.replace('.', ',')}. È un\'operazione critica: serve il codice e parte dopo dieci minuti, annullabile.`,
    });
    if (!r) return;
    const valori = { ...(attuale.valori ?? {}), evento: { nome: nome.value.trim(), moltiplicatoreMonete: Number(molt.value), fino: fine.toISOString() } };
    const invia = (forza) => api.configProponi(app.id, {
      valori, portata: { livello: 'app', valore: null }, inizio: inizio.toISOString(), fine: fine.toISOString(), motivo: r.motivo, forza,
    });
    try {
      let res;
      try { res = await invia(false); } catch (x) {
        if (x.codice !== 'rubinetto') throw x;
        const rb = x.dati?.rubinetto ?? {};
        const ok = await finestra({
          titolo: 'L\'evento sfora il rubinetto, come previsto',
          corpo: [h('p', {}, `Nei giorni dell\'evento, al locale peggiore (${rb.tavolo ?? '?'}) si regalano ${rb.monete ?? '?'} monete al giorno contro un tetto di ${rb.tetto ?? '?'} (${Math.round((rb.quota ?? 0) * 100)}%). Un evento a tempo lo fa apposta: si conferma forzando, e passa dall\'approvazione critica.`)],
          tasti: [{ testo: 'Annulla', risposta: false }, { testo: 'Conferma l\'evento', classe: 'primario', risposta: true }],
        });
        if (!ok) return;
        res = await invia(true);
      }
      const s = res?.approvazione;
      avvisa(s ? `Evento in approvazione: ${s.stato}${s.parte_il ? `, parte ${data(s.parte_il)}` : ''}` : 'Evento programmato');
      ctx.vai(`#/liveops?${Date.now()}`);
    } catch (x) { err.textContent = x.message; }
  };

  return h('form', { class: 'filtri', onsubmit: proponi },
    h('label', { class: 'campo' }, h('span', {}, 'Nome'), nome),
    h('label', { class: 'campo' }, h('span', {}, 'Monete'), molt),
    h('label', { class: 'campo' }, h('span', {}, 'Dal'), dal),
    h('label', { class: 'campo' }, h('span', {}, 'Al'), al),
    h('button', { class: 'bottone primario', type: 'submit' }, 'Programma'),
    err);
}
