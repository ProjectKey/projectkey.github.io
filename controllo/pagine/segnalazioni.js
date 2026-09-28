/**
 * SEGNALAZIONI DEI GIOCATORI (F-146-bis)
 * ======================================
 *
 * Quello che i giocatori scrivono con «Segnala un problema», dalle Impostazioni
 * o dalla rotella del tavolo: chi, da dove, che versione, che telefono, che
 * partita. Il tasto «Letta» segna chi l'ha letta e quando (`problemi.letto`,
 * docs/controllo/ARCHITETTURA.md), e finisce nel registro come ogni scrittura.
 * Le app il cui adattatore non dichiara `problemi` lo dicono, invece di
 * sembrare vuote.
 */
import * as api from '../api.js';
import { h, scheda, tabella, pill, kpi, num, data, giorniFa, memoria, erroreBox, nonDisponibile, avvisa } from '../ui.js';

const DOVE = { tavolo: ['al tavolo', 'viola'], impostazioni: ['dalla home', 'cielo'] };

export async function disegna(ctx) {
  ctx.ricordaRecente('Segnalazioni');
  // Come in Monetizzazione: le date valgono per la giornata, il giorno dopo si riparte dagli ultimi 30.
  const salvati = memoria.leggi('segnalazioni.filtri', null);
  const f = salvati?.giorno === giorniFa(0) ? salvati : { da: giorniFa(29), a: giorniFa(0), soloDaLeggere: salvati?.soloDaLeggere ?? true };
  const apps = ctx.app ? [ctx.app] : ctx.apps;
  const conProblemi = apps.filter((a) => api.sa(a, 'problemi'));
  const risposte = await Promise.all(conProblemi.map(async (a) => ({
    app: a, r: await api.problemi(a.id, f.da, f.a, !!f.soloDaLeggere).catch((e) => ({ errore: e })),
  })));
  const tutte = risposte.flatMap(({ app, r }) => (Array.isArray(r) ? r : []).map((x) => ({ ...x, app })))
    .sort((a, b) => String(b.creata_il).localeCompare(String(a.creata_il)));
  const daLeggere = tutte.filter((x) => !x.letta_il).length;

  const da = h('input', { type: 'date', value: f.da, 'aria-label': 'Dal' });
  const a = h('input', { type: 'date', value: f.a, 'aria-label': 'Al' });
  const solo = h('input', { type: 'checkbox', checked: !!f.soloDaLeggere, 'aria-label': 'Solo da leggere' });

  return [
    ...apps.filter((x) => !api.sa(x, 'problemi')).map((x) => (x.erroreAdattatore
      ? erroreBox(new Error(`${x.nome} non risponde: ${x.erroreAdattatore}. Ricarica la pagina fra poco.`))
      : nonDisponibile(`Segnalazioni di ${x.nome}`, 'l\'adattatore non espone `problemi`.'))),
    ...risposte.filter((x) => x.r?.errore).map((x) => erroreBox(new Error(`${x.app.nome}: ${x.r.errore.message}`))),
    scheda(null, h('form', {
      class: 'filtri',
      onsubmit: (e) => {
        e.preventDefault();
        memoria.scrivi('segnalazioni.filtri', { da: da.value, a: a.value, soloDaLeggere: solo.checked, giorno: giorniFa(0) });
        ctx.vai(`#/segnalazioni?${Date.now()}`);
      },
    }, h('label', { class: 'campo' }, h('span', {}, 'Dal'), da), h('label', { class: 'campo' }, h('span', {}, 'Al'), a),
    h('label', { class: 'campo' }, h('span', {}, 'Solo da leggere'), solo),
    h('button', { class: 'bottone primario', type: 'submit' }, 'Applica'))),
    h('div', { class: 'griglia g2' },
      kpi(f.soloDaLeggere ? 'Da leggere' : 'Segnalazioni', num(f.soloDaLeggere ? daLeggere : tutte.length), f.soloDaLeggere ? 'nel periodo' : `${num(daLeggere)} da leggere`),
      kpi('Dal tavolo', num(tutte.filter((x) => x.dove === 'tavolo').length), 'scritte mentre giocavano')),
    scheda(`Segnalazioni (${tutte.length})`, tabella([
      { titolo: 'Quando', cella: (x) => data(x.creata_il) },
      { titolo: 'Giocatore', cella: (x) => x.profilo_id ? h('a', { href: `#/giocatori/${x.app.id}/${x.profilo_id}` }, x.giocatore ?? x.profilo_id.slice(0, 8)) : (x.giocatore ?? '—') },
      ...(apps.length > 1 ? [{ titolo: 'App', cella: (x) => x.app.nome }] : []),
      { titolo: 'Dove', cella: (x) => pill(...(DOVE[x.dove] ?? [x.dove ?? '—', ''])) },
      { titolo: 'Testo', cella: (x) => h('span', { style: { whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' } }, x.testo) },
      { titolo: 'Versione', cella: (x) => h('span', { class: 'mono' }, [x.versione ?? '—', x.aggiornamento ? ` · ${String(x.aggiornamento).slice(0, 8)}` : ''].join('')) },
      { titolo: 'Telefono', cella: (x) => x.telefono ?? '—' },
      { titolo: 'Partita', cella: (x) => x.partita_id ? h('a', { class: 'mono', href: `#/partite/${x.app.id}/${x.partita_id}` }, String(x.partita_id).slice(0, 8)) : '—' },
      { titolo: '', cella: (x) => (x.letta_il ? h('span', { title: `${x.letta_da ?? ''} · ${data(x.letta_il)}` }, pill('letta', 'verde')) : tastoLetta(ctx, x.app, x)) },
    ], tutte, { vuoto: f.soloDaLeggere ? 'Niente da leggere nel periodo.' : 'Nessuna segnalazione nel periodo.' })),
  ];
}

/**
 * **Il tasto «Letta»**: niente tasto se l'app non lo sa fare o il ruolo non ha
 * `giocatori.moderare`. Un clic basta (il motivo è fisso: segnare una lettura
 * non ha un perché da scrivere), poi la pagina si ridisegna.
 */
function tastoLetta(ctx, app, x) {
  if (!x.id || !api.sa(app, 'problemaLetto')) return null;
  const permessi = ctx.io?.permessi ?? [];
  if (!permessi.includes('giocatori.moderare') && !permessi.includes('*')) return null;
  return h('button', {
    class: 'bottone piccolo', type: 'button',
    onclick: async (e) => {
      e.stopPropagation();
      const tasto = e.currentTarget;
      tasto.disabled = true;
      try {
        const esito = await api.problemaLetto(app.id, x.id);
        avvisa(esito.gia_letta ? `Era già letta (${esito.letta_da ?? '—'})` : 'Segnata come letta');
        ctx.vai(`${location.hash.split('?')[0]}?${Date.now()}`);
      } catch (err) { avvisa(err.message, true); tasto.disabled = false; }
    },
  }, 'Letta');
}
