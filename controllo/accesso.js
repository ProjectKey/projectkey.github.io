/**
 * L'ACCESSO: PASSWORD E CODICE (§73)
 * ==================================
 *
 * Due passi, sempre. La password da sola apre una sessione di livello `aal1`,
 * con cui la funzione `controllo` non risponde a niente: serve il codice a sei
 * cifre dell'app di autenticazione (TOTP), che porta la sessione ad `aal2`.
 *
 * - Prima volta: si arruola il fattore (QR da inquadrare con Google
 *   Authenticator, 1Password, Authy…) e lo si conferma con il primo codice.
 * - Le volte dopo: password, poi codice.
 * - **Lo stesso browser è ricordato per trenta giorni** dall'ultimo codice
 *   (Giorgio, 2 ott 2026): riaprendo il pannello non si chiede il codice.
 * - **Trenta minuti fermo e il pannello si blocca**: chiede solo la password,
 *   controllata con un cliente a parte (`passwordGiusta`), così la sessione
 *   `aal2` resta quella di prima. Le operazioni critiche vogliono sempre il
 *   codice fresco (lo pretende il server).
 */
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
import { CONFIG } from './config.js';
import { h, svuota } from './ui.js';

let cliente = null;
export function supabase() {
  if (!cliente) {
    cliente = createClient(CONFIG.url, CONFIG.chiavePubblica, {
      auth: { persistSession: true, autoRefreshToken: true, storageKey: 'cc.sessione' },
    });
  }
  return cliente;
}

/* ------------------------------------------------- il browser ricordato */

const leggiNumero = (k) => { try { return Number(localStorage.getItem(`cc.${k}`)) || 0; } catch { return 0; } };
const scriviNumero = (k, v) => { try { localStorage.setItem(`cc.${k}`, String(v)); } catch { /* niente */ } };
/** Da chiamare a ogni codice giusto: da qui contano i trenta giorni. */
const codiceDatoAdesso = () => scriviNumero('codiceIl', Date.now());
const browserRicordato = () => Date.now() - leggiNumero('codiceIl') < CONFIG.giorniBrowserRicordato * 86_400_000;

/** A che punto siamo: 'fuori' | 'codice' (password fatta, manca il TOTP) | 'arruola' | 'dentro'. */
export async function statoAccesso() {
  const db = supabase();
  const { data: s } = await db.auth.getSession();
  if (!s.session) return { stato: 'fuori' };
  const { data: livello } = await db.auth.mfa.getAuthenticatorAssuranceLevel();
  if (livello?.currentLevel === 'aal2') {
    // Una sessione aperta prima che si contassero i giorni: si comincia a contare da adesso.
    if (!leggiNumero('codiceIl')) codiceDatoAdesso();
    if (browserRicordato()) return { stato: 'dentro', email: s.session.user.email };
  }
  const { data: fattori } = await db.auth.mfa.listFactors();
  const verificati = (fattori?.totp ?? []).filter((f) => f.status === 'verified');
  return verificati.length > 0
    ? { stato: 'codice', fattore: verificati[0].id, email: s.session.user.email }
    : { stato: 'arruola', email: s.session.user.email };
}

export async function esci() {
  try { await supabase().auth.signOut(); } catch { /* si esce comunque */ }
  try { localStorage.removeItem('cc.bloccato'); } catch { /* niente */ }
  location.hash = '';
  location.reload();
}

/* ------------------------------------------------------------ il motivo vero */

/**
 * **Cosa ha risposto davvero il server** (Giorgio, 5 ott 2026: «mi dice sempre
 * che la password è errata anche se so che è giusta»). Prima qualunque errore
 * diventava «password non giusta»: anche «troppi tentativi» e la rete che non
 * risponde. La password giusta il server la accetta sempre (provato dal vero:
 * `prove/server/accesso-pannello.mjs`); quello che resta va detto per nome.
 */
export function motivoAccesso(error) {
  const codice = error?.code ?? '';
  if (codice === 'invalid_credentials') return 'Email o password non giuste.';
  if (error?.status === 429 || /rate_limit/.test(codice)) return 'Troppi tentativi di fila: aspetta cinque minuti e riprova.';
  if (!error?.status) return 'Il server non risponde: controlla la connessione e riprova.';
  return `Accesso non riuscito (${codice || error.status}): riprova fra poco.`;
}

/**
 * **La password si può guardare.** Il gestore delle password del browser può
 * riempire il campo con una password vecchia, e i pallini non lo dicono: col
 * tasto «Mostra» si vede cosa sta per partire.
 */
function campoPassword(attributi) {
  const pw = h('input', { type: 'password', required: true, style: { flex: '1', minWidth: '0' }, ...attributi });
  const tasto = h('button', {
    class: 'bottone', type: 'button', 'aria-label': 'Mostra la password',
    onclick: () => {
      const visibile = pw.type === 'text';
      pw.type = visibile ? 'password' : 'text';
      tasto.textContent = visibile ? 'Mostra' : 'Nascondi';
      tasto.setAttribute('aria-label', visibile ? 'Mostra la password' : 'Nascondi la password');
      pw.focus();
    },
  }, 'Mostra');
  return { pw, riga: h('div', { style: { display: 'flex', gap: '8px', alignItems: 'stretch' } }, pw, tasto) };
}

/* ------------------------------------------------------------ l'inattività */

/**
 * **Trenta minuti fermo: il pannello si blocca** (§73). Anche a pagina chiusa:
 * l'ultimo tocco sta nel browser, e riaprendo dopo più di trenta minuti si
 * ritrova il blocco. Un blocco in corso sopravvive al ricaricare la pagina.
 */
let timer = null;
let riparti = () => {};
export function sorvegliaInattivita(email) {
  const minuti = CONFIG.minutiInattivita * 60_000;
  riparti = () => {
    if (bloccato()) return;
    scriviNumero('ultimoTocco', Date.now());
    clearTimeout(timer);
    timer = setTimeout(() => blocca(email), minuti);
  };
  for (const e of ['pointerdown', 'keydown', 'wheel', 'touchstart']) addEventListener(e, () => riparti(), { passive: true });
  const ultimo = leggiNumero('ultimoTocco');
  if (bloccato() || (ultimo && Date.now() - ultimo > minuti)) blocca(email);
  else riparti();
}

const bloccato = () => { try { return localStorage.getItem('cc.bloccato') === '1'; } catch { return false; } };

/** La password, controllata senza toccare la sessione del pannello. Torna l'errore, o `null` se è giusta. */
async function erroreDellaPassword(email, password) {
  const a_parte = createClient(CONFIG.url, CONFIG.chiavePubblica, {
    auth: { persistSession: false, autoRefreshToken: false, storageKey: 'cc.verifica' },
  });
  const { error } = await a_parte.auth.signInWithPassword({ email, password });
  if (error) return error;
  // Si chiude solo la sessione appena aperta per controllare: quella del pannello resta.
  try { await a_parte.auth.signOut({ scope: 'local' }); } catch { /* scade da sola */ }
  return null;
}

function blocca(email) {
  if (document.querySelector('.blocco')) return;
  clearTimeout(timer);
  try { localStorage.setItem('cc.bloccato', '1'); } catch { /* niente */ }
  /*
   * **L'email c'è, anche se non si vede.** Con il solo campo password il
   * gestore del browser non sa di quale account è la password da mettere, e
   * se ne ha salvate più d'una per questo sito può scegliere quella sbagliata.
   */
  const utente = h('input', { type: 'email', autocomplete: 'username', value: email, readonly: true, 'aria-hidden': 'true', tabindex: '-1', style: { display: 'none' } });
  const { pw, riga } = campoPassword({ autocomplete: 'current-password', placeholder: 'password', 'aria-label': 'Password' });
  const errore = h('div', { class: 'errore-testo', role: 'alert' });
  const tasto = h('button', { class: 'bottone primario', type: 'submit' }, 'Sblocca');
  const velo = h('div', { class: 'blocco', style: { position: 'fixed', inset: '0', zIndex: '9999', background: 'var(--bg, #0b1020)' } },
    box(h('h1', {}, 'Pannello bloccato'),
      h('p', {}, `Trenta minuti fermo. Scrivi la password di ${email}.`),
      h('form', {
        style: { display: 'flex', flexDirection: 'column', gap: '10px' },
        onsubmit: async (e) => {
          e.preventDefault();
          errore.textContent = '';
          tasto.disabled = true;
          const sbaglio = await erroreDellaPassword(email, pw.value);
          tasto.disabled = false;
          if (sbaglio) { errore.textContent = motivoAccesso(sbaglio); if (sbaglio.code === 'invalid_credentials') pw.value = ''; return; }
          try { localStorage.removeItem('cc.bloccato'); } catch { /* niente */ }
          velo.remove();
          riparti();
        },
      }, utente, riga, errore, tasto),
      h('button', { class: 'bottone', type: 'button', onclick: esci }, 'Esci')));
  document.body.append(velo);
  pw.focus();
}

/* ------------------------------------------------------------ le schermate */

function box(...figli) {
  return h('div', { class: 'ingresso' }, h('div', { class: 'box' },
    h('div', { class: 'marchio', style: { color: 'var(--ink)', padding: '0' } },
      h('span', { class: 'logo' }, 'CC'),
      h('div', {}, 'Gaming Control Center', h('small', { style: { color: 'var(--ink3)' } }, 'PK - Project Key'))),
    ...figli));
}

/**
 * Da che link si arriva: l'invito del primo amministratore e «password
 * dimenticata» portano nell'indirizzo `type=invite` / `type=recovery`. Si legge
 * **prima** che supabase-js consumi l'indirizzo per aprire la sessione.
 */
const tipoLink = (() => {
  const p = new URLSearchParams(location.hash.slice(1));
  const q = new URLSearchParams(location.search);
  return p.get('type') ?? q.get('type');
})();
let passwordScelta = !(tipoLink === 'recovery' || tipoLink === 'invite');

/** Disegna l'ingresso nel contenitore e risolve quando la sessione è `aal2`. */
export function ingresso(radice) {
  return new Promise((pronto) => {
    const avanti = async () => {
      const s = await statoAccesso();
      // Arrivati dal link dell'invito o del recupero: prima si sceglie la password.
      if (!passwordScelta && s.stato !== 'fuori') {
        svuota(radice).append(schermataNuovaPassword(s, async () => { passwordScelta = true; await avanti(); }));
        return;
      }
      if (s.stato === 'dentro') { pronto(s); return; }
      svuota(radice);
      if (s.stato === 'fuori') radice.append(schermataPassword(avanti));
      else if (s.stato === 'arruola') radice.append(await schermataArruola(avanti));
      else radice.append(schermataCodice(s.fattore, s.email, avanti));
    };
    void avanti();
  });
}

/**
 * **La password nuova.** Dall'invito (account senza codice) basta sceglierla.
 * Da «password dimenticata» no: l'account ha già il codice dell'app di
 * autenticazione, il link dell'email apre una sessione di livello `aal1`, e
 * Supabase non cambia la password finché non si è dato anche il codice
 * («AAL2 session is required to update email or password when MFA is
 * enabled», Giorgio, 5 ott 2026). Quindi qui si chiede **anche il codice**, lo
 * si verifica e solo dopo si salva la password.
 *
 * C'è l'email nascosta: il gestore delle password del browser salva la nuova
 * sull'account giusto, invece di aggiungerne un'altra accanto alla vecchia.
 */
function schermataNuovaPassword(stato, fatto) {
  const serveCodice = stato.stato === 'codice';
  const utente = h('input', { type: 'email', autocomplete: 'username', value: stato.email ?? '', readonly: true, 'aria-hidden': 'true', tabindex: '-1', style: { display: 'none' } });
  const { pw, riga } = campoPassword({ autocomplete: 'new-password', placeholder: 'nuova password (almeno 12 caratteri)', 'aria-label': 'Nuova password', minlength: 12 });
  const pw2 = h('input', { type: 'password', autocomplete: 'new-password', placeholder: 'ripetila', 'aria-label': 'Ripeti la password', required: true });
  const codice = serveCodice
    ? h('input', { class: 'codice-otp', inputmode: 'numeric', autocomplete: 'one-time-code', maxlength: 6, placeholder: '000000', 'aria-label': 'Codice a sei cifre', required: true })
    : null;
  const errore = h('div', { class: 'errore-testo', role: 'alert' });
  return box(h('h1', {}, 'Scegli la password'),
    h('p', {}, serveCodice
      ? `Almeno 12 caratteri. Per salvarla serve anche il codice dell'app di autenticazione di ${stato.email}.`
      : 'Almeno 12 caratteri. Dopo attivi il codice dell\'app di autenticazione.'),
    h('form', {
      style: { display: 'flex', flexDirection: 'column', gap: '10px' },
      onsubmit: async (e) => {
        e.preventDefault();
        errore.textContent = '';
        if (pw.value.length < 12) { errore.textContent = 'Almeno 12 caratteri.'; return; }
        if (pw.value !== pw2.value) { errore.textContent = 'Le due password non sono uguali.'; return; }
        if (serveCodice) {
          const { error: ce } = await supabase().auth.mfa.challengeAndVerify({ factorId: stato.fattore, code: codice.value.trim() });
          if (ce) { errore.textContent = 'Codice non valido: aspetta il prossimo e riprova.'; codice.value = ''; return; }
          codiceDatoAdesso();
        }
        const { error } = await supabase().auth.updateUser({ password: pw.value });
        if (error) { errore.textContent = `Non riesco a salvarla: ${error.message}`; return; }
        history.replaceState(null, '', location.pathname);
        await fatto();
      },
    }, utente, riga, pw2, codice, errore, h('button', { class: 'bottone primario', type: 'submit' }, 'Salva la password')));
}

function schermataPassword(avanti) {
  const email = h('input', { type: 'email', autocomplete: 'username', placeholder: 'email', 'aria-label': 'Email', required: true });
  const { pw, riga } = campoPassword({ autocomplete: 'current-password', placeholder: 'password', 'aria-label': 'Password' });
  const errore = h('div', { class: 'errore-testo', role: 'alert' });
  const tasto = h('button', { class: 'bottone primario', type: 'submit' }, 'Entra');
  const form = h('form', {
    style: { display: 'flex', flexDirection: 'column', gap: '10px' },
    onsubmit: async (e) => {
      e.preventDefault();
      errore.textContent = '';
      tasto.disabled = true;
      const { error } = await supabase().auth.signInWithPassword({ email: email.value.trim(), password: pw.value });
      tasto.disabled = false;
      if (error) { errore.textContent = motivoAccesso(error); return; }
      await avanti();
    },
  }, email, riga, errore, tasto);
  return box(h('h1', {}, 'Accesso riservato'),
    h('p', {}, 'Solo per gli amministratori. Dopo la password serve il codice dell\'app di autenticazione.'),
    form,
    h('button', {
      class: 'bottone', type: 'button', style: { alignSelf: 'flex-start' },
      onclick: async () => {
        if (!email.value.trim()) { errore.textContent = 'Scrivi prima la tua email.'; return; }
        const { error } = await supabase().auth.resetPasswordForEmail(email.value.trim(), { redirectTo: location.href.split('#')[0] });
        /*
         * **Il server di posta di Supabase manda due email all'ora** (`rate_limit_email_sent`):
         * la terza risponde 429 `over_email_send_rate_limit`. Va detto così, non «non sono riuscito»
         * (Giorgio, 5 ott 2026). Fuori orario un amministratore genera il link dal server
         * (`auth/v1/admin/generate_link`, TOOLS.md).
         */
        errore.textContent = !error
          ? 'Se l\'indirizzo è di un amministratore, arriva un\'email per scegliere la password.'
          : error.code === 'over_email_send_rate_limit' || error.status === 429
            ? 'Troppe email in poco tempo: se ne possono mandare due all\'ora. Usa quella già arrivata, o riprova fra un\'ora.'
            : `Non sono riuscito a mandare l'email (${error.code || error.status || 'rete'}).`;
      },
    }, 'Password dimenticata o primo accesso'));
}

async function schermataArruola(avanti) {
  const db = supabase();
  // Un arruolamento lasciato a metà blocca il successivo con lo stesso nome: si pulisce.
  const { data: vecchi } = await db.auth.mfa.listFactors();
  for (const f of vecchi?.all ?? []) if (f.status !== 'verified') await db.auth.mfa.unenroll({ factorId: f.id });
  const { data, error } = await db.auth.mfa.enroll({ factorType: 'totp', friendlyName: 'Control Center' });
  if (error || !data) {
    return box(h('h1', {}, 'Secondo fattore'), h('p', { class: 'errore-testo' }, `Non riesco a preparare il codice: ${error?.message ?? 'errore'}`),
      h('button', { class: 'bottone', onclick: esci }, 'Esci'));
  }
  const codice = h('input', { class: 'codice-otp', inputmode: 'numeric', autocomplete: 'one-time-code', maxlength: 6, placeholder: '000000', 'aria-label': 'Codice a sei cifre' });
  const errore = h('div', { class: 'errore-testo', role: 'alert' });
  return box(h('h1', {}, 'Attiva il secondo fattore'),
    h('p', {}, 'Inquadra il codice con l\'app di autenticazione (Google Authenticator, 1Password, Authy…) e scrivi le sei cifre che compaiono.'),
    h('div', { class: 'qr' }, h('img', { src: data.totp.qr_code, alt: 'Codice QR per l\'app di autenticazione' })),
    h('div', { class: 'segreto', title: 'Se non puoi inquadrare, inserisci questo codice a mano' }, data.totp.secret),
    h('form', {
      style: { display: 'flex', flexDirection: 'column', gap: '10px' },
      onsubmit: async (e) => {
        e.preventDefault();
        const { error: err } = await db.auth.mfa.challengeAndVerify({ factorId: data.id, code: codice.value.trim() });
        if (err) { errore.textContent = 'Codice non valido: riprova con quello nuovo.'; codice.value = ''; return; }
        codiceDatoAdesso();
        await avanti();
      },
    }, codice, errore, h('button', { class: 'bottone primario', type: 'submit' }, 'Conferma')),
    h('button', { class: 'bottone', type: 'button', onclick: esci }, 'Esci'));
}

function schermataCodice(fattore, email, avanti) {
  const codice = h('input', { class: 'codice-otp', inputmode: 'numeric', autocomplete: 'one-time-code', maxlength: 6, placeholder: '000000', 'aria-label': 'Codice a sei cifre', autofocus: true });
  const errore = h('div', { class: 'errore-testo', role: 'alert' });
  return box(h('h1', {}, 'Il codice'),
    h('p', {}, `Ciao ${email}. Scrivi le sei cifre dell'app di autenticazione.`),
    h('form', {
      style: { display: 'flex', flexDirection: 'column', gap: '10px' },
      onsubmit: async (e) => {
        e.preventDefault();
        const { error } = await supabase().auth.mfa.challengeAndVerify({ factorId: fattore, code: codice.value.trim() });
        if (error) { errore.textContent = 'Codice non valido.'; codice.value = ''; return; }
        codiceDatoAdesso();
        await avanti();
      },
    }, codice, errore, h('button', { class: 'bottone primario', type: 'submit' }, 'Entra')),
    h('button', { class: 'bottone', type: 'button', onclick: esci }, 'Esci'));
}

/* ------------------------------------------------------------ il codice fresco */

/** Verifica un codice TOTP già scritto: la sessione torna `aal2` «adesso» (operazioni critiche). */
export async function verificaCodice(codice) {
  const db = supabase();
  const { data: fattori } = await db.auth.mfa.listFactors();
  const f = (fattori?.totp ?? []).find((x) => x.status === 'verified');
  if (!f) throw new Error('Nessun secondo fattore attivo: esci e rientra.');
  const { error } = await db.auth.mfa.challengeAndVerify({ factorId: f.id, code: String(codice).trim() });
  if (error) throw new Error('Codice non valido.');
  codiceDatoAdesso();
}

/**
 * Il server ha risposto «mfa-recente»: l'operazione è critica e vuole un
 * codice appena inserito. Si chiede, si verifica, e la richiesta riparte.
 */
export async function chiediCodiceFresco() {
  const { finestra } = await import('./ui.js');
  const codice = h('input', { class: 'codice-otp', inputmode: 'numeric', maxlength: 6, placeholder: '000000', 'aria-label': 'Codice a sei cifre' });
  const errore = h('div', { class: 'errore-testo', role: 'alert' });
  const ok = await finestra({
    titolo: 'Conferma col codice',
    corpo: [h('p', {}, 'È un\'operazione critica: scrivi il codice dell\'app di autenticazione.'), codice, errore],
    tasti: [{ testo: 'Annulla', risposta: null }, {
      testo: 'Conferma', classe: 'primario', valore: async () => {
        try { await verificaCodice(codice.value); return true; } catch (e) { errore.textContent = e.message; codice.value = ''; return false; }
      },
    }],
  });
  return ok === true;
}
