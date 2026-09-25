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
  'config.scrivi', 'errori', 'salute', 'acquisti', 'versioni'];

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

export async function rispondi(azione, a) {
  await new Promise((r) => setTimeout(r, 120));
  seme = 7;
  const app = APPS.find((x) => x.id === a.app);
  switch (azione) {
    case 'io': return { ok: true, email: 'supporto.applicazioni@gmail.com', ruolo: 'Super Admin', permessi: ['*'] };
    case 'app.elenco': return { ok: true, apps: APPS };
    case 'app.crea': case 'app.clona': return { ok: true };
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
            acquisti: [{ quando: istante(25), prodotto: 'gemme_120', prezzo: 1.99, stato: 'consegnato', ordine: 'GPA.3312-0000-1111' }],
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
      valori: { ...(app?.config ?? {}), raddoppiAlGiorno: 1, missioniAlGiorno: 3, bonus: { giriAlGiorno: 3, base: 17, moltiplicatore: 3 } },
    };
    case 'config.versioni': return {
      ok: true, versioni: [
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
        { quando: istante(25), giocatore: GIOCATORI[0].id, nome: 'Giorgio', prodotto: 'gemme_120', prezzo: 1.99, stato: 'consegnato', ordine: 'GPA.3312-0000-1111' },
        { quando: istante(700), giocatore: GIOCATORI[1].id, nome: 'Marta88', prodotto: 'starter', prezzo: 2.99, stato: 'consegnato', ordine: 'GPA.3312-0000-2222' },
        { quando: istante(4000), giocatore: GIOCATORI[1].id, nome: 'Marta88', prodotto: 'gemme_50', prezzo: 0.99, stato: 'rimborsato', ordine: 'GPA.3312-0000-3333' },
      ],
    };
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
