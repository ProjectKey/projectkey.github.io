/**
 * PORTAFOGLIO — i giochi affiancati  (Studio OS M1, MASTER_REQUIREMENTS §4.4, §30.2)
 * ==================================================================================
 *
 * Scopa, Briscola, Last Sheep, Snake 100 e i minigiochi uno accanto all'altro:
 * dove si gioca (stati del §17.3, con chi li ha verificati e quando), quanti
 * giocatori attivati (UAP, la North Star del §3.1), quanti tornano, quanto
 * rendono, i problemi e la prossima azione.
 *
 * **Ogni numero dice quanto fidarsi** (§21.3): pallino verde = verificato
 * (contato dall'adattatore sul database del gioco), ambra = stimato (il «≈»
 * davanti, e il perché nel suggerimento), grigio = mancante. Un dato che manca
 * resta «manca», mai zero. I numeri vengono dalla raccolta notturna
 * (`studio.metriche_giorno`), non dagli adattatori in diretta: la pagina si
 * apre in un attimo anche se un gioco tace. Il selettore dell'app non conta qui:
 * il portafoglio è sempre tutto lo studio.
 *
 * **Totale · Android · iOS** (0118, Giorgio 26 ott 2026): ogni numero dice da
 * dove viene. Un gioco che non divide i numeri dice «non diviso», mai il totale
 * al posto di una piattaforma. Gli iPhone di TestFlight sono fuori da tutto,
 * contati a parte.
 *
 * **I negozi affiancati** (0119, Giorgio 26 ott 2026: «la divisione tra gli app
 * store»): per ogni gioco Google Play | App Store | totale con i numeri che sa
 * solo il negozio (installazioni, visite alla scheda, conversione, sessioni,
 * crash), ognuno con la sua fonte nel suggerimento.
 *
 * **Il semaforo crash e la fluidità** (31 ott 2026, post-mortem del 30/10): un pallino accanto al nome di ogni
 * gioco e, in cima a «Problemi e prossima azione», le sessioni morte degli ultimi 3 giorni (giocatori veri e, a
 * parte, le prove di TestFlight) e i fotogrammi per piattaforma. Rosso = niente invii ad Apple né OTA.
 */
import * as api from '../api.js';
import {
  h, scheda, tabella, pill, num, soldi, perc, data, fa, kpi, erroreBox, avvisa, finestra, confermaConMotivo,
  DETTO_PIATTAFORMA, FUORI_DAI_CONTI, piattaformaScelta, sceltaPiattaforma,
} from '../ui.js';

const COLORE_STATO = {
  LIVE: 'verde', TESTING: 'cielo', APPROVED: 'cielo', IN_REVIEW: 'ambra', SUBMITTED: 'ambra',
  READY_FOR_BUILD: 'viola', BUILDING: 'viola', READY_FOR_SUBMISSION: 'viola',
  REJECTED: 'rosso', PAUSED: 'rosso', ROLLBACK_REQUIRED: 'rosso', NOT_CONFIGURED: '',
};
const SIGNIFICATO = {
  NOT_CONFIGURED: 'non configurato', READY_FOR_BUILD: 'pronto per la build', BUILDING: 'build in corso', TESTING: 'in prova',
  READY_FOR_SUBMISSION: 'pronto da inviare', SUBMITTED: 'inviato', IN_REVIEW: 'in revisione', REJECTED: 'respinto',
  APPROVED: 'approvato', LIVE: 'pubblicato, verificato', PAUSED: 'in pausa', ROLLBACK_REQUIRED: 'da ritirare',
};
const PIATTAFORME = [
  ['android', 'Android'], ['ios', 'iOS'], ['web', 'Web'], ['telegram', 'Telegram'], ['crazygames', 'CrazyGames'],
];
const QUALITA = {
  verificato: { colore: 'var(--verde)', parola: 'verificato' },
  stimato: { colore: 'var(--ambra)', parola: 'stimato' },
  mancante: { colore: 'var(--ink3)', parola: 'mancante' },
};

/** I colori del semaforo crash (quality-gates.yaml → semaforo_crash). Grigio = non letto: non è verde. */
const SEMAFORO = {
  verde: { colore: 'var(--verde)', pill: 'verde', parola: 'verde' },
  giallo: { colore: 'var(--ambra)', pill: 'ambra', parola: 'giallo' },
  rosso: { colore: 'var(--rosso)', pill: 'rosso', parola: 'rosso' },
  grigio: { colore: 'var(--ink3)', pill: '', parola: 'non letto' },
};
const pallinoSemaforo = (c, titolo = '') => h('span', {
  class: 'pallino', role: 'img', title: titolo, 'aria-label': `semaforo crash ${(SEMAFORO[c] ?? SEMAFORO.grigio).parola}`,
  style: { color: (SEMAFORO[c] ?? SEMAFORO.grigio).colore, flex: '0 0 auto' },
});
const percento = (x) => (x === null || x === undefined ? '—' : `${(x * 100).toFixed(1).replace('.', ',')}%`);

const giornoCorto = (g) => (g ? g.slice(5).split('-').reverse().join('/') : '—');
const pallino = (q) => h('span', { class: 'pallino', 'aria-hidden': 'true', style: { color: (QUALITA[q] ?? QUALITA.mancante).colore, flex: '0 0 auto' } });

/** Un gioco che non divide i numeri per piattaforma: si dice, non è un buco del gioco. */
const NON_DIVISO = { valore: null, qualita: 'mancante', fonte: null, nota: 'questo gioco non divide i numeri per piattaforma', nonDiviso: true };

/** Un numero con la sua qualità: «≈» per le stime, «manca» per i buchi, e il perché nel suggerimento. */
function valore(v, formato = num) {
  if (v?.nonDiviso) return h('span', { title: v.nota, style: { color: 'var(--ink3)', whiteSpace: 'nowrap' } }, 'non diviso');
  const q = v?.qualita ?? 'mancante';
  const titolo = [`${QUALITA[q]?.parola ?? q}`, v?.fonte ? `fonte: ${v.fonte}` : null, v?.giorno ? `al ${giornoCorto(v.giorno)}` : null, v?.nota].filter(Boolean).join(' · ');
  return h('span', { title: titolo, 'aria-label': `${q === 'mancante' ? 'manca' : formato(v.valore)} (${QUALITA[q]?.parola ?? q})`, style: { display: 'inline-flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap' } },
    q === 'mancante' || v?.valore === null || v?.valore === undefined
      ? h('span', { style: { color: 'var(--ink3)' } }, 'manca')
      : h('span', { style: { fontVariantNumeric: 'tabular-nums' } }, `${q === 'stimato' ? '≈ ' : ''}${formato(v.valore)}`),
    pallino(q));
}

const legenda = () => h('div', { class: 'azioni', style: { gap: '14px', color: 'var(--ink2)', fontSize: '12.5px' } },
  ...Object.entries(QUALITA).map(([k, x]) => h('span', { style: { display: 'inline-flex', alignItems: 'center', gap: '6px' } }, pallino(k), x.parola)),
  h('span', { style: { color: 'var(--ink3)' } }, '«≈» = stima · passa sopra un numero per la fonte'));

export async function disegna(ctx) {
  ctx.ricordaRecente('Portafoglio');
  let p;
  try { p = await api.portafoglio(); } catch (e) { return [erroreBox(e)]; }
  const giochi = p.giochi ?? [];
  const ricarica = () => ctx.vai(`#/portafoglio?${Date.now()}`);
  // 0118: i numeri del totale, di Android o di iOS.
  const pt = piattaformaScelta('portafoglio.piattaforma');
  const numeri = (g) => {
    if (pt === 'tutte') return g;
    const x = g.piattaforme?.[pt];
    return x?.divisa ? x : null;
  };

  // Il nome di ogni gioco porta il pallino del semaforo crash (31 ott 2026).
  const nomeGioco = (g) => h('span', { style: { display: 'inline-flex', alignItems: 'center', gap: '6px' } },
    g.semaforo_crash ? pallinoSemaforo(g.semaforo_crash.colore, (g.semaforo_crash.motivi ?? []).join(' · ') || 'nessun problema') : null, g.nome);
  const colonne = (titoloVoce, celle) => [
    { titolo: titoloVoce, cella: (r) => h('span', { style: { fontWeight: 600 }, title: r.aiuto ?? '' }, r.nome) },
    ...giochi.map((g) => ({ titolo: nomeGioco(g), cella: (r) => celle(r, g) })),
  ];

  /* ------------------------------------------------------------ dove si gioca */
  const cellaRilascio = (g, piattaforma) => {
    const r = g.rilasci?.[piattaforma];
    const aggiorna = async () => {
      const x = await confermaConMotivo({
        titolo: `${g.nome} · ${PIATTAFORME.find(([k]) => k === piattaforma)[1]}`,
        testo: 'Stato inserito a mano, con la data della verifica. Android e il web dei minigiochi li riscrive la raccolta notturna quando può verificarli (API di Play, pagina pubblica, hub).',
        tasto: 'Salva lo stato',
        campi: [
          { nome: 'stato', etichetta: 'Stato (§17.3)', tipo: 'select', opzioni: (p.stati ?? Object.keys(COLORE_STATO)).map((s) => ({ valore: s, testo: `${s} — ${SIGNIFICATO[s] ?? ''}` })) },
          { nome: 'versione', etichetta: 'Versione (facoltativa)', valore: r?.versione ?? '' },
          { nome: 'verificato_il', etichetta: 'Verificato il', tipo: 'date', valore: p.oggi },
          { nome: 'nota', etichetta: 'Nota (facoltativa)', valore: r?.nota ?? '' },
        ],
      });
      if (!x) return;
      try {
        await api.studioRilascio(g.app, piattaforma, { stato: x.stato, versione: x.versione, verificato_il: x.verificato_il, nota: x.nota }, x.motivo);
        avvisa('Stato salvato'); ricarica();
      } catch (e) { avvisa(e.message, true); }
    };
    const scelta = (el) => { const s = el.querySelector?.('select'); if (s && r?.stato) s.value = r.stato; };
    const tasto = h('button', {
      class: 'bottone piccolo', style: { padding: '2px 6px', fontSize: '11px' }, title: 'Cambia a mano', 'aria-label': `Cambia lo stato ${piattaforma} di ${g.nome}`,
      // La finestra nasce subito (confermaConMotivo la apre prima di aspettare): si sceglie lo stato di adesso.
      onclick: () => { aggiorna(); scelta(document.querySelector('.finestra')); },
    }, '✎');
    if (!r) return h('span', { style: { display: 'inline-flex', gap: '6px', alignItems: 'center' } }, h('span', { style: { color: 'var(--ink3)' } }, 'non verificato'), tasto);
    const quando = r.verificato_il ? data(r.verificato_il, false) : 'mai';
    return h('div', { style: { display: 'flex', flexDirection: 'column', gap: '3px', minWidth: '130px' } },
      h('span', { style: { display: 'inline-flex', gap: '6px', alignItems: 'center' } },
        h('span', { title: `${SIGNIFICATO[r.stato] ?? r.stato}${r.nota ? ` · ${r.nota}` : ''}` }, pill(r.stato, COLORE_STATO[r.stato] ?? '')),
        r.versione ? h('span', { class: 'mono', style: { fontSize: '12px' } }, r.versione) : null, tasto),
      h('span', { style: { fontSize: '11.5px', color: 'var(--ink3)' }, title: `fonte: ${r.fonte}${r.nota ? ` · ${r.nota}` : ''}` },
        `${r.manuale ? 'a mano' : 'verificato'} il ${quando}`));
  };
  const righePiattaforme = PIATTAFORME.map(([k, nome]) => ({ k, nome }));

  /* ------------------------------------------------------------ i numeri */
  const m = (k) => (g) => (numeri(g) ? numeri(g).metriche?.[k] : NON_DIVISO);
  const s = (k) => (g) => (numeri(g) ? numeri(g).somme?.[k] : NON_DIVISO);
  const righeGiocatori = [
    { nome: 'Attivati ieri', aiuto: 'UAP del giorno: giocatori che hanno avviato almeno una partita', v: m('uap_giorno') },
    { nome: 'Attivati 7 giorni', v: m('uap_7') },
    { nome: 'Attivati 30 giorni', v: m('uap_30') },
    { nome: 'Attivati da sempre', aiuto: 'UAP cumulativi', v: m('uap_cumulativi') },
    { nome: 'Nuovi ieri', aiuto: 'prima partita avviata quel giorno', v: m('uap_nuovi') },
    { nome: 'Nuovi 7 giorni', v: s('uap_nuovi_7') },
    { nome: 'Nuovi 30 giorni', v: s('uap_nuovi_30') },
    { nome: 'Di ritorno ieri', aiuto: 'attivati quel giorno che avevano già giocato prima', v: m('uap_ritorno') },
    { nome: 'Aperture ieri (DAU)', aiuto: 'installazioni che hanno aperto il gioco: non sono giocatori attivati', v: m('attivi_giorno') },
    { nome: 'Aperture 30 giorni (MAU)', v: m('attivi_30') },
    {
      nome: 'iPhone di prova (fuori)', aiuto: 'TestFlight e simulatori: non contano in nessun numero',
      cella: (g) => (g.testflight?.valore === null || g.testflight?.valore === undefined
        ? h('span', { style: { color: 'var(--ink3)' } }, '—')
        : h('span', { title: g.testflight.nota ?? '', style: { color: 'var(--ink2)', fontVariantNumeric: 'tabular-nums' } }, num(g.testflight.valore))),
    },
  ];
  const righeRitorno = [
    { nome: 'Tornano il giorno dopo (D1)', aiuto: 'coorti nate nei 30 giorni fino a ieri', v: m('retention_d1'), f: perc },
    { nome: 'Tornano dopo 7 giorni (D7)', v: m('retention_d7'), f: perc },
    { nome: 'Tornano dopo 30 giorni (D30)', v: m('retention_d30'), f: perc },
    { nome: 'Entrate lorde 30 giorni', aiuto: 'acquisti a listino, IVA compresa (Stars: remunerazione attesa)', v: s('entrate_lorde_30'), f: soldi },
    { nome: 'Entrate nette 30 giorni', v: s('entrate_nette_30'), f: soldi },
    { nome: 'Pubblicità 30 giorni', aiuto: 'AdMob e AdSense non sono ancora collegati (M4)', v: s('entrate_pubblicita_30'), f: soldi },
    { nome: 'Acquisti 30 giorni', v: s('acquisti_30') },
  ];

  /* ------------------------------------------------------------ i negozi (0119) */
  const tasso = (n) => (n === null || n === undefined ? '—' : `${(n * 100).toFixed(2).replace('.', ',')}%`);
  const VOCI_NEGOZI = [
    { k: 'installazioni', nome: 'Installazioni 7 g', aiuto: 'Play: utenti nuovi · App Store: primi download' },
    { k: 'visite', nome: 'Visite alla scheda 7 g', aiuto: 'Play: visitatori della scheda · App Store: visite alla pagina' },
    { k: 'conversione', nome: 'Conversione', aiuto: 'installazioni dalla scheda ÷ visite', f: perc },
    { k: 'sessioni', nome: 'Sessioni 7 g', aiuto: 'solo App Store; per Android guarda «Aperture» nei Giocatori' },
    { k: 'crash', nome: 'Crash', aiuto: 'Play: tasso di crash percepiti (Android Vitals) · App Store: numero di crash', fPlay: tasso },
  ];
  const schedaNegozi = (g) => {
    const n = g.negozi;
    const fino = [n.fino_play ? `Play al ${giornoCorto(n.fino_play)}` : 'Play: nessun dato', n.fino_app_store ? `App Store al ${giornoCorto(n.fino_app_store)}` : 'App Store: ancora niente'].join(' · ');
    return scheda(g.nome, tabella([
      { titolo: '', cella: (r) => h('span', { style: { fontWeight: 600 }, title: r.aiuto ?? '' }, r.nome) },
      { titolo: 'Google Play', cella: (r) => valore(n.google_play?.[r.k], r.fPlay ?? r.f ?? num) },
      { titolo: 'App Store', cella: (r) => valore(n.app_store?.[r.k], r.f ?? num) },
      { titolo: 'Totale', cella: (r) => valore(n.totale?.[r.k], r.f ?? num) },
    ], VOCI_NEGOZI, {}), { nota: fino });
  };
  const conNegozi = giochi.filter((g) => g.negozi);

  /* ------------------------------------------------------------ Search Console, pagine /games/* (31 ott 2026) */
  const sc = p.search_console;
  const schedaSearchConsole = () => {
    if (!sc) return null;
    if (sc.qualita !== 'verificato') {
      return scheda('Google: pagine /games/* (minigiochi)', h('p', { style: { margin: 0, color: 'var(--ink3)' } }, `Search Console non letta: ${sc.nota ?? '—'}`));
    }
    const cifra = (x, k) => (x?.[k] === null || x?.[k] === undefined ? '—' : k === 'ctr' ? perc(x[k]) : num(x[k]));
    const righe = [{ pagina: 'Tutte le pagine /games/*', ...sc.totale, totale: true }, ...(sc.pagine ?? [])];
    return scheda('Google: pagine /games/* (minigiochi)', tabella([
      { titolo: 'Pagina', cella: (r) => h('span', { style: { fontWeight: r.totale ? 600 : 400 } }, r.pagina) },
      { titolo: 'Clic 7 g', cella: (r) => cifra(r['7'], 'clic') },
      { titolo: 'Impressioni 7 g', cella: (r) => cifra(r['7'], 'impressioni') },
      { titolo: 'Clic 28 g', cella: (r) => cifra(r['28'], 'clic') },
      { titolo: 'Impressioni 28 g', cella: (r) => cifra(r['28'], 'impressioni') },
      { titolo: 'CTR 28 g', cella: (r) => cifra(r['28'], 'ctr') },
      { titolo: 'Posizione 28 g', cella: (r) => cifra(r['28'], 'posizione') },
    ], righe, {}), { nota: `Search Console fino al ${giornoCorto(sc.fino)} · giorni del fuso del Pacifico (non di Roma) · 2–3 giorni di ritardo · le pagine senza impressioni non compaiono` });
  };

  /* ------------------------------------------------------------ problemi e prossima azione */
  const modificaScheda = async (g) => {
    const problemi = h('textarea', { maxlength: 2000, 'aria-label': 'Problemi principali' }, g.scheda?.problemi ?? '');
    const prossima = h('textarea', { maxlength: 1000, 'aria-label': 'Prossima azione' }, g.scheda?.prossima_azione ?? '');
    const motivo = h('textarea', { maxlength: 500, placeholder: 'Perché lo cambi? (resta nel registro)', 'aria-label': 'Motivo', style: { minHeight: '50px' } });
    const errore = h('div', { class: 'errore-testo' });
    const ok = await finestra({
      titolo: `${g.nome} · problemi e prossima azione`,
      corpo: [
        h('label', { class: 'campo' }, h('span', {}, 'Problemi principali'), problemi),
        h('label', { class: 'campo' }, h('span', {}, 'Prossima azione'), prossima),
        h('label', { class: 'campo' }, h('span', {}, 'Motivo (obbligatorio)'), motivo),
        errore,
      ],
      tasti: [
        { testo: 'Annulla', risposta: null },
        {
          testo: 'Salva', classe: 'primario',
          valore: async () => {
            if (motivo.value.trim().length < 5) { errore.textContent = 'Scrivi un motivo di almeno 5 caratteri.'; return false; }
            try {
              await api.studioScheda(g.app, { problemi: problemi.value, prossima_azione: prossima.value }, motivo.value.trim());
              return true;
            } catch (e) { errore.textContent = e.message; return false; }
          },
        },
      ],
    });
    if (ok) { avvisa('Salvato'); ricarica(); }
  };
  const elenco = (voci, colore) => voci.length
    ? h('ul', { style: { margin: 0, paddingLeft: '16px', display: 'grid', gap: '3px' } }, voci.map((t) => h('li', { style: colore ? { color: colore } : {} }, t)))
    : null;
  /* Il semaforo crash di un gioco: colore, sessioni morte, motivi, il peggiore; poi le prove di TestFlight. */
  const cellaSemaforo = (g) => {
    const sc = g.semaforo_crash;
    if (!sc) return h('span', { style: { color: 'var(--ink3)' } }, 'non letto');
    const x = SEMAFORO[sc.colore] ?? SEMAFORO.grigio;
    const conti = (s) => (s ? `${s.morte ?? 0} morte su ${s.chiuse ?? 0}` : '—');
    const pr = sc.prova;
    const peggiore = sc.peggiori?.modello?.[0] ?? sc.peggiori?.build?.[0] ?? pr?.peggiori?.modello?.[0] ?? pr?.peggiori?.build?.[0];
    return h('div', { style: { display: 'grid', gap: '4px', minWidth: '200px', maxWidth: '280px', whiteSpace: 'normal' } },
      // 31/10: 0 sessioni = «senza dati» detto in chiaro (giallo: non è verde, ma l'adattatore ha risposto).
      h('span', { style: { display: 'inline-flex', gap: '6px', alignItems: 'center' } }, pill(sc.senza_dati ? 'SENZA DATI' : x.parola.toUpperCase(), x.pill),
        sc.sessioni ? h('span', { style: { fontVariantNumeric: 'tabular-nums' } }, `giocatori: ${conti(sc.sessioni)} · ${percento(sc.tasso_morte)}`) : null),
      elenco(sc.motivi ?? [], sc.colore === 'rosso' ? 'var(--rosso)' : 'var(--ink2)'),
      peggiore ? h('span', { style: { fontSize: '12px', color: 'var(--ink2)' } }, `peggiore: ${peggiore.os ?? ''} ${peggiore.modello ?? peggiore.build ?? ''} (${peggiore.morte} morte)`) : null,
      pr ? h('span', { style: { fontSize: '12px', color: pr.colore === 'rosso' ? 'var(--rosso)' : 'var(--ink3)' }, title: (pr.motivi ?? []).join(' · ') },
        `prove (TestFlight, casa): ${(SEMAFORO[pr.colore] ?? SEMAFORO.grigio).parola} · ${conti(pr.sessioni)}`) : null,
      // 31/10: i simulatori ed emulatori a parte. Si vedono, ma non fanno il colore.
      sc.simulatori && (sc.simulatori.sessioni?.chiuse ?? 0) > 0
        ? h('span', { style: { fontSize: '12px', color: 'var(--ink3)' }, title: sc.simulatori.nota ?? '' },
          `simulatori (fuori dal colore): ${conti(sc.simulatori.sessioni)}`
          + (sc.simulatori.peggiori?.modello?.[0] ? ` · ${sc.simulatori.peggiori.modello[0].modello}` : ''))
        : null,
      sc.ios ? h('span', { style: { fontSize: '11.5px', color: 'var(--ink3)' } }, `ultime ${sc.ore ?? 72} ore · iOS conta ${sc.ios.conta === 'reali' ? 'i giocatori' : 'TestFlight'}: ${sc.ios.sessioni ?? 0} sessioni`) : null);
  };
  /* La fluidità: thread UI P50, fotogrammi oltre 25 ms (UI e JS), intervallo JS P95, per piattaforma (5_ios_pronta.b). */
  const cellaFluidita = (g) => {
    const f = g.fluidita;
    if (!f || !f.reali) return h('span', { style: { color: 'var(--ink3)' }, title: f?.nota ?? '' }, 'non letta');
    const riga = (gr, pt, nome) => {
      const x = f[gr]?.[pt];
      if (!x || x.esito === 'senza dati') return null;
      return h('span', { style: { color: x.esito === 'sopra' ? 'var(--rosso)' : 'var(--ink)' }, title: (x.motivi ?? []).join(' · ') || 'dentro le soglie' },
        `${nome}: UI ${x.ui_p50 ?? '—'} ms · oltre 25 ms ${percento(x.oltre_25)}`
        + (x.js_oltre_25 != null ? ` · JS oltre 25 ms ${percento(x.js_oltre_25)}` : '')
        + (x.intervallo_p95 != null ? ` · JS P95 ${x.intervallo_p95} ms` : '')
        + `${x.esito === 'sopra' ? ' ✕' : ' ✓'} (${x.misure})`);
    };
    const righe = [riga('reali', 'ios', 'iOS'), riga('reali', 'android', 'Android'), riga('prova', 'ios', 'iOS prove'), riga('prova', 'android', 'Android prove'),
      riga('simulatore', 'ios', 'Simulatore iOS (non conta)'), riga('simulatore', 'android', 'Emulatore (non conta)')].filter(Boolean);
    return h('div', { style: { display: 'grid', gap: '3px', minWidth: '200px', maxWidth: '280px', whiteSpace: 'normal', fontSize: '12.5px', fontVariantNumeric: 'tabular-nums' } },
      ...(righe.length ? righe : [h('span', { style: { color: 'var(--ink3)' } }, 'nessuna misura in 3 giorni')]),
      h('span', { style: { fontSize: '11.5px', color: 'var(--ink3)' } },
        `soglie ${f.genere}: iOS ≤ ${f.soglie?.ios?.ui_p50} ms e ≤ ${percento(f.soglie?.ios?.oltre_25)}${f.soglie?.ios?.intervallo_p95 ? `, JS P95 ≤ ${f.soglie.ios.intervallo_p95} ms` : ''}`
        + ` · Android ≤ ${f.soglie?.android?.ui_p50} ms e ≤ ${percento(f.soglie?.android?.oltre_25)}${f.soglie?.android?.intervallo_p95 ? `, JS P95 ≤ ${f.soglie.android.intervallo_p95} ms` : ''}`));
  };
  const righeDecisioni = [
    { nome: 'Semaforo crash', aiuto: 'sessioni morte senza fine (crash nativi) negli ultimi 3 giorni: quality-gates.yaml → semaforo_crash', cella: cellaSemaforo },
    { nome: 'Fluidità', aiuto: 'thread UI P50, fotogrammi oltre 25 ms (UI e JS), intervallo e lavoro JS al P95 negli ultimi 3 giorni: quality-gates.yaml → 5_ios_pronta.b', cella: cellaFluidita },
    {
      nome: 'Problemi principali',
      cella: (g) => h('div', { style: { display: 'grid', gap: '6px', minWidth: '200px', maxWidth: '280px', whiteSpace: 'normal' } },
        elenco(g.problemi_automatici ?? [], 'var(--rosso)'),
        g.scheda?.problemi ? h('div', { style: { whiteSpace: 'pre-line' } }, g.scheda.problemi) : null,
        !(g.problemi_automatici ?? []).length && !g.scheda?.problemi ? h('span', { style: { color: 'var(--ink3)' } }, 'nessuno scritto') : null),
    },
    {
      nome: 'Prossima azione',
      cella: (g) => h('div', { style: { display: 'grid', gap: '6px', minWidth: '200px', maxWidth: '280px', whiteSpace: 'normal' } },
        g.scheda?.prossima_azione ? h('strong', { style: { fontWeight: 600, whiteSpace: 'pre-line' } }, g.scheda.prossima_azione) : h('span', { style: { color: 'var(--ink3)' } }, 'da decidere'),
        h('span', { style: { fontSize: '11.5px', color: 'var(--ink3)' } }, g.scheda?.aggiornata_il ? `${g.scheda.aggiornata_da} · ${fa(g.scheda.aggiornata_il)}` : ''),
        h('div', {}, h('button', { class: 'bottone piccolo', onclick: () => modificaScheda(g) }, 'Modifica'))),
    },
  ];

  /* ------------------------------------------------------------ in cima: lo studio */
  const t = (pt === 'tutte' ? p.studio : p.studio_piattaforme?.[pt]) ?? {};
  const kpiQ = (etichetta, v, formato = num) => kpi(etichetta,
    v?.valore === null || v?.valore === undefined ? '—' : `${v.qualita === 'stimato' ? '≈ ' : ''}${formato(v.valore)}`,
    v?.qualita === 'mancante' || !v ? 'manca' : v.qualita === 'stimato' ? `stima${v.nota ? ` · ${v.nota}` : ''}` : 'verificato');
  const pubblicati = giochi.filter((g) => Object.values(g.rilasci ?? {}).some((r) => r?.stato === 'LIVE')).length;

  const raccogli = (x, testo) => async () => {
    try {
      const r = await api.studioRaccogli(x);
      avvisa(`${testo}: ${r.in_coda ?? 0} giorni da raccogliere. Ricarica fra un minuto.`);
    } catch (e) { avvisa(e.message, true); }
  };

  const statoDati = {
    nome: 'Numeri al',
    cella: (g) => h('div', { style: { display: 'grid', gap: '2px', fontSize: '12px', whiteSpace: 'normal', minWidth: '130px' } },
      pt !== 'tutte' && !numeri(g)
        ? h('span', { style: { color: 'var(--ink3)' } }, 'non diviso')
        : h('span', { style: { color: g.in_ritardo ? 'var(--rosso)' : 'var(--ink2)', fontWeight: 600 } }, (numeri(g) ?? g).ultimo_giorno ? giornoCorto((numeri(g) ?? g).ultimo_giorno) : 'mai raccolti'),
      g.raccolta?.errore ? h('span', { style: { color: 'var(--rosso)' }, title: g.raccolta.errore }, `raccolta fallita il ${giornoCorto(g.raccolta.giorno)}`) : null,
      g.nota ? h('span', { style: { color: 'var(--ink3)' } }, g.nota) : null),
  };

  return [
    h('div', { class: 'azioni', style: { justifyContent: 'space-between' } },
      h('span', { style: { color: 'var(--ink3)' } },
        `${giochi.length} prodotti · fuso di Roma · euro · ultima raccolta ${p.raccolta?.ultima ? fa(p.raccolta.ultima) : 'mai'}`,
        p.raccolta?.in_coda ? ` · ${p.raccolta.in_coda} giorni in coda` : ''),
      h('div', { class: 'azioni' },
        sceltaPiattaforma('portafoglio.piattaforma', pt, ricarica),
        h('button', { class: 'bottone piccolo', onclick: raccogli({ rilasci: true }, 'Raccolta avviata'), title: 'Raccoglie i giorni mancanti e riverifica gli stati di rilascio' }, 'Raccogli adesso'),
        h('button', { class: 'bottone piccolo', onclick: raccogli({ rifai: 30, rilasci: true }, 'Rifaccio 30 giorni'), title: 'Rimette in coda gli ultimi 30 giorni (riscrive le stesse righe)' }, 'Rifai 30 giorni'))),

    h('p', { style: { margin: 0, color: 'var(--ink2)', fontSize: '12.5px' } },
      h('strong', {}, `${DETTO_PIATTAFORMA[pt]}.`), ` ${FUORI_DAI_CONTI}`),
    h('div', { class: 'griglia g6' },
      kpiQ('Attivati ieri', t.uap_giorno), kpiQ('Attivati 7 giorni', t.uap_7), kpiQ('Attivati 30 giorni', t.uap_30),
      kpiQ('Attivati da sempre', t.uap_cumulativi), kpiQ('Nuovi 30 giorni', t.uap_nuovi_30), kpiQ('Entrate 30 giorni', t.entrate_lorde_30, soldi)),
    h('p', { style: { margin: '0', color: 'var(--ink3)', fontSize: '12.5px' } },
      `Somme dello studio: la stessa persona in due giochi conta due volte (nessuna identità comune, §3.2). Prodotti pubblicati e verificati su almeno una piattaforma: ${pubblicati} su ${giochi.length}.`),
    legenda(),

    scheda('Dove si gioca', tabella(colonne('Piattaforma', (r, g) => cellaRilascio(g, r.k)), [...righePiattaforme], {}),
      { nota: 'stati del §17.3 · LIVE solo con la pagina pubblica verificata' }),
    conNegozi.length ? h('h3', { style: { margin: '8px 0 0', fontSize: '15px' } }, 'Negozi: Google Play · App Store · totale') : null,
    conNegozi.length ? h('p', { style: { margin: 0, color: 'var(--ink3)', fontSize: '12.5px' } },
      'I numeri che sa solo il negozio, sugli stessi 7 giorni (l\'ultimo che hanno tutti e due). Apple dà numeri solo per le app uscite sull\'App Store (TestFlight non conta).') : null,
    conNegozi.length ? h('div', { class: 'griglia g2' }, ...conNegozi.map(schedaNegozi)) : null,
    schedaSearchConsole(),
    scheda('Giocatori', tabella(colonne('', (r, g) => (r.cella ? r.cella(g) : valore(r.v(g), r.f ?? num))), [statoDati, ...righeGiocatori], {}),
      { nota: 'attivato = ha avviato almeno una partita (§3.1)' }),
    scheda('Ritorno e ricavi', tabella(colonne('', (r, g) => valore(r.v(g), r.f ?? num)), righeRitorno, {}),
      { nota: 'D1/D7/D30: «esattamente il giorno N», giorni di Roma' }),
    scheda('Problemi e prossima azione', tabella(colonne('', (r, g) => r.cella(g)), righeDecisioni, {}),
      { nota: 'in cima il semaforo crash e la fluidità (ultimi 3 giorni, letti adesso); in rosso quelli che dicono i numeri da soli' }),
    h('p', { style: { color: 'var(--ink3)', fontSize: '12.5px' } },
      'Le definizioni (formula, finestra, fuso, duplicati, limiti) stanno in docs/studio/METRICS_DICTIONARY.md del repository SetteGames.'),
  ];
}
