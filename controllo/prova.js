/**
 * DATI DI PROVA — solo con `?prova=1` su localhost
 * ================================================
 *
 * Servono a fotografare e rivedere le schermate senza il server. Tutto quello
 * che esce da qui è **finto**, e la pagina lo scrive in una fascia in cima:
 * nessuno deve poter scambiare questi numeri per quelli veri. Le forme delle
 * risposte sono quelle che la pagina si aspetta dalla funzione `controllo`
 * (vedi LEGGIMI.md in questa cartella).
 */

let seme = 7;
const caso = () => { seme = (seme * 16807) % 2147483647; return (seme - 1) / 2147483646; };
const tra = (a, b) => Math.round(a + caso() * (b - a));
const oggi = Date.now();
const giorno = (n) => new Date(oggi - n * 86400000).toLocaleDateString('sv-SE', { timeZone: 'Europe/Rome' });
const istante = (min) => new Date(oggi - min * 60000).toISOString();

const TUTTE = ['kpi', 'giocatori.cerca', 'giocatori.scheda', 'giocatori.timeline', 'giocatori.accredita',
  'giocatori.blocca', 'giocatori.sblocca', 'giocatori.nome', 'partite.cerca', 'partite.scheda', 'config.leggi',
  'config.scrivi', 'errori', 'salute', 'acquisti', 'acquisti.rimborsa', 'versioni', 'problemi', 'problemi.letto', 'percorso', 'economia', 'config.verifica', 'posta.manda', 'posta.elenco', 'missioni.leggi', 'segmenti.leggi', 'negozio.leggi', 'giochi', 'assistenza.elenco', 'assistenza.scheda', 'assistenza.aggiorna', 'moderazione.coda', 'moderazione.decidi', 'rischio', 'analisi.catalogo', 'analisi.eventi', 'analisi.imbuto', 'analisi.coorti', 'esperimenti.risultati', 'giocatori.escludi', 'crescita', 'crescita.cruscotto', 'crescita.raccogli', 'crescita.esperimento', 'crescita.recensioni'];

const APPS = [
  {
    id: 'settebello-scopa', nome: 'Settebello Scopa', famiglia: 'Settebello', organizzazione: 'PK - Project Key',
    piattaforme: ['android'], pacchetto: 'it.settebello.app', playId: 'it.settebello.app', appStoreId: null,
    stato: 'live', ambiente: 'production', ambienti: ['production'], paesi: ['IT', 'SM', 'CH'], lingue: ['it'],
    versioni: { android: { pubblicata: '1.0.8', ultima: '1.0.8', consigliata: '1.0.8', minima: '1.0.7' } },
    config: { manutenzione: { attiva: false, messaggio: '' }, versioneMinima: '1.0.7', interruttori: { online: true, torneo: true, lega: true }, pubblicita: false },
    capacita: { versioneContratto: 1, azioni: TUTTE, moduli: ['carte'], valute: ['monete', 'gemme'] },
  },
  {
    id: 'last-sheep', nome: 'Last Sheep Royale', famiglia: 'Last Sheep', organizzazione: 'PK - Project Key',
    piattaforme: ['android'], pacchetto: 'com.lastsheep.royale', playId: 'com.lastsheep.royale', appStoreId: null,
    stato: 'live', ambiente: 'production', ambienti: ['production'], paesi: ['IT'], lingue: ['en'],
    versioni: { android: { pubblicata: '1.2.0', ultima: '1.2.0', consigliata: '1.2.0', minima: '1.1.0' } },
    config: { manutenzione: { attiva: false, messaggio: '' }, versioneMinima: '1.1.0', interruttori: {}, pubblicita: false },
    capacita: { versioneContratto: 1, azioni: ['kpi', 'giocatori.cerca', 'giocatori.scheda', 'config.leggi', 'config.scrivi', 'salute', 'errori'], moduli: ['arena'], valute: ['coins'] },
  },
];

const serieKpi = (fattore) => Array.from({ length: 30 }, (_, i) => {
  const dau = Math.round(tra(80, 140) * fattore * (1 + i / 60));
  const lorde = +(tra(0, 60) * fattore).toFixed(2);
  return {
    giorno: giorno(29 - i), dau, nuovi: Math.round(dau * .22), sessioni: Math.round(dau * 2.4),
    partite_iniziate: Math.round(dau * 5.1), partite_finite: Math.round(dau * 4.6), abbandoni: Math.round(dau * .3),
    entrate_lorde: lorde, entrate_nette: +(lorde / 1.22 * .85).toFixed(2), acquisti: tra(0, 9), paganti: tra(0, 7),
    errori_app: tra(0, 6), sessioni_con_crash: tra(0, 2),
  };
});

const GIOCATORI = [
  { id: '5037b80a-c169-44e3-aa9f-2f1a92c07eaa', nome: 'Giorgio', livello: 11, creato: '2026-09-14T09:50:00Z', visto: istante(12), legami: ['facebook'] },
  { id: '9a1f3c22-0b7e-4d51-8e2a-5c6d7e8f9a01', nome: 'Marta88', livello: 7, creato: '2026-09-20T18:12:00Z', visto: istante(240), legami: ['play-games'] },
  { id: '1c2d3e4f-5a6b-4c7d-8e9f-0a1b2c3d4e5f', nome: 'Giocatore 4685', livello: 2, creato: '2026-09-24T21:03:00Z', visto: istante(1600), legami: [] },
];

const EVENTI = [
  [12, 'accesso', 'Accesso (Android 1.0.8, Pixel 7)'],
  [14, 'partita', 'Partita iniziata — Scopa, L\'Osteria, posta 100'],
  [19, 'partita', 'Partita finita — vinta 11 a 7'],
  [19, 'denaro', '+200 monete (vincita)'],
  [21, 'denaro', 'Baule d\'argento aperto: +34 monete'],
  [24, 'acquisto', 'Negozio aperto'],
  [25, 'acquisto', 'Acquisto 120 gemme — 1,99 € (consegnato)'],
  [31, 'errore', 'Errore app: TypeError in Tavolo (1.0.8)'],
  [36, 'accesso', 'Nuovo accesso'],
  [1500, 'admin', 'supporto.applicazioni@gmail.com: +500 monete — compensazione partita interrotta'],
  [1510, 'partita', 'Torneo: ottavi vinti contro Tino'],
];

// Il calendario dei social, le community e i temi dei concorrenti (G8): forme di `controllo/contenuti.ts`.
const HT = '#scopa #giochidicarte #carteNapoletane';
const CONCETTI_FINTI = [
  [0, '12:30', 'sbaglio-1', 'sbaglio', 'errori', 'La scopa che non si vede', `C'era la scopa… e non l'ha vista. 😱 Tu l'avresti vista? 👇\n${HT} #errore`, ['pubblicata', 'pubblicata', 'pubblicata', 'approvata']],
  [0, '20:30', 'domanda-1', 'domanda', 'puzzle', 'Tu cosa giocheresti? A/B/C', `Hai in mano A) fante di denari, B) cavallo di denari, C) cavallo di coppe. Tu cosa giocheresti? 👇\n${HT} #quiz`, ['approvata', 'approvata', 'approvata', 'scartata']],
  [-1, '12:30', 'trova-la-scopa-1', 'trova-la-scopa', 'challenge', 'Trova la scopa in 5 secondi', `Trova la scopa in 5 secondi. L'avevi vista? 👀\n${HT} #sfida`, ['proposta', 'proposta', 'proposta', 'proposta']],
  [-1, '20:30', 'regola-1', 'regola', 'regole', 'Carta uguale o somma', `Con il fante di coppe prendi il fante di bastoni o 3+5? A casa tua come si gioca? 🤔\n${HT} #regole`, ['proposta', 'proposta', 'proposta', 'proposta']],
  [-2, '12:30', 'sbaglio-2', 'sbaglio', 'errori', 'La scopa che non si vede #2', `C'era la scopa… e non l'ha vista. 😱 Tu l'avresti vista? 👇\n${HT} #errore`, ['proposta', 'proposta', 'proposta', 'proposta']],
  [-3, '20:30', 'post-settebello', 'post', 'curiosita', 'Perché si chiama settebello?', `Perché il 7 di denari si chiama «settebello»? 🃏 Voi lo giocate subito o lo tenete?\n${HT} #settebello`, ['proposta', 'proposta']],
];
const CALENDARIO_FINTO = () => {
  let id = 0;
  return CONCETTI_FINTI.flatMap(([g, ora, contenuto, formato, pilastro, concetto, didascalia, stati]) =>
    (formato === 'post' ? ['facebook', 'instagram'] : ['tiktok', 'instagram', 'facebook', 'youtube']).map((canale, i) => ({
      id: ++id, contenuto, concetto, formato, pilastro, canale, didascalia, giorno: giorno(g), ora, stato: stati[i],
      link: `https://play.google.com/store/apps/details?id=it.settebello.app&referrer=utm_source%3D${canale}%26utm_campaign%3D${formato === 'post' ? 'post' : 'video'}%26utm_content%3D${contenuto}`,
      pubblicato_url: stati[i] === 'pubblicata' ? `https://www.${canale}.com/settegames/${contenuto}` : null,
      nota: formato === 'post' ? 'post con immagine: l\'immagine si prepara col Brand Kit (G5)' : contenuto.startsWith('sbaglio') ? 'clip da produrre (SBAGLIA=1)' : null, metriche: {},
    })));
};
const COMUNITA_FINTE = [
  { id: 1, nome: 'r/italy', piattaforma: 'reddit', url: 'https://www.reddit.com/r/italy/', topic: 'Subreddit generalista italiano', membri: null, membri_nota: 'non visto', regole: 'sconosciute: leggere le regole prima di scrivere', verificata: false, stato: 'da_verificare', post_proposto: 'Scopa: a casa vostra la scopa fatta con l\'ultima carta vale o no? Ogni regione sembra fare a modo suo.', attivita: [] },
  { id: 2, nome: 'Italiani a Berlino', piattaforma: 'facebook', url: 'https://www.facebook.com/ItalienerInBerlin/', topic: 'Comunità italiana di Berlino', membri: 27891, membri_nota: 'dallo snippet di ricerca', regole: 'sconosciute: leggere prima di scrivere', verificata: false, stato: 'da_verificare', post_proposto: 'C\'è un circolo o un locale a Berlino dove si gioca ancora a scopa o a briscola dal vivo?', attivita: [] },
  { id: 3, nome: 'UIGC – Unione Italiana Gruppi Cartofili', piattaforma: 'circolo', url: 'https://www.uigc.org/', topic: 'Campionati di scopa d\'assi e scopone in Lombardia', membri: null, membri_nota: null, regole: 'non è un forum: niente da postare', verificata: true, stato: 'pronta', post_proposto: 'Nessun post: contatto diretto per le regole dei loro tornei.', attivita: [{ quando: istante(600), cosa: 'Letto il calendario 2026', chi: 'supporto.applicazioni@gmail.com' }] },
  { id: 4, nome: 'Il gioco del Tressette (forumfree)', piattaforma: 'forum', url: 'https://tressette.forumfree.it/', topic: 'Tornei di tressette', membri: 20, membri_nota: 'visti sulla pagina', regole: 'non indicate', verificata: true, stato: 'esclusa', post_proposto: 'Nessun post: forum fermo.', attivita: [] },
];
const TEMI_FINTI = [
  { id: 'carte-pilotate', nome: 'Carte pilotate / partite truccate', recensioni: 23, quota: 36, risposta: 'Mano del giorno: la stessa mano per tutti, e il mazzo mescolato dal server spiegato in chiaro', concorrenti: ['Scopa: la Sfida - Online', 'Concorrente B'], esempi: [{ nome: 'Scopa: la Sfida - Online', voto: 1, testo: 'Gioco completamente scriptato, fa perdere anche 10 partite di fila', utili: 81 }] },
  { id: 'pubblicita', nome: 'Troppa pubblicità', recensioni: 19, quota: 30, risposta: 'Posizionamento: partite senza pubblicità in mezzo al gioco («gameplay pulito»)', concorrenti: ['Scopa: la Sfida - Online', 'Concorrente C'], esempi: [{ nome: 'Scopa: la Sfida - Online', voto: 1, testo: 'Passi più tempo a vedere video che a giocare', utili: 44 }] },
  { id: 'soldi', nome: 'Spinge a pagare / gettoni', recensioni: 14, quota: 22, risposta: 'Posizionamento «si gioca gratis, senza gettoni per entrare»', concorrenti: ['Scopa: la Sfida - Online'], esempi: [] },
  { id: 'bug', nome: 'Si blocca, crash, non funziona', recensioni: 9, quota: 14, risposta: 'Stabilità misurata e scritta nella scheda', concorrenti: ['Concorrente C'], esempi: [] },
];

export async function rispondi(azione, a) {
  await new Promise((r) => setTimeout(r, 120));
  seme = 7;
  const app = APPS.find((x) => x.id === a.app);
  switch (azione) {
    case 'io': return { ok: true, email: 'supporto.applicazioni@gmail.com', ruolo: 'Super Admin', permessi: ['*'] };
    case 'app.elenco': return { ok: true, apps: APPS };
    case 'app.crea': case 'app.clona': return { ok: true };
    case 'social.stato': return {
      ok: true, configurato: true, post: [{ id: 1, clip: 'domanda-1', titolo: 'Tu cosa giocheresti? 👇', privacy: 'SELF_ONLY', stato: 'PUBLISH_COMPLETE', chi: 'supporto.applicazioni@gmail.com', creato: istante(-30) }],
      tiktok: { nome: 'SetteGames', utente: 'settegames', avatar: '/img/icona-180.png', permessi: 'user.info.basic,video.publish', collegatoDa: 'supporto.applicazioni@gmail.com',
        privacy: ['FOLLOWER_OF_CREATOR', 'MUTUAL_FOLLOW_FRIENDS', 'SELF_ONLY'], commentiSpenti: false, duettiSpenti: true, stitchSpenti: false, durataMassima: 600 },
    };
    case 'social.calendario': return { ok: true, contenuti: CALENDARIO_FINTO(), conti: { proposte: 18, approvate: 5, pubblicate: 3, scartate: 1, primo: giorno(0), ultimo: giorno(-13) } };
    case 'social.contenuto.decidi': case 'social.contenuto.pubblicato': case 'social.contenuto.metriche': case 'social.comunita.aggiorna': return { ok: true };
    case 'social.comunita': return { ok: true, comunita: COMUNITA_FINTE };
    case 'social.concorrenti': return { ok: true, giorni: 28, recensioni: 64, concorrenti: 9, temi: TEMI_FINTI };
    case 'app.aggiorna': return { ok: true, approvazione: { id: 'ap-99', stato: 'SCHEDULED', parte_il: istante(-10) } };
    case 'kpi': {
      const giorni = serieKpi(a.app === 'last-sheep' ? .6 : 1);
      return { ok: true, giorni, wau: 612, mau: 1540, retention: { d1: .41, d3: .27, d7: .18, d14: .12, d30: .07 }, crash_free_utenti: .996, crash_free_sessioni: .998 };
    }
    case 'giocatori.cerca': {
      const q = String(a.q ?? '').toLowerCase();
      return { ok: true, giocatori: GIOCATORI.filter((g) => !q || g.nome.toLowerCase().includes(q) || g.id.startsWith(q)) };
    }
    case 'giocatori.scheda': {
      const g = GIOCATORI.find((x) => x.id === a.id) ?? GIOCATORI[0];
      return {
        ok: true, giocatore: {
          ...g, avatar: null, xp: 4210, paese: 'IT', lingua: 'it', device: 'Google Pixel 7', os: 'Android 15', versione: '1.0.8',
          consensi: { privacy: '2026-09-17', annunci: 'non chiesto', analisi: 'sì' },
          app: [app?.nome ?? 'Settebello Scopa'], stato: { bandito_fino: null },
          gioco: { partite: 38, vinte: 21, sconfitte: 15, abbandoni: 2, ranking: 13, mmr: null, tornei: 3, missioni: 42 },
          economia: {
            valute: [{ nome: 'Monete', saldo: 1516 }, { nome: 'Gemme', saldo: 1468 }],
            bauli: [{ tipo: 'Argento', stato: 'in apertura', pronto: istante(-45) }],
            inventario: [{ nome: 'Napoletane classiche', categoria: 'mazzo' }, { nome: 'Dorso Golfo', categoria: 'dorso' }, { nome: 'Cornice reale', categoria: 'cornice' }],
            pass: { stagione: 'Autunno 2026', livello: 9, premium: false },
          },
          monetizzazione: {
            speso: 1.99, ultimo: istante(25), rimborsi: 0, premiVideo: 0,
            acquisti: [{ id: 'acq-1', quando: istante(25), prodotto: 'gemme_120', prezzo: 1.99, stato: 'consegnato', ordine: 'GPA.3312-0000-1111' }],
          },
          tecnica: {
            installazioni: [{ piattaforma: 'android', versione: '1.0.8', aggiornamento: '01a0d885', ultima: istante(12) }],
            errori: [{ quando: istante(31), messaggio: 'TypeError: undefined is not an object (Tavolo)' }],
            disconnessioni: 1,
          },
        },
      };
    }
    case 'giocatori.timeline': return { ok: true, eventi: EVENTI.map(([m, tipo, testo]) => ({ quando: istante(m), tipo, testo })) };
    case 'giocatori.accredita': case 'giocatori.blocca': case 'giocatori.sblocca': case 'giocatori.nome':
      return { ok: true };
    case 'partite.cerca': return {
      ok: true, partite: Array.from({ length: 8 }, (_, i) => ({
        id: `p-${1000 + i}-${(i * 7919).toString(16)}`, gioco: 'Scopa', modo: i % 3 ? 'Col computer' : 'Online', stato: i ? 'finita' : 'in corso',
        inizio: istante(20 + i * 35), fine: i ? istante(14 + i * 35) : null,
        giocatori: [{ nome: 'Giorgio', id: GIOCATORI[0].id }, { nome: i % 2 ? 'Tino (bot)' : 'Marta88', bot: i % 2 === 1 }],
        risultato: i ? `${tra(6, 11)} a ${tra(3, 10)}` : '—',
      })),
    };
    case 'partite.scheda': return {
      ok: true, partita: {
        id: a.id, gioco: 'Scopa', modo: 'Online', tavolo: 'L\'Osteria', stato: 'finita', inizio: istante(55), fine: istante(49),
        giocatori: [{ nome: 'Giorgio', id: GIOCATORI[0].id, punti: 11, premio: 200 }, { nome: 'Marta88', id: GIOCATORI[1].id, punti: 7, premio: 0 }],
        disconnessioni: [{ quando: istante(52), chi: 'Marta88', durata_s: 8 }],
        timeline: [
          { quando: istante(55), chi: 'arbitro', testo: 'Distribuzione: 3 carte a testa, 4 in tavola' },
          { quando: istante(54.5), chi: 'Giorgio', testo: 'Gioca 5 di denari, prende 5 di coppe' },
          { quando: istante(54), chi: 'Marta88', testo: 'Gioca re di spade' },
          { quando: istante(52), chi: 'arbitro', testo: 'Marta88 perde la linea (8 s), torna' },
          { quando: istante(50), chi: 'Giorgio', testo: 'Scopa col fante' },
          { quando: istante(49), chi: 'arbitro', testo: 'Fine: 11 a 7, premi pagati dalla cassa' },
        ],
      },
    };
    case 'config.leggi': return {
      ok: true, versione: 4, aggiornato: istante(3000),
      valori: { ...(app?.config ?? {}), raddoppiAlGiorno: 1, missioniAlGiorno: 3, bonus: { giriAlGiorno: 3, base: 17, moltiplicatore: 3 },
        esperimenti: [{ id: 'spot-ogni-2', nome: 'Uno spot ogni due mani', quota: 50, variante: { annunci: { maniPerAnnuncio: 2 } }, dal: istante(9000), al: null }] },
    };
    case 'config.versioni': return {
      ok: true, versioni: [
        { versione: 5, quando: istante(30), admin: 'supporto.applicazioni@gmail.com', motivo: 'Venerdì monete doppie', stato: 'programmata', scope: 'Settebello Scopa', inizio: new Date(oggi + 4 * 86400000).toISOString(), fine: new Date(oggi + 5 * 86400000).toISOString(), valori: { evento: { nome: 'Monete doppie', moltiplicatoreMonete: 2 } } },
        { versione: 4, quando: istante(3000), admin: 'supporto.applicazioni@gmail.com', motivo: 'Un raddoppio al giorno', stato: 'live', scope: 'Settebello Scopa', valori: { raddoppiAlGiorno: 1, missioniAlGiorno: 3, versioneMinima: '1.0.7' } },
        { versione: 3, quando: istante(9000), admin: 'supporto.applicazioni@gmail.com', motivo: 'Versione minima 1.0.7', stato: 'passata', scope: 'Settebello Scopa', valori: { raddoppiAlGiorno: 3, missioniAlGiorno: 3, versioneMinima: '1.0.7' } },
        { versione: 2, quando: istante(20000), admin: 'supporto.applicazioni@gmail.com', motivo: 'Prima configurazione', stato: 'passata', scope: 'Settebello Scopa', valori: { raddoppiAlGiorno: 3, missioniAlGiorno: 3, versioneMinima: '1.0.0' } },
      ],
    };
    case 'config.proponi': case 'config.ripristina': case 'config.rollback': case 'config.clona':
      return { ok: true, approvazione: { id: 'ap-100', stato: 'SCHEDULED', parte_il: istante(-10) } };
    case 'approvazioni.elenco': return {
      ok: true, approvazioni: [
        { id: 'ap-100', app: 'settebello-scopa', tipo: 'Configurazione', stato: 'SCHEDULED', proposto_da: 'supporto.applicazioni@gmail.com', quando: istante(2), motivo: 'Bonus weekend', riassunto: 'bonus.base 17 → 20', parte_il: istante(-8) },
        { id: 'ap-98', app: 'settebello-scopa', tipo: 'Regalo a tutti', stato: 'LIVE', proposto_da: 'supporto.applicazioni@gmail.com', quando: istante(4000), motivo: 'Scuse per il fermo', riassunto: '+300 monete a 1.204 giocatori', parte_il: istante(3990) },
      ],
    };
    case 'approvazioni.decidi': return { ok: true };
    case 'errori': return {
      ok: true, errori: [
        { messaggio: 'TypeError: undefined is not an object (Tavolo)', dove: 'app', conteggio: 14, utenti: 5, versioni: ['1.0.8'], primo: istante(900), ultimo: istante(31) },
        { messaggio: 'cassa: il salvataggio cambia troppo in fretta', dove: 'server', funzione: 'cassa', conteggio: 3, utenti: 2, versioni: [], primo: istante(2000), ultimo: istante(300) },
        { messaggio: 'Network request failed (misure)', dove: 'app', conteggio: 41, utenti: 17, versioni: ['1.0.7', '1.0.8'], primo: istante(9000), ultimo: istante(5) },
      ],
    };
    case 'salute': return {
      ok: true, controllato: istante(1), servizi: [
        { nome: 'Database', stato: 'operational' }, { nome: 'Accesso', stato: 'operational' },
        { nome: 'Cassa (economia)', stato: 'operational' }, { nome: 'Arbitro (partite)', stato: 'operational' },
        { nome: 'Lavori pianificati', stato: 'operational', dettaglio: 'ultimo giro 4 s fa' },
        { nome: 'Pagamenti Google', stato: 'degraded', dettaglio: 'nessun acquisto vero ancora provato' },
        { nome: 'Pubblicità', stato: 'spento', dettaglio: 'spenta per scelta (AdMob in approvazione)' },
      ],
    };
    case 'allarmi': return {
      ok: true, allarmi: [
        { id: 'al-3', severita: 'WARNING', app: 'settebello-scopa', titolo: 'Errori app 1.0.8 in aumento (+40% in un\'ora)', quando: istante(30), stato: 'aperto' },
        { id: 'al-2', severita: 'INFO', app: 'settebello-scopa', titolo: 'Pubblicata la 1.0.8 sul test chiuso', quando: istante(300), stato: 'chiuso' },
      ],
    };
    case 'acquisti': return {
      ok: true, acquisti: [
        { id: 'acq-1', quando: istante(25), giocatore: GIOCATORI[0].id, nome: 'Giorgio', prodotto: 'gemme_120', prezzo: 1.99, stato: 'consegnato', ordine: 'GPA.3312-0000-1111' },
        { id: 'acq-2', quando: istante(700), giocatore: GIOCATORI[1].id, nome: 'Marta88', prodotto: 'starter', prezzo: 2.99, stato: 'consegnato', ordine: 'GPA.3312-0000-2222' },
        { id: 'acq-3', quando: istante(4000), giocatore: GIOCATORI[1].id, nome: 'Marta88', prodotto: 'gemme_50', prezzo: 0.99, stato: 'rimborsato', ordine: 'GPA.3312-0000-3333' },
      ],
    };
    case 'acquisti.rimborsa': return { ok: true, acquisto: a.id, revoca: 'revocato' };
    case 'problemi': {
      const tutti = [
        { id: 'pr-1', profilo_id: GIOCATORI[1].id, giocatore: 'Marta88', testo: 'Il tavolo si è bloccato dopo la scopa, non potevo più giocare', dove: 'tavolo', partita_id: 'p-1000-0', versione: '1.0.8', aggiornamento: '01a0d885', telefono: 'Samsung SM-A546B · Android 14', creata_il: istante(18), letta_il: null, letta_da: null },
        { id: 'pr-2', profilo_id: GIOCATORI[2].id, giocatore: 'Giocatore 4685', testo: 'Non mi è arrivato il baule della missione', dove: 'impostazioni', partita_id: null, versione: '1.0.7', aggiornamento: null, telefono: 'Xiaomi 2201117TY · Android 13', creata_il: istante(400), letta_il: null, letta_da: null },
        { id: 'pr-3', profilo_id: GIOCATORI[0].id, giocatore: 'Giorgio', testo: 'Prova della segnalazione', dove: 'impostazioni', partita_id: null, versione: '1.0.8', aggiornamento: '01a0d885', telefono: 'Google Pixel 7 · Android 15', creata_il: istante(3000), letta_il: istante(2900), letta_da: 'supporto.applicazioni@gmail.com' },
      ];
      return { ok: true, problemi: a.soloNonLette ? tutti.filter((x) => !x.letta_il) : tutti };
    }
    case 'percorso': {
      // Trenta coorti finte: aprono → iniziano → finiscono → tornano, con la prima carta in secondi.
      const giorni = Array.from({ length: 30 }, (_, i) => {
        const nuove = 20 + ((i * 7) % 13);
        const iniziano = Math.round(nuove * .86), una = Math.round(nuove * .71), due = Math.round(nuove * .48);
        return {
          giorno: new Date(Date.now() - (29 - i) * 86400000).toISOString().slice(0, 10), nuove, iniziano,
          finiscono_una: una, finiscono_due: due,
          d1_possibili: i <= 28 ? nuove : null, d1: i <= 28 ? Math.round(nuove * .38) : null,
          d7_possibili: i <= 22 ? nuove : null, d7: i <= 22 ? Math.round(nuove * .16) : null,
          con_prima_carta: iniziano, prima_carta_mediana_s: 40 + (i % 9) * 3,
        };
      });
      const somma = (k) => giorni.reduce((s, g) => s + (g[k] ?? 0), 0);
      return { ok: true, giorni, totali: {
        nuove: somma('nuove'), iniziano: somma('iniziano'), finiscono_una: somma('finiscono_una'), finiscono_due: somma('finiscono_due'),
        d1_possibili: somma('d1_possibili'), d1: somma('d1'), d7_possibili: somma('d7_possibili'), d7: somma('d7'),
        con_prima_carta: somma('con_prima_carta'), prima_carta_s: 51.5,
      }, note: { coorti: 'dati finti della modalità prova' } };
    }
    case 'missioni.leggi': {
      const giorno = [
        { id: 'play', testo: 'Gioca {n} partite', goal: 3, monete: 15, passXp: 22 }, { id: 'win', testo: 'Vinci {n} partite', goal: 2, monete: 30, passXp: 40 },
        { id: 'scopa', testo: 'Fai {n} scope', goal: 3, monete: 35, passXp: 50 }, { id: 'bluff', testo: 'Vinci a Scopa bugiarda', goal: 1, monete: 40, passXp: 60, giochi: ['bugiarda'] },
      ];
      const settimana = [{ id: 'play40', testo: 'Gioca {n} partite', goal: 40, monete: 0, passXp: 260 }, { id: 'win20', testo: 'Vinci {n} partite', goal: 20, monete: 0, passXp: 300 },
        { id: 'scopa30', testo: 'Fai {n} scope', goal: 30, monete: 0, passXp: 280 }, { id: 'sette12', testo: 'Prendi {n} settebelli', goal: 12, monete: 0, passXp: 280 }, { id: 'hard8', testo: 'Batti {n} Esperti o Maestri', goal: 8, monete: 0, passXp: 320 }];
      return { ok: true, giorno, settimana, dalPannello: { giorno: false, settimana: false }, diCasa: { giorno, settimana },
        famiglie: ['winsette', 'winscopa', 'online', 'scopa', 'sette', 'hard', 'play', 'win'],
        giochi: [{ id: 'scopa', nome: 'Scopa' }, { id: 'bugiarda', nome: 'Scopa bugiarda' }],
        tetti: { goal: 100, moneteGiorno: 300, moneteSettimana: 0, passXp: 600, minimoGiorno: 3, minimoSettimana: 5 } };
    }
    case 'posta.elenco': return { ok: true, messaggi: [
      { id: 'p1', titolo: 'Scusate il disservizio', testo: 'Un regalo per la pausa di ieri', monete: 500, gemme: 0, per_tutti: true, destinatari: 0, creata_il: istante(600), scade_il: istante(-9000), creata_da: 'supporto.applicazioni@gmail.com', letti: 6, ritirati: 5 },
      { id: 'p2', titolo: 'Grazie per la segnalazione', testo: '', monete: 0, gemme: 20, per_tutti: false, destinatari: 1, creata_il: istante(3000), scade_il: istante(-6000), creata_da: 'supporto.applicazioni@gmail.com', letti: 1, ritirati: 1 },
    ] };
    case 'posta.manda': return { ok: true, id: 'p3' };
    case 'assistenza.elenco': return { ok: true, conti: { aperta: 2, in_corso: 1, risolta: 4 }, richieste: [
      { id: 'pr-1', profilo_id: GIOCATORI[1].id, giocatore: 'Marta88', testo: 'Ho comprato le gemme ma non sono arrivate', dove: 'impostazioni', versione: '1.0.9', telefono: 'Samsung SM-A536B · Android 14', creata_il: istante(90), stato: 'aperta', seguita_da: null, note: 0, risposte: 0 },
      { id: 'pr-2', profilo_id: GIOCATORI[2].id, giocatore: 'Giocatore 4685', testo: 'Non mi è arrivato il baule della missione', dove: 'impostazioni', versione: '1.0.7', telefono: 'Xiaomi 2201117TY · Android 13', creata_il: istante(400), stato: 'aperta', seguita_da: null, note: 0, risposte: 0 },
      { id: 'pr-3', profilo_id: GIOCATORI[0].id, giocatore: 'Giorgio', testo: 'La partita si è bloccata alla terza mano', dove: 'tavolo', versione: '1.0.8', telefono: 'Google Pixel 7 · Android 15', creata_il: istante(3000), stato: 'in_corso', seguita_da: 'supporto.applicazioni@gmail.com', note: 1, risposte: 0 },
    ] };
    case 'assistenza.scheda': return { ok: true, giocatore: { nome: 'Marta88', livello: 7 },
      richiesta: { id: 'pr-1', profilo_id: GIOCATORI[1].id, testo: 'Ho comprato le gemme ma non sono arrivate', dove: 'impostazioni', versione: '1.0.9', telefono: 'Samsung SM-A536B · Android 14', creata_il: istante(90), stato: 'aperta', seguita_da: null,
        note: [{ quando: istante(60), chi: 'supporto.applicazioni@gmail.com', tipo: 'nota', testo: 'Controllo l\'ordine su Play' }] },
      contesto: { richieste: 1, partite: [{ id: 'p-1', modo: 'scopa', tavolo: 'osteria', stato: 'finita', creata: istante(120), motivo: 'conta', vinta: true }],
        acquisti: [{ prodotto: 'gemme_120', stato: 'valido', quando: istante(100), ordine: 'GPA.3312-0000-1111-22222' }], errori: [],
        telefoni: [{ piattaforma: 'android', versione: '1.0.9', ultima: istante(30), aperture: 12 }], posta: [] } };
    case 'assistenza.aggiorna': return { ok: true };
    case 'moderazione.coda': return { ok: true, giocatori: [
      { id: GIOCATORI[2].id, nome: 'Giocatore 4685', livello: 5, quante: 3, da_quanti: 2, aperte: 3, ultima: istante(50), prima: istante(900), motivi: { offensivo: 2, nome: 1 }, ha_segnalato: 0, decise_prima: 0,
        segnalazioni: [{ id: 's1', motivo: 'offensivo', nota: 'frasi pesanti a fine mano', quando: istante(50), chi: 'Marta88', stato: 'aperta', partita: 'p-1001-1eef' },
          { id: 's2', motivo: 'offensivo', nota: null, quando: istante(300), chi: 'Tino', stato: 'aperta' }, { id: 's3', motivo: 'nome', nota: null, quando: istante(900), chi: 'Tino', stato: 'aperta' }] },
    ] };
    case 'moderazione.decidi': return { ok: true, chiuse: 3 };
    case 'crescita.cruscotto': {
      const serie = Array.from({ length: 21 }, (_, i) => ({ giorno: giorno(20 - i), nuovi: [0, 1, 0, 2, 1, 3, 1, 9, 2, 1, 4, 6, 8, 12, 15, 18, 22, 30, 35, 41, 44][i],
        attivati: [0, 1, 0, 1, 1, 2, 1, 4, 1, 1, 3, 4, 6, 9, 11, 13, 17, 23, 26, 31, 33][i], attivi: 5 + i, giorno_programma: i - 13, target: Math.max(0, (i - 13) * 40) }));
      return { ok: true, programma: { app: 'settebello-scopa', giorno1: giorno(7), giorni: 90 }, oggi: giorno(0), serie,
        cumulato: 245, cumulato_attivati: 184, prima_del_programma: 26,
        retention: { d1: [41, 112], d7: [6, 40], attivazione: [184, 245] },
        scheda: { voto: 4.6, recensioni: 21, fascia: '100+', titolo: 'Scopa Online: Scopone e Carte' },
        parole: [
          { parola: 'scopone scientifico', cluster: 'varianti', volume: 4, difficolta: 3, rilevanza: 5, oggi: 9, settimana_fa: 14, migliore: 9, primi: ['com.digitalmoka.scopadalnegro'] },
          { parola: 'scopa online', cluster: 'core', volume: 4, difficolta: 4, rilevanza: 5, oggi: null, settimana_fa: null, migliore: null, primi: ['com.WhatWapp.Scopa'] },
          { parola: 'scopa bugiarda', cluster: 'varianti', volume: 1, difficolta: 1, rilevanza: 5, oggi: 1, settimana_fa: 2, migliore: 1, primi: ['it.settebello.app'] },
          { parola: 'carte napoletane', cluster: 'carte', volume: 3, difficolta: 4, rilevanza: 4, oggi: null, settimana_fa: null, migliore: null, primi: ['com.digitalmoka.briscoladalnegro'] }],
        concorrenti: [{ pacchetto: 'com.WhatWapp.Scopa', nome: 'Scopa: la Sfida - Online', sviluppatore: 'Whatwapp Entertainment', installazioni: 12342955, fascia: '10.000.000+', voto: 4.33, recensioni: 229524, aggiornata: '1 ott 2026' }],
        esperimenti: [
          { id: 'EXP-0002', stato: 'NOW', titolo: 'Dalla lezione dritti alla prima partita', ipotesi: 'Il tasto GIOCA LA PRIMA PARTITA alza l\'attivazione', metrica: 'attivati / nuovi', baseline: '7 su 13', target: '≥ 75%', ice: 24, inizio: giorno(1) },
          { id: 'EXP-0006', stato: 'NEXT', titolo: 'Mano del giorno nell\'app', ipotesi: 'La stessa mano per tutti fa tornare ogni giorno', metrica: 'D7', ice: 6.7 }],
        registro: [{ quando: istante(60), agente: 'ANALYST', azione: 'Raccolta del giorno: 30 parole lette, compariamo in 3', perche: 'routine del mattino (§48)', effetto_atteso: '', stato: 'FATTO' }],
        inviti: { mandati: 7, mandati_con_codice: 5, clic: 3, clic_web: 2, clic_app: 1, account_invitati: 2, giocano: 40 } };
    }
    case 'crescita.raccogli': return { ok: true, parole: 30, comparsi: 3 };
    case 'crescita.esperimento': return { ok: true, id: 'EXP-0007' };
    // Con `?prova=1&vuote=1` le recensioni sono zero, come il 7 ott 2026: si vede lo stato vuoto.
    case 'crescita.recensioni': return new URLSearchParams(location.search).has('vuote')
      ? { ok: true, da: giorno(6), a: giorno(0), quante: 0, con_testo: 0, voto: null, senza_risposta: 0, per_voto: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }, prima: { quante: 0, voto: null }, totale: 0, categorie: [], problemi: [], richieste: [], positivi: [], ultime: [], nomi: {} }
      : { ok: true, da: giorno(6), a: giorno(0), quante: 9, con_testo: 8, voto: 4.1, senza_risposta: 3, per_voto: { 1: 1, 2: 1, 3: 0, 4: 2, 5: 5 }, prima: { quante: 4, voto: 4.5 }, totale: 21,
        nomi: { bug: 'Bug', matchmaking: 'Matchmaking', carte: 'Carte', fairness: 'Fairness', pubblicita: 'Pubblicità', ux: 'UX', prestazioni: 'Prestazioni', multiplayer: 'Multiplayer', richieste: 'Richieste di funzionalità', complimenti: 'Complimenti', monetizzazione: 'Monetizzazione', account: 'Account' },
        categorie: [{ categoria: 'complimenti', n: 6, problemi: 0, richieste: 0, positivi: 6, voto: 4.8 }, { categoria: 'matchmaking', n: 2, problemi: 2, richieste: 0, positivi: 0, voto: 2.5 }, { categoria: 'richieste', n: 2, problemi: 0, richieste: 2, positivi: 0, voto: 4.5 }],
        problemi: [{ categoria: 'matchmaking', motivo: 'troppa attesa per trovare un avversario', n: 2, voto: 2.5, esempio: 'Bello ma ci mette troppo a trovare un avversario' }],
        richieste: [{ categoria: 'richieste', motivo: 'altri giochi di carte', n: 2, voto: 4.5, esempio: 'Mettete anche la briscola!' }],
        positivi: [{ categoria: 'complimenti', motivo: 'come una volta, la tradizione', n: 3, voto: 5, esempio: 'Mi ricorda le partite col nonno' }, { categoria: 'complimenti', motivo: 'bello, fatto bene', n: 3, voto: 4.7, esempio: 'Bellissimo, carte grandi' }],
        ultime: [{ id: 'r1', quando: istante(300), voto: 5, testo: 'Mi ricorda le partite col nonno', versione: '1.0.9', categorie: ['complimenti'], tono: 'positivo', risposta: false },
          { id: 'r2', quando: istante(900), voto: 2, testo: 'Bello ma ci mette troppo a trovare un avversario', versione: '1.0.9', categorie: ['matchmaking', 'complimenti'], tono: 'problema', risposta: true }] };
    case 'crescita': return { ok: true, nati: 23, perFonte: [{ fonte: 'google-play', n: 9 }, { fonte: 'non si sa (prima della 1.0.9)', n: 12 }, { fonte: 'invito', n: 2 }],
      perGiorno: [{ giorno: giorno(4), fonte: 'google-play', n: 3 }, { giorno: giorno(2), fonte: 'google-play', n: 6 }, { giorno: giorno(2), fonte: 'invito', n: 2 }, { giorno: giorno(9), fonte: 'non si sa (prima della 1.0.9)', n: 5 }],
      inviti: { mandati: 7, mandati_con_codice: 5, da_quanti: 3, aperti: 2, condivisioni: 1, clic: 3, clic_web: 2, clic_app: 1, clic_tavolo: 1, account_invitati: 2,
        prime_partite_invitati: 2, partite_insieme: 1, partite_fra_amici: 4, giocano: 14, dove: { fine_partita: 5, amici: 2 } },
      chiInvita: [{ id: GIOCATORI[1].id, nome: 'Marta88', invitati: 2 }] };
    case 'esperimenti.risultati': return { ok: true, id: a.id, gruppi: {
      variante: { telefoni: 31, d1: [12, 28], d7: [5, 19], aperture_al_giorno: 1.8, partite_al_giorno: 6.2, spot_al_giorno: 3.1, acquisti: 1, paganti: 1 },
      controllo: { telefoni: 29, d1: [13, 27], d7: [6, 18], aperture_al_giorno: 1.7, partite_al_giorno: 5.4, spot_al_giorno: 5.6, acquisti: 2, paganti: 2 } } };
    case 'analisi.catalogo': return { ok: true, eventi: [
      { nome: 'schermata', quanti: 1601, telefoni: 14, proprieta: [{ chiave: 'nome', n: 1601, esempi: ['home', 'negozio'] }] },
      { nome: 'partita', quanti: 537, telefoni: 11, proprieta: [{ chiave: 'gioco', n: 537, esempi: ['scopa', 'scientifico'] }, { chiave: 'vinta', n: 537, esempi: ['true', 'false'] }, { chiave: 'secondi', n: 537, esempi: ['100'] }] },
      { nome: 'avvio', quanti: 109, telefoni: 14, proprieta: [] }] };
    case 'analisi.eventi': return { ok: true, quanti: 537, telefoni: 11, per: [{ valore: 'scopa', n: 469, telefoni: 9 }, { valore: 'scientifico', n: 53, telefoni: 4 }, { valore: 'assopiglia', n: 15, telefoni: 4 }],
      ultimi: [{ quando: istante(5), dati: { gioco: 'scopa', vinta: true, punti: 4, secondi: 100 }, versione: '1.0.9', giocatore: 'Diablo', profilo_id: GIOCATORI[1].id }] };
    case 'analisi.imbuto': return { ok: true, passi: [{ passo: 'nati nel periodo', quanti: 20 }, { passo: 'avvio', quanti: 20 }, { passo: 'partita_iniziata', quanti: 17 }, { passo: 'prima_carta', quanti: 12 }, { passo: 'partita', quanti: 9 }, { passo: 'partita', quanti: 8 }] };
    case 'analisi.coorti': return { ok: true, per: 'giorno', coorti: [
      { gruppo: giorno(9), quanti: 3, d1: [1, 3], d3: [1, 3], d7: [1, 3], d14: [0, 0], d30: [0, 0], partite: 12.3, paganti: 0 },
      { gruppo: giorno(2), quanti: 9, d1: [2, 9], d3: [0, 0], d7: [0, 0], d14: [0, 0], d30: [0, 0], partite: 3.1, paganti: 1 }] };
    case 'rischio': return { ok: true, giorni: 30, guardati: 14, giocatori: [
      { id: GIOCATORI[2].id, nome: 'Giocatore 4685', livello: 5, punti: 50, escluso: false, visto: istante(30), motivi: [
        { k: 'video', peso: 30, perche: '5 video premiati in un giorno' }, { k: 'riallineati', peso: 20, perche: '4200 monete arrivate da riallineamenti del telefono' }] },
      { id: GIOCATORI[1].id, nome: 'Marta88', livello: 9, punti: 15, escluso: false, visto: istante(300), motivi: [{ k: 'rimborsi', peso: 15, perche: '1 acquisti rimborsati' }] },
    ] };
    case 'giochi': return { ok: true, persone: 14,
      delGiorno: { periodo: { attivi: 21, giochini: 5, mano: 2, bauli: 14 }, mensole: { persone: 24, bauli: 59, fermi: 48, personeConFermi: 22, inApertura: 11 },
        perGiorno: [['2026-10-05', 7, 2, 0, 5, 2, 3], ['2026-10-06', 7, 1, 0, 3, 2, 5], ['2026-10-07', 11, 3, 1, 5, 3, 3], ['2026-10-08', 7, 3, 2, 3, 2, 2]]
          .map(([giorno, attivi, g, mano, avviano, aprono, aperti]) => ({ giorno, attivi, giochini: g, ruota: g, carta: g, tre: g, mano, manoGiuste: mano, avviano, aprono, aperti, conGemme: 0 })) }, nomi: { scopa: 'Scopa', scientifico: 'Scopone scientifico', assopiglia: 'Asso piglia tutto', bugiarda: 'Scopa bugiarda' },
      giochi: [
        { gioco: 'scopa', partite: 469, persone: 12, perPersona: 39.1, secondi: 104, vinte: 260, online: 456, torneo: 3, giorni: 9, abbandoni: 7, tornati: 6 },
        { gioco: 'scientifico', partite: 53, persone: 4, perPersona: 13.3, secondi: 280, vinte: 25, online: 44, torneo: 0, giorni: 4, abbandoni: 2, tornati: 2 },
        { gioco: 'assopiglia', partite: 17, persone: 5, perPersona: 3.4, secondi: 90, vinte: 9, online: 9, torneo: 0, giorni: 3, abbandoni: 1, tornati: 1 },
        { gioco: 'bugiarda', partite: 4, persone: 1, perPersona: 4, secondi: 150, vinte: 2, online: 3, torneo: 0, giorni: 2, abbandoni: 4, tornati: 1 },
      ],
      perGiorno: [{ giorno: giorno(3), gioco: 'scopa', partite: 120 }, { giorno: giorno(2), gioco: 'scopa', partite: 160 }, { giorno: giorno(2), gioco: 'scientifico', partite: 20 }, { giorno: giorno(1), gioco: 'scopa', partite: 50 }, { giorno: giorno(1), gioco: 'assopiglia', partite: 8 }] };
    case 'negozio.leggi': {
      const casa = { pacchiMonete: [{ monete: 1500, gemme: 10 }, { monete: 5000, gemme: 32 }, { monete: 12000, gemme: 74 }, { monete: 30000, gemme: 178 }, { monete: 80000, gemme: 460 }, { monete: 200000, gemme: 1120 }],
        noAds: [45, 130], pass: { gemme: 550, monete: 25000 }, prezzi: { salvadanaio: 120, dueBauli: 400, missioniNuove: 75 }, starter: { gemme: 300, monete: 4000 },
        offerte: { starter: { accesa: true, partite: 3 }, torneo: { accesa: true, gemmeSotto: 40 }, club: { accesa: true, partite: 40 } } };
      return { ok: true, inUso: JSON.parse(JSON.stringify(casa)), diCasa: casa, dalPannello: false, noAdsGiorni: [7, 30],
        limiti: { monete: [100, 1000000], gemmePacco: [1, 5000], noAds: [5, 1000], passGemme: [311, 5000], passMonete: [1000, 500000], salvadanaio: [10, 1000], dueBauli: [50, 3000], missioniNuove: [10, 500], starterGemme: [0, 2000], starterMonete: [0, 50000], partiteStarter: [0, 500], gemmeSotto: [0, 2000], partiteClub: [0, 2000] },
        pacchiGemme: [{ gemme: 50, euro: 0.99 }, { gemme: 120, euro: 1.99 }, { gemme: 310, euro: 4.49 }],
        prodotti: [{ id: 'gemme_50', tipo: 'consumabile', nome: '50 gemme', euro: '0,99 €', venduti: 1, altri: 0 }, { id: 'starter', tipo: 'unaVolta', nome: 'Pacchetto di benvenuto', euro: '2,99 €', venduti: 0, altri: 0 }, { id: 'club_mensile', tipo: 'abbonamento', nome: 'Settebello Club', euro: '3,99 €', venduti: 0, altri: 0 }] };
    }
    case 'segmenti.leggi': return { ok: true, segmenti: [
      { k: 'attivi_7', nome: 'Attivi', descrizione: 'ha giocato negli ultimi 7 giorni', quanti: 9, anteprima: ['Giocatore 4685', 'Mario', 'Lucia'] },
      { k: 'inattivi_7', nome: 'Inattivi da 7 giorni', descrizione: 'visto l\'ultima volta fra 7 e 30 giorni fa', quanti: 4, anteprima: ['Peppe', 'Anna'] },
      { k: 'paganti', nome: 'Paganti', descrizione: 'almeno un acquisto in euro', quanti: 1, anteprima: ['Mario'] },
    ] };
    case 'economia': {
      // Quattordici giorni finti: il tavolo muove tanto, i regali stanno sotto il tetto.
      const giorni = Array.from({ length: 14 }, (_, i) => ({
        giorno: giorno(13 - i), monete_in: 9000 + (i % 5) * 900, monete_out: 8200 + (i % 4) * 700,
        gemme_in: 30 + i, gemme_out: 20 + (i % 3) * 5, monete_regalate: 2100 + (i % 6) * 150, giocatori: 6 + (i % 4),
      }));
      const cause = [
        ['mano', 'tavolo', 52000, 0, 40, 0], ['gettone', 'tavolo', 0, 61000, 0, 0], ['pass', 'regalo', 9000, 0, 55, 0],
        ['baule', 'regalo', 7000, 0, 0, 30], ['regalo', 'regalo', 4200, 0, 0, 0], ['missione', 'regalo', 3600, 0, 0, 0],
        ['bonus', 'regalo', 2400, 0, 0, 0], ['negozio', 'regalo', 0, 6000, 0, 900], ['acquisto', 'fuori', 0, 0, 1400, 0],
      ].map(([causa, genere, mi, mo, gi, go]) => ({ causa, genere, monete_in: mi, monete_out: mo, gemme_in: gi, gemme_out: go, righe: 40, giocatori: 7 }));
      return { ok: true, giorni, cause,
        totali: { monete_in: 130000, monete_out: 118000, gemme_in: 600, gemme_out: 350, monete_regalate: 32000, giocatori: 9, giocatore_giorni: 96, regalate_per_giocatore_giorno: 333 },
        saldi: { giocatori: 9, monete_media: 4100, monete_mediana: 2600, monete_p90: 9800, monete_max: 21000, gemme_media: 31.5, gemme_mediana: 22, gemme_max: 140 },
        teorico: [['osteria', "L'Osteria", 1020, 1100], ['circolo', 'Il Circolo', 1500, 1800], ['villa', 'La Villa', 2300, 2900]]
          .map(([tavolo, nome, monete, tetto]) => ({ tavolo, nome, monete, tetto, quota: monete / tetto, gemme: 3.9 })),
        peggiore: { tavolo: 'osteria', quota: 0.93 }, tettoGemme: 4.2 };
    }
    case 'problemi.letto': return { ok: true, id: a.id, letta_il: istante(0), letta_da: 'supporto.applicazioni@gmail.com' };
    case 'versioni': return {
      ok: true,
      store: [
        { store: 'Google Play', canale: 'Test interno', versione: '1.0.8', build: 12, data: istante(60), stato: 'completata' },
        { store: 'Google Play', canale: 'Test chiuso (alpha)', versione: '1.0.8', build: 12, data: istante(60), stato: 'completata' },
        { store: 'Google Play', canale: 'Produzione', versione: null, build: null, data: null, stato: 'non ancora' },
      ],
      adozione: [{ versione: '1.0.8', installazioni: 3 }, { versione: '1.0.7', installazioni: 2 }],
      ota: [{ ramo: 'produzione', runtime: '1.0.8', id: '01a0d885', data: istante(120) }, { ramo: 'produzione', runtime: '1.0.7', id: '01a0d886', data: istante(120) }],
    };
    case 'registro': return {
      ok: true, voci: [
        { quando: istante(2), admin: 'supporto.applicazioni@gmail.com', azione: 'config.proponi', app: 'settebello-scopa', bersaglio: 'configurazione', prima: { 'bonus.base': 17 }, dopo: { 'bonus.base': 20 }, motivo: 'Bonus weekend', ip: '93.4x.xx.xx' },
        { quando: istante(1500), admin: 'supporto.applicazioni@gmail.com', azione: 'giocatori.accredita', app: 'settebello-scopa', bersaglio: GIOCATORI[0].id, prima: { monete: 1016 }, dopo: { monete: 1516 }, motivo: 'Compensazione partita interrotta', ip: '93.4x.xx.xx' },
        { quando: istante(1600), admin: 'supporto.applicazioni@gmail.com', azione: 'accesso', app: null, bersaglio: null, prima: null, dopo: null, motivo: null, ip: '93.4x.xx.xx' },
      ],
    };
    case 'amministratori': return { ok: true, amministratori: [{ email: 'supporto.applicazioni@gmail.com', ruolo: 'Super Admin', attivo: true, mfa: true, ultimo: istante(1) }] };
    case 'ruoli': return {
      ok: true, ruoli: [
        { nome: 'Super Admin', permessi: ['*'] },
        { nome: 'Customer Support', permessi: ['giocatori.leggi', 'giocatori.accredita:500', 'partite.leggi'] },
        { nome: 'Live Ops', permessi: ['config.proponi', 'eventi.*'] },
        { nome: 'Marketing', permessi: ['crm.push', 'kpi.leggi'] },
        { nome: 'Analyst', permessi: ['kpi.leggi', 'partite.leggi'] },
      ],
    };
    default: return { ok: false, errore: `azione di prova sconosciuta: ${azione}` };
  }
}
