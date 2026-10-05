/**
 * L'ECONOMIA (Control Center fase 2, blocco B1, §15–16)
 * =====================================================
 *
 * Sola lettura. Quante monete e gemme entrano e quante escono, per giorno e per
 * fonte; i saldi di chi gioca; e la domanda che conta: **quanto si regala
 * davvero** a un giocatore in un giorno, contro il **tetto** del rubinetto
 * (`src/app/rubinetto.ts`), calcolato con la configurazione in linea.
 *
 * «Regalato» = quello che entra senza giocare una mano (missioni, bauli, regali,
 * Pass, bonus a video, lega…). Il tavolo (gettoni, vincite) e gli acquisti in
 * euro stanno a parte. La definizione sta in `0069_l_economia_nel_pannello.sql`.
 */
import * as api from '../api.js';
import { h, scheda, tabella, kpi, num, perc, giorniFa, memoria, erroreBox, nonDisponibile, grafico } from '../ui.js';

const GENERE = { tavolo: 'tavolo', regalo: 'regalato', fuori: 'fuori dal gioco' };

export async function disegna(ctx) {
  ctx.ricordaRecente('Economia');
  const salvati = memoria.leggi('economia.filtri', null);
  const f = salvati?.giorno === giorniFa(0) ? salvati : { da: giorniFa(13), a: giorniFa(0) };
  const apps = ctx.app ? [ctx.app] : ctx.apps;
  const con = apps.filter((a) => api.sa(a, 'economia'));
  const risposte = await Promise.all(con.map(async (a) => ({
    app: a, r: await api.economia(a.id, f.da, f.a).catch((e) => ({ errore: e })),
  })));

  const da = h('input', { type: 'date', value: f.da, 'aria-label': 'Dal' });
  const a = h('input', { type: 'date', value: f.a, 'aria-label': 'Al' });

  return [
    ...apps.filter((x) => !api.sa(x, 'economia')).map((x) => (x.erroreAdattatore
      ? erroreBox(new Error(`${x.nome} non risponde: ${x.erroreAdattatore}. Ricarica la pagina fra poco.`))
      : nonDisponibile(`Economia di ${x.nome}`, 'l\'adattatore non espone `economia`.'))),
    ...risposte.filter((x) => x.r?.errore).map((x) => erroreBox(new Error(`${x.app.nome}: ${x.r.errore.message}`))),
    scheda(null, h('form', {
      class: 'filtri',
      onsubmit: (e) => {
        e.preventDefault();
        memoria.scrivi('economia.filtri', { da: da.value, a: a.value, giorno: giorniFa(0) });
        ctx.vai(`#/economia?${Date.now()}`);
      },
    }, h('label', { class: 'campo' }, h('span', {}, 'Dal'), da), h('label', { class: 'campo' }, h('span', {}, 'al'), a),
    h('button', { class: 'bottone primario', type: 'submit' }, 'Applica'))),
    ...risposte.filter((x) => !x.r?.errore).flatMap(({ app, r }) => blocco(app, r, apps.length > 1)),
  ];
}

function blocco(app, r, conNome) {
  const t = r.totali ?? {};
  const s = r.saldi ?? {};
  const giorni = r.giorni ?? [];
  const cause = r.cause ?? [];
  const teorico = r.teorico ?? [];
  const titolo = (x) => (conNome ? `${app.nome} · ${x}` : x);
  // Il tetto con cui confrontare il reale: quello del locale più basso (dove si gioca di più all'inizio).
  const primo = teorico[0];
  const regalate = t.regalate_per_giocatore_giorno;
  const quotaReale = primo && regalate !== null && regalate !== undefined ? regalate / primo.tetto : null;
  return [
    h('div', { class: 'griglia g3' },
      kpi('Monete entrate / uscite', `${num(t.monete_in)} / ${num(t.monete_out)}`,
        `saldo del periodo ${(Number(t.monete_in) - Number(t.monete_out)) >= 0 ? '+' : ''}${num(Number(t.monete_in) - Number(t.monete_out))}`),
      kpi('Regalate per giocatore al giorno', regalate === null || regalate === undefined ? '—' : num(regalate),
        primo ? `tetto ${num(primo.tetto)} (${primo.nome}) · ${quotaReale === null ? '—' : perc(quotaReale)}` : 'tetto non disponibile'),
      kpi('Saldo mediano', s.monete_mediana === null || s.monete_mediana === undefined ? '—' : num(Math.round(s.monete_mediana)),
        `monete · ${num(s.giocatori)} giocatori attivi negli ultimi 30 giorni · max ${num(s.monete_max)}`)),
    quotaReale !== null && quotaReale > 1
      ? h('div', { class: 'avviso rosso' }, h('span', { class: 'ico' }, '⚠'),
        h('div', {}, h('strong', {}, 'Si regala più del tetto. '), `Nel periodo ${num(regalate)} monete regalate per giocatore al giorno contro un tetto di ${num(primo.tetto)}: guarda le fonti qui sotto.`))
      : null,
    scheda(titolo('Per giorno'), grafico('bar', {
      etichette: giorni.map((g) => String(g.giorno).slice(5)),
      serie: [
        { nome: 'Monete entrate', valori: giorni.map((g) => g.monete_in) },
        { nome: 'Monete uscite', valori: giorni.map((g) => g.monete_out) },
        { nome: 'Regalate', valori: giorni.map((g) => g.monete_regalate ?? 0) },
      ],
    }, false)),
    scheda(titolo('Per fonte'), tabella([
      { titolo: 'Fonte', cella: (c) => c.causa },
      { titolo: 'Genere', cella: (c) => GENERE[c.genere] ?? c.genere },
      { titolo: 'Monete +', cella: (c) => num(c.monete_in) },
      { titolo: 'Monete −', cella: (c) => num(c.monete_out) },
      { titolo: 'Gemme +', cella: (c) => num(c.gemme_in) },
      { titolo: 'Gemme −', cella: (c) => num(c.gemme_out) },
      { titolo: 'Giocatori', cella: (c) => num(c.giocatori) },
    ], cause, { vuoto: 'Nessun movimento nel periodo.' }), { nota: 'Una riga per azione della cassa, al netto. «Regalato» è tutto quello che entra senza giocare una mano; il tavolo e gli acquisti in euro stanno a parte.' }),
    scheda(titolo('Gemme e saldi'), tabella([
      { titolo: 'Cosa', cella: (x) => x[0] },
      { titolo: 'Valore', cella: (x) => x[1] },
    ], [
      ['Gemme entrate / uscite nel periodo', `${num(t.gemme_in)} / ${num(t.gemme_out)}`],
      ['Gemme: media / mediana / massimo dei saldi', `${s.gemme_media ?? '—'} / ${s.gemme_mediana ?? '—'} / ${num(s.gemme_max)}`],
      ['Monete: media / mediana / 90° percentile / massimo dei saldi', `${num(s.monete_media)} / ${num(s.monete_mediana)} / ${num(s.monete_p90)} / ${num(s.monete_max)}`],
      ['Giocatori con movimenti nel periodo', num(t.giocatori)],
    ])),
    scheda(titolo('Rubinetto teorico'), tabella([
      { titolo: 'Locale', cella: (x) => x.nome },
      { titolo: 'Regala al giorno', cella: (x) => num(x.monete) },
      { titolo: 'Tetto', cella: (x) => num(x.tetto) },
      { titolo: 'Quota', cella: (x) => perc(x.quota) },
      { titolo: 'Gemme', cella: (x) => String(x.gemme) },
    ], teorico, { vuoto: 'Il gioco non dà il rubinetto teorico.' }), {
      nota: `Con la configurazione in linea: il massimo che un giorno regala per locale (tetto gemme ${r.tettoGemme ?? '—'}).`,
    }),
  ];
}
