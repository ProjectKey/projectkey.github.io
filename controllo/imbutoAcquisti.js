/**
 * L'IMBUTO D'ACQUISTO, IN RIGHE  (F-165, 2 nov 2026)
 * ==================================================
 *
 * La risposta di `acquisti.imbuto` (0136, una «cella» per gruppo e piattaforma) diventa una riga per passo, nell'ordine
 * in cui il giocatore li fa. Senza DOM: la pagina Monetizzazione la disegna, `server/prova/imbuto-acquisti.test.ts`
 * la prova. `persone` = installazioni distinte; `null` dove non ha senso (un conto di tentativi, non di persone).
 */

const zero = { persone: 0, volte: 0 };
const pv = (x) => ({ persone: Number(x?.persone ?? 0), volte: Number(x?.volte ?? 0) });

export function righeImbuto(cella) {
  const p = cella?.passi ?? {};
  const e = cella?.esiti ?? {};
  return [
    { passo: 'Negozio aperto', ...pv(p.negozio_visto), aiuto: 'la schermata Negozio' },
    { passo: 'Negozio in euro pronto', persone: Number(p.negozio_aperto ?? 0), volte: null, aiuto: 'cassa e store aperti' },
    { passo: 'Negozio in euro chiuso', persone: Number(p.negozio_chiuso ?? 0), volte: null, aiuto: 'i tasti in euro dicono «Non ancora in vendita»' },
    { passo: 'Tasto in euro spento', ...pv(e.bloccato ?? zero), aiuto: 'toccato con la linea assente o il negozio chiuso' },
    { passo: '«Lascia stare»', ...pv(e.lascia_stare ?? zero), aiuto: 'no nella conferma, prima dello store' },
    { passo: '«Compra» (foglio chiesto)', ...pv(p.iniziati), aiuto: 'acquisto_iniziato' },
    { passo: 'Annullato', ...pv(e.annullato ?? zero), aiuto: 'chi compra chiude il foglio dello store' },
    { passo: 'In attesa', ...pv(e.in_attesa ?? zero), aiuto: 'Play in attesa, o «chiedi di acquistare» su iPhone' },
    { passo: 'Fallito', ...pv(e.fallito ?? zero), aiuto: 'errore dello store o cassa che non risponde: vedi i codici' },
    { passo: 'Verifica fallita', ...pv(e.verifica_fallita ?? zero), aiuto: 'la cassa ha detto no per sempre' },
    { passo: 'Senza esito', persone: null, volte: Number(p.senza_esito ?? 0), aiuto: 'un «Compra» che lo store non ha mai chiuso' },
    { passo: 'Completato (telefono)', ...pv(p.completati), aiuto: 'acquisto in euro' },
    { passo: 'Consegnato (server)', ...pv(p.consegnati), aiuto: 'righe di acquisti con consegnato_il' },
  ];
}

/** Il nome della cella: «Android · veri», «iOS · prova». */
export const nomeCella = (c) => `${c.piattaforma === 'ios' ? 'iOS' : c.piattaforma === 'android' ? 'Android' : c.piattaforma} · ${c.gruppo === 'prova' ? 'telefoni di prova' : 'giocatori veri'}`;
