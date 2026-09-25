/**
 * L'UNICA PORTA VERSO IL SERVER
 * =============================
 *
 * La pagina non parla mai coi database (§89): ogni dato passa dalla funzione
 * `controllo` (server/funzioni/controllo/LEGGIMI.md), che controlla chi sei
 * (sessione `aal2`), cosa puoi fare (ruolo) e scrive il registro prima di
 * eseguire. Qui dentro c'è **tutto** quello che la pagina chiede al server, e
 * qui si traducono le risposte nelle forme che usano le pagine: se il server
 * cambia un nome o una forma, si cambia questo file e basta.
 *
 * Con `?prova=1` su localhost le risposte arrivano da `prova.js` (dati finti,
 * e la pagina lo scrive in cima): serve a fotografare le schermate senza server.
 */
import { CONFIG } from './config.js';

export const inProva = () =>
  ['localhost', '127.0.0.1'].includes(location.hostname) && new URLSearchParams(location.search).has('prova');

/** I nomi delle azioni dell'adattatore che le pagine controllano con `sa()`. */
export const NOMI = {
  kpi: 'kpi', salute: 'salute', errori: 'errori', acquisti: 'acquisti', rimborsa: 'acquisti.rimborsa', versioni: 'versioni',
  cercaGiocatori: 'giocatori.cerca', scheda: 'giocatori.scheda', timeline: 'giocatori.timeline',
  accredita: 'giocatori.accredita', blocca: 'giocatori.blocca', sblocca: 'giocatori.sblocca', nome: 'giocatori.nome',
  cercaPartite: 'partite.cerca', partita: 'partite.scheda', configLeggi: 'config.leggi', configScrivi: 'config.scrivi',
};

export class ErroreApi extends Error {
  constructor(messaggio, stato, codice) { super(messaggio); this.stato = stato; this.codice = codice; }
}

/** I codici d'errore del server, detti in italiano (LEGGIMI.md). */
const MESSAGGI = {
  accesso: 'La sessione è scaduta: rientra.',
  mfa: 'Serve il codice dell\'app di autenticazione: rientra.',
  'mfa-recente': 'Questa operazione vuole il codice dell\'app di autenticazione appena inserito.',
  amministratore: 'Questo account non è un amministratore attivo del Control Center.',
  permesso: 'Il tuo ruolo non ha questo permesso',
  motivo: 'Serve un motivo di almeno 5 caratteri.',
  argomenti: 'Richiesta non valida',
  troppe: 'Troppe richieste in un minuto: aspetta un attimo.',
  adattatore: 'Il server del gioco non ha risposto',
  introvabile: 'Non trovato.',
};

let prova = null;
let prendiSessione = null;
let chiediCodice = null;
/** Chi sa dare il token della sessione: lo passa main.js dopo l'accesso. */
export const usaSessione = (f) => { prendiSessione = f; };
/** Chi sa chiedere un codice TOTP fresco e verificarlo (operazioni critiche). */
export const usaCodiceFresco = (f) => { chiediCodice = f; };

async function chiama(azione, argomenti = {}, giaRiprovato = false) {
  if (inProva()) {
    prova ??= await import('./prova.js');
    const r = await prova.rispondi(azione, argomenti);
    if (r.ok === false) throw new ErroreApi(r.errore, 400, r.errore);
    return r;
  }
  const token = prendiSessione ? await prendiSessione() : null;
  if (!token) throw new ErroreApi(MESSAGGI.accesso, 401, 'accesso');
  let r;
  try {
    r = await fetch(`${CONFIG.url}/functions/v1/${CONFIG.funzione}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, apikey: CONFIG.chiavePubblica, 'Content-Type': 'application/json' },
      body: JSON.stringify({ azione, ...argomenti }),
    });
  } catch {
    throw new ErroreApi('Il server non risponde: controlla la connessione.', 0, 'rete');
  }
  const j = await r.json().catch(() => null);
  // «In approvazione» non è un errore: l'operazione è in coda (§10).
  if (r.status === 409 && j?.errore === 'approvazione') return { ok: true, inApprovazione: true, approvazione: j.approvazione };
  if (!r.ok || !j || j.ok === false) {
    const codice = j?.errore ?? String(r.status);
    if (codice === 'mfa-recente' && chiediCodice && !giaRiprovato) {
      if (await chiediCodice()) return chiama(azione, argomenti, true);
    }
    const base = MESSAGGI[codice] ?? (r.status === 404 ? 'La funzione del server non risponde (non ancora pubblicata?).' : `Errore: ${codice}`);
    throw new ErroreApi(j?.dettaglio ? `${base}: ${j.dettaglio}` : base, r.status, codice);
  }
  return j;
}

/**
 * Alcuni adattatori (Last Sheep) rispondono `{ ok, azione, dati: {...} }` invece di mettere i
 * campi in cima come dice il contratto: si toglie la busta, così le pagine leggono uguale.
 */
function sbusta(j) {
  return j && j.dati && typeof j.dati === 'object' && !Array.isArray(j.dati) ? { ...j, ...j.dati } : j;
}

/** Una risposta «per app» (`perApp[slug]`): l'errore di un gioco diventa un'eccezione. */
function diApp(j, slug) {
  const x = j.perApp?.[slug];
  if (!x) throw new ErroreApi('Il gioco non ha risposto', 502, 'adattatore');
  if (x.ok === false || x.errore) throw new ErroreApi(`${MESSAGGI.adattatore}: ${x.dettaglio ?? x.errore}`, 502, 'adattatore');
  return x;
}

/* ------------------------------------------------------------ chi sei */

export async function io() {
  const j = await chiama('io');
  if (inProva()) return j;
  if (!j.amministratore) throw new ErroreApi(MESSAGGI.amministratore, 403, 'amministratore');
  return {
    email: j.utente?.email, ruolo: j.amministratore.nome_ruolo ?? j.amministratore.ruolo, codiceRuolo: j.amministratore.ruolo,
    permessi: j.amministratore.permessi ?? [], tetti: j.amministratore.tetti ?? {}, mfa: j.mfa,
  };
}

/* ------------------------------------------------------------ le app (§2, §5) */

const NOMI_STORE = { google_play: 'Google Play', app_store: 'App Store', altro: 'Altro store' };

export async function apps() {
  const j = await chiama('app.elenco');
  if (inProva()) return j.apps ?? [];
  const famiglie = new Map((j.famiglie ?? []).map((f) => [f.id, f.nome]));
  const elenco = (j.app ?? []).map((a) => ({
    id: a.slug, nome: a.nome, famiglia: famiglie.get(a.famiglia) ?? a.famiglia, gioco: a.gioco_nome ?? a.gioco,
    organizzazione: 'PK - Project Key', piattaforme: [a.piattaforma], store: NOMI_STORE[a.store] ?? a.store,
    pacchetto: a.package_id, playId: a.store === 'google_play' ? a.package_id : null, appStoreId: a.store === 'app_store' ? a.store_id : null,
    stato: a.stato === 'attiva' ? 'live' : a.stato, ambiente: a.ambiente, ambienti: [a.ambiente],
    paesi: a.paesi ?? [], lingue: a.lingue ?? [], modalita: a.funzioni ?? [], adattatore: a.adattatore_url,
    aggiornamento: a.aggiornamento,
    versioni: { [a.piattaforma]: { pubblicata: a.versione_pubblicata, ultima: a.versione_ultima, minima: a.versione_minima, consigliata: a.versione_consigliata } },
    config: { manutenzione: a.manutenzione ?? { attiva: false }, versioneMinima: a.versione_minima },
    capacita: null,
  }));
  // Cosa sa fare ogni gioco lo dice il suo adattatore. Una volta sola non basta: al primo
  // accesso le funzioni si svegliano da fredde, e un gioco che non ha risposto al primo colpo
  // sembrava «senza giocatori né acquisti» (25 set 2026). Si riprova, e se proprio tace le
  // pagine dicono che **non risponde**, non che non sa fare la cosa.
  await Promise.all(elenco.map(async (a) => {
    if (!a.adattatore) return;
    for (let giro = 0; giro < 2; giro++) {
      try {
        const c = sbusta(await chiama('app.capacita', { app: a.id }));
        a.capacita = {
          versioneContratto: c.versioneContratto, azioni: c.azioni ?? [], moduli: c.moduli ?? [], note: c.note ?? {},
          valute: (c.valute ?? []).map((v) => (typeof v === 'string' ? { codice: v, nome: v } : { ...v, codice: v.codice ?? v.k ?? v.id })),
        };
        delete a.erroreAdattatore;
        return;
      } catch (e) { a.erroreAdattatore = e.message; }
    }
  }));
  return elenco;
}

/**
 * Cambi dalla scheda dell'app: manutenzione e versione minima passano da
 * `app.salva` (il server le scrive anche nella configurazione del gioco); gli
 * interruttori sono chiavi della configurazione e passano da `config.proponi`.
 */
export async function appAggiorna(app, cambi, motivo) {
  if (inProva()) return chiama('app.aggiorna', { app, cambi, motivo });
  const campi = {};
  if (cambi.manutenzione) campi.manutenzione = cambi.manutenzione;
  if (cambi.versioneMinima) campi.versione_minima = cambi.versioneMinima;
  if (cambi.versioneConsigliata) campi.versione_consigliata = cambi.versioneConsigliata;
  let esito = {};
  if (Object.keys(campi).length) esito = await chiama('app.salva', { app, campi, motivo });
  if (cambi.interruttori) {
    const attuale = (await configLeggi(app)).valori ?? {};
    esito = await chiama('config.proponi', { app, valori: { ...attuale, interruttori: cambi.interruttori }, motivo });
  }
  return esito;
}

export const appCrea = ({ nome, famiglia, pacchetto, adattatore, clonaDa }, motivo) => {
  const slug = nome.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return clonaDa
    ? chiama('app.clona', { da: clonaDa, slug, nome, motivo })
    : chiama('app.crea', { slug, campi: { slug, nome, famiglia, package_id: pacchetto, adattatore_url: adattatore }, motivo });
};

/* ------------------------------------------------------------ i numeri */

export async function kpi(app, da, a) {
  const j = await chiama('kpi', { app, da, a });
  if (inProva()) return j;
  const x = diApp(j, app);
  const t = x.totali ?? {};
  return { ...x, wau: t.wau ?? null, mau: t.mau ?? null, crash_free_utenti: t.crash_free_utenti ?? null };
}

export async function salute(app) {
  const j = await chiama('salute', { app });
  if (inProva()) return j;
  const x = diApp(j, app);
  return { servizi: x.servizi ?? [], controllato: new Date().toISOString(), dettagli: x.dettagli };
}

export async function errori(app, da, a) {
  const j = await chiama('errori', { app, da, a });
  if (inProva()) return j.errori ?? [];
  return [
    ...(j.server ?? []).map((e) => ({ ...e, dove: 'server', versioni: [] })),
    ...(j.app ?? []).map((e) => ({ ...e, dove: 'app', utenti: e.installazioni })),
  ];
}

/** Lo stato di un acquisto come lo mostrano le pagine. */
const statoAcquisto = (x) => (x.stato === 'rimborsato' ? 'rimborsato' : x.stato === 'valido' && x.consegnato_il ? 'consegnato' : x.stato === 'valido' ? 'in-attesa' : x.stato);

export async function acquisti(app, da, a) {
  const j = sbusta(await chiama('acquisti', { app, da, a }));
  if (inProva()) return j.acquisti ?? [];
  return (j.acquisti ?? (Array.isArray(j.dati) ? j.dati : [])).map((x) => ({ ...x, prezzo: x.euro ?? x.prezzo, nome: null, stato: statoAcquisto(x) }));
}

/**
 * **Rimborsa un acquisto** (Google Play `orders.refund` + la cassa toglie quello che aveva
 * dato). Il server lo vuole con un codice TOTP appena verificato: si verifica qui prima.
 */
export async function rimborsa(app, id, motivo, codice) {
  if (!inProva() && codice && verificaCodice) await verificaCodice(codice);
  return chiama('acquisti.rimborsa', { app, id, motivo });
}

const NOMI_CANALI = { production: 'Produzione', internal: 'Test interno', alpha: 'Test chiuso (alpha)', beta: 'Test aperto (beta)' };

export async function versioni(app) {
  const j = await chiama('versioni', { app });
  if (inProva()) return j;
  return {
    store: (j.canali ?? []).map((c) => ({
      store: 'Google Play', canale: NOMI_CANALI[c.canale] ?? c.canale, versione: c.versione, build: (c.codici ?? []).join(', ') || null,
      stato: c.stato === 'completed' ? 'completata' : c.stato === 'inProgress' ? 'in rollout' : c.stato ?? '—', percentuale: c.frazione,
    })),
    adozione: j.adozione ?? [], ota: [], nota: j.nota,
  };
}

/* ------------------------------------------------------------ giocatori */

export async function cercaGiocatori(app, q) {
  const j = sbusta(await chiama('giocatori.cerca', { app, q }));
  return inProva() ? j.giocatori ?? [] : j.risultati ?? (Array.isArray(j.dati) ? j.dati : []);
}

export async function scheda(app, id) {
  const j = await chiama('giocatori.scheda', { app, id });
  if (inProva()) return j.giocatore;
  const p = j.profilo ?? {};
  const e = j.economia ?? {};
  const m = j.monetizzazione ?? {};
  const t = j.tecnica ?? {};
  const s = j.stato ?? {};
  const ultima = (t.installazioni ?? [])[0] ?? {};
  // «Ultimo accesso»: profili.visto_il si scrive quasi solo alla nascita; l'installazione sa di più.
  const visti = [p.visto, p.visto_il, ...(t.installazioni ?? []).map((i) => i.ultima_volta)].filter(Boolean);
  const visto = visti.length ? visti.reduce((x, y) => (Date.parse(y) > Date.parse(x) ? y : x)) : null;
  return {
    ...p,
    visto,
    legami: [p.accesso && p.accesso !== 'anonimo' ? p.accesso : null, ...(p.play_games ?? []).map((x) => `play-games: ${x.nome ?? x.player_id}`)].filter(Boolean),
    device: null, os: ultima.piattaforma ?? null, versione: ultima.versione ?? null,
    gioco: { ...j.gioco, ranking: j.gioco?.lega?.posizione ?? null, tornei: null, missioni: null },
    economia: {
      valute: [{ nome: 'Monete', saldo: e.monete }, { nome: 'Gemme', saldo: e.gemme }, ...(e.salvadanaio ? [{ nome: 'Salvadanaio', saldo: e.salvadanaio }] : [])],
      bauli: (e.bauli ?? []).filter(Boolean).map((b) => ({ tipo: b.tipo ?? b.grado ?? '—', stato: b.stato ?? (b.pronto ? 'in apertura' : 'chiuso'), pronto: b.pronto ?? b.finisce ?? null })),
      inventario: (e.inventario ?? []).map((i) => ({ nome: i.pezzo, categoria: String(i.pezzo ?? '').split('-')[0], origine: i.origine })),
      pass: e.pass ? { stagione: e.pass.stagione ?? '—', livello: e.pass.livello ?? e.pass.gradino ?? null, premium: !!e.pass.premium } : null,
    },
    monetizzazione: {
      speso: m.totale_speso, ultimo: m.ultimo_acquisto, rimborsi: m.rimborsi, premiVideo: m.premi_video,
      acquisti: (m.acquisti ?? []).map((a) => ({ id: a.id, quando: a.consegnato_il ?? a.creato_il, prodotto: a.prodotto, prezzo: a.euro, ordine: a.ordine, stato: statoAcquisto(a), rimborsato_il: a.rimborsato_il })),
    },
    tecnica: {
      installazioni: (t.installazioni ?? []).map((i) => ({ piattaforma: i.piattaforma, versione: i.versione, aggiornamento: null, ultima: i.ultima_volta })),
      errori: (t.errori_recenti ?? []).map((x) => ({ quando: x.quando, messaggio: x.dati?.messaggio ?? JSON.stringify(x.dati ?? {}) })),
    },
    stato: { bandito_fino: s.bloccato ? s.bloccato_fino : null },
    segnalazioni: s.segnalazioni ?? [],
  };
}

export const timeline = (app, id, limite = 200) => chiama('giocatori.timeline', { app, id, limite }).then((j) => j.eventi ?? []);
export const accredita = (app, id, valuta, quantita, motivo) => chiama('giocatori.accredita', { app, id, valuta, quantita, motivo });
export const blocca = (app, id, fino, motivo) => chiama('giocatori.blocca', { app, id, fino, motivo });
export const sblocca = (app, id, motivo) => chiama('giocatori.sblocca', { app, id, motivo });
export const resetNome = (app, id, nome, motivo) => chiama('giocatori.nome', { app, id, ...(nome ? { nome } : {}), motivo });

/* ------------------------------------------------------------ partite (§29) */

export async function cercaPartite(app, filtri) {
  const j = await chiama('partite.cerca', { app, ...filtri });
  return (j.partite ?? []).map((p) => ({
    ...p, inizio: p.inizio ?? p.creata, gioco: p.gioco ?? p.modo,
    modo: p.con_persone === undefined ? p.modo : p.con_persone ? 'Online' : 'Col computer',
    giocatori: (p.giocatori ?? []).map((g) => (typeof g === 'string' ? { nome: g } : { ...g, nome: g.nome ?? (g.bot ? 'bot' : '—') })),
    risultato: p.risultato ?? (p.squadra_vinta !== undefined && p.squadra_vinta !== null ? `vince la squadra ${p.squadra_vinta}` : p.motivo ?? '—'),
  }));
}

export async function partita(app, id) {
  const j = await chiama('partite.scheda', { app, id });
  if (inProva()) return j.partita;
  const p = j.partita ?? {};
  const nomi = new Map((j.giocatori ?? []).map((g) => [g.posto, g.nome ?? (g.bot ? 'bot' : `posto ${g.posto}`)]));
  const premio = j.premi?.premio;
  return {
    ...p, gioco: p.modo, tavolo: p.tavolo, inizio: p.iniziata_il ?? p.creata_il, fine: p.finita_il,
    giocatori: (j.giocatori ?? []).map((g) => ({ ...g, id: g.profilo_id, punti: p.punteggio?.[g.squadra] ?? null, premio: g.squadra === p.squadra_vinta ? premio : 0 })),
    disconnessioni: (j.giocatori ?? []).filter((g) => g.turni_saltati).map((g) => ({ quando: g.visto_il, chi: g.nome, durata_s: undefined })),
    timeline: (j.timeline ?? []).map((e) => ({
      quando: e.quando, chi: nomi.get(e.posto) ?? `posto ${e.posto}`,
      testo: [e.carta ? `gioca ${e.carta}` : null, (e.presa ?? []).length ? `prende ${(e.presa ?? []).join(', ')}` : null, e.accusa ? `accusa: ${JSON.stringify(e.accusa)}` : null].filter(Boolean).join(' · ') || e.evento,
    })),
    premi: j.premi,
  };
}

/* ------------------------------------------------------------ configurazione (§7-§10) */

const STATI_VERSIONE = { in_linea: 'live', superata: 'passata', programmata: 'programmata', in_approvazione: 'in approvazione', in_attesa_client: 'in attesa dell\'app', annullata: 'annullata', rifiutata: 'rifiutata', fallita: 'fallita' };

function portataTesto(scope) {
  const s = scope ?? {};
  const parti = Object.entries(s).map(([k, v]) => `${k} ${v}`);
  return parti.length ? parti.join(' · ') : 'tutta l\'app';
}

export async function configLeggi(app) {
  const j = await chiama('config.leggi', { app });
  if (inProva()) return j;
  const vive = (j.versioni ?? []).filter((v) => v.stato === 'in_linea');
  return { valori: j.attuale ?? {}, versione: vive[0]?.numero ?? null, aggiornato: vive[0]?.applicata_il ?? null, effettiva: j.effettiva };
}

export async function configVersioni(app) {
  const j = await chiama(inProva() ? 'config.versioni' : 'config.leggi', { app });
  if (inProva()) return j.versioni ?? [];
  return (j.versioni ?? []).map((v) => ({
    id: v.id, versione: v.numero, quando: v.creata_il, admin: v.admin_email, motivo: v.motivo,
    stato: STATI_VERSIONE[v.stato] ?? v.stato, scope: portataTesto(v.scope), valori: v.valori, inizio: v.inizio, fine: v.fine,
  }));
}

/** Portata della pagina → `scope` del server: `{}` = tutta l'app. */
const SCOPE = { app: () => ({}), piattaforma: (v) => ({ os: v }), paese: (v) => ({ paese: v }), versione: (v) => ({ versione: v }), segmento: (v) => ({ segmento: v }) };

export async function configProponi(app, { valori, portata, inizio, fine, motivo }) {
  const scope = (SCOPE[portata?.livello] ?? SCOPE.app)(portata?.valore);
  const j = await chiama('config.proponi', { app, valori, scope, inizio, fine, motivo });
  return normalizzaEsito(j);
}
export const configRipristina = (app, versione, motivo) => chiama('config.rollback', { app, versione, motivo }).then(normalizzaEsito);
export const configClona = (versione, app, motivo) => chiama('config.clona', { versione, app, motivo }).then(normalizzaEsito);
export const configValida = (app, valori, inizio, fine) => chiama('config.valida', { app, valori, inizio, fine });

function normalizzaEsito(j) {
  if (j.approvazione && typeof j.approvazione === 'object') return { ...j, approvazione: approvazioneDa(j.approvazione) };
  if (j.versione && typeof j.versione === 'object') {
    return { ...j, approvazione: { id: j.versione.id, stato: (STATI_VERSIONE[j.versione.stato] ?? j.versione.stato), parte_il: j.versione.inizio } };
  }
  return j;
}

/* ------------------------------------------------------------ approvazioni (§10) */

const STATI_APPROVAZIONE = { review: 'REVIEW', programmata: 'SCHEDULED', eseguita: 'LIVE', rifiutata: 'REJECTED', annullata: 'CANCELLED', fallita: 'FAILED' };
const TIPI = { 'config.applica': 'Configurazione', 'giocatori.accredita': 'Accredito', 'giocatori.blocca': 'Blocco', 'app.crea': 'Nuova app', 'app.clona': 'Clonazione app', 'amministratori.salva': 'Amministratori' };

function approvazioneDa(a) {
  const g = a.argomenti ?? {};
  const riassunto = a.azione === 'giocatori.accredita' ? `${g.quantita > 0 ? '+' : ''}${g.quantita} ${g.valuta} a ${String(g.id ?? '').slice(0, 8)}`
    : a.azione === 'config.applica' ? `versione ${g.numero ?? g.versione ?? ''}`
      : a.azione === 'giocatori.blocca' ? `blocco di ${String(g.id ?? '').slice(0, 8)}` : JSON.stringify(g).slice(0, 80);
  return {
    id: a.id, app: a.app ?? g.app ?? null, tipo: TIPI[a.azione] ?? a.azione, stato: STATI_APPROVAZIONE[a.stato] ?? a.stato,
    proposto_da: a.chi_email ?? a.chi, quando: a.creata_il ?? a.quando, motivo: g.motivo ?? null, riassunto, parte_il: a.esegui_dopo, esito: a.esito,
  };
}

export async function approvazioni() {
  const j = await chiama('approvazioni.elenco');
  return inProva() ? j.approvazioni ?? [] : (j.approvazioni ?? []).map(approvazioneDa);
}

/** Approva, rifiuta o annulla. Il codice TOTP si verifica prima: il server vuole un `aal2` fresco. */
export async function decidi(id, decisione, motivo, codice) {
  if (inProva()) return chiama('approvazioni.decidi', { id, decisione, motivo });
  if (codice && verificaCodice) await verificaCodice(codice);
  const azione = { approva: 'approvazioni.approva', rifiuta: 'approvazioni.rifiuta', annulla: 'approvazioni.annulla' }[decisione];
  return chiama(azione, { id, motivo });
}
let verificaCodice = null;
/** Chi sa verificare un codice TOTP già scritto (main.js, da accesso.js). */
export const usaVerificaCodice = (f) => { verificaCodice = f; };

/* ------------------------------------------------------------ sicurezza (§73-§76) */

export async function registro(filtri) {
  const { chi, ...resto } = filtri ?? {};
  const j = await chiama('registro', { ...resto, ...(chi ? { admin: chi } : {}) });
  if (inProva()) return j.voci ?? [];
  return (j.righe ?? []).map((r) => ({ ...r, admin: r.admin_email }));
}

let cacheAdmin = null;
async function elencoAdmin() {
  if (inProva()) return null;
  cacheAdmin ??= chiama('amministratori.elenco').finally(() => setTimeout(() => { cacheAdmin = null; }, 2000));
  return cacheAdmin;
}
export async function amministratori() {
  if (inProva()) return (await chiama('amministratori')).amministratori ?? [];
  const j = await elencoAdmin();
  const nomi = new Map((j.ruoli ?? []).map((r) => [r.codice, r.nome]));
  return (j.amministratori ?? []).map((a) => ({ ...a, ruolo: nomi.get(a.ruolo) ?? a.ruolo, ultimo: a.ultimo_accesso, mfa: undefined }));
}
export async function ruoli() {
  if (inProva()) return (await chiama('ruoli')).ruoli ?? [];
  const j = await elencoAdmin();
  return (j.ruoli ?? []).map((r) => ({ nome: r.nome, permessi: r.permessi ?? [], tetti: { monete: r.tetto_monete, gemme: r.tetto_gemme } }));
}

export async function allarmi() {
  const j = await chiama(inProva() ? 'allarmi' : 'allarmi.elenco', { aperti: false });
  if (inProva()) return j.allarmi ?? [];
  return (j.allarmi ?? []).map((a) => ({ ...a, severita: String(a.severita).toUpperCase(), quando: a.aperto_il, stato: a.chiuso_il ? 'chiuso' : 'aperto' }));
}
export const chiudiAllarme = (id, motivo) => chiama('allarmi.chiudi', { id, motivo });

/** Può quest'app fare quest'azione? Lo dice il suo adattatore (`capacita`). */
export const sa = (app, azione) => !app || (app.capacita?.azioni ?? []).includes(NOMI[azione] ?? azione);
