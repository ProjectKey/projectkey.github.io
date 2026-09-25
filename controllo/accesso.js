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
 * - Trenta minuti senza toccare niente e si esce da soli.
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

/** A che punto siamo: 'fuori' | 'codice' (password fatta, manca il TOTP) | 'arruola' | 'dentro'. */
export async function statoAccesso() {
  const db = supabase();
  const { data: s } = await db.auth.getSession();
  if (!s.session) return { stato: 'fuori' };
  const { data: livello } = await db.auth.mfa.getAuthenticatorAssuranceLevel();
  if (livello?.currentLevel === 'aal2') return { stato: 'dentro', email: s.session.user.email };
  const { data: fattori } = await db.auth.mfa.listFactors();
  const verificati = (fattori?.totp ?? []).filter((f) => f.status === 'verified');
  return verificati.length > 0
    ? { stato: 'codice', fattore: verificati[0].id, email: s.session.user.email }
    : { stato: 'arruola', email: s.session.user.email };
}

export async function esci() {
  try { await supabase().auth.signOut(); } catch { /* si esce comunque */ }
  location.hash = '';
  location.reload();
}

/* ------------------------------------------------------------ l'inattività */

let timer = null;
export function sorvegliaInattivita() {
  const riparti = () => {
    clearTimeout(timer);
    timer = setTimeout(() => { void esci(); }, CONFIG.minutiInattivita * 60_000);
  };
  for (const e of ['pointerdown', 'keydown', 'wheel', 'touchstart']) addEventListener(e, riparti, { passive: true });
  riparti();
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
        svuota(radice).append(schermataNuovaPassword(async () => { passwordScelta = true; await avanti(); }));
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

function schermataNuovaPassword(fatto) {
  const pw = h('input', { type: 'password', autocomplete: 'new-password', placeholder: 'nuova password (almeno 12 caratteri)', 'aria-label': 'Nuova password', minlength: 12, required: true });
  const pw2 = h('input', { type: 'password', autocomplete: 'new-password', placeholder: 'ripetila', 'aria-label': 'Ripeti la password', required: true });
  const errore = h('div', { class: 'errore-testo', role: 'alert' });
  return box(h('h1', {}, 'Scegli la password'),
    h('p', {}, 'Almeno 12 caratteri. Dopo attivi il codice dell\'app di autenticazione.'),
    h('form', {
      style: { display: 'flex', flexDirection: 'column', gap: '10px' },
      onsubmit: async (e) => {
        e.preventDefault();
        if (pw.value.length < 12) { errore.textContent = 'Almeno 12 caratteri.'; return; }
        if (pw.value !== pw2.value) { errore.textContent = 'Le due password non sono uguali.'; return; }
        const { error } = await supabase().auth.updateUser({ password: pw.value });
        if (error) { errore.textContent = `Non riesco a salvarla: ${error.message}`; return; }
        history.replaceState(null, '', location.pathname);
        await fatto();
      },
    }, pw, pw2, errore, h('button', { class: 'bottone primario', type: 'submit' }, 'Salva la password')));
}

function schermataPassword(avanti) {
  const email = h('input', { type: 'email', autocomplete: 'username', placeholder: 'email', 'aria-label': 'Email', required: true });
  const pw = h('input', { type: 'password', autocomplete: 'current-password', placeholder: 'password', 'aria-label': 'Password', required: true });
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
      if (error) { errore.textContent = 'Email o password non giuste.'; return; }
      await avanti();
    },
  }, email, pw, errore, tasto);
  return box(h('h1', {}, 'Accesso riservato'),
    h('p', {}, 'Solo per gli amministratori. Dopo la password serve il codice dell\'app di autenticazione.'),
    form,
    h('button', {
      class: 'bottone', type: 'button', style: { alignSelf: 'flex-start' },
      onclick: async () => {
        if (!email.value.trim()) { errore.textContent = 'Scrivi prima la tua email.'; return; }
        const { error } = await supabase().auth.resetPasswordForEmail(email.value.trim(), { redirectTo: location.href.split('#')[0] });
        errore.textContent = error ? 'Non sono riuscito a mandare l\'email.' : 'Se l\'indirizzo è di un amministratore, arriva un\'email per scegliere la password.';
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
