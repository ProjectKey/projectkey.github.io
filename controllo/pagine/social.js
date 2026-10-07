/**
 * SOCIAL (G8, 7 ottobre 2026)
 * ===========================
 *
 * Le nostre clip sui nostri account, per primo TikTok (@settegames), con Login
 * Kit e Content Posting API (Direct Post). Il server sta in
 * `server/funzioni/controllo/tiktok.ts`.
 *
 * **La pagina è in inglese** perché la guardano i revisori di TikTok nel video
 * dimostrativo, e segue alla lettera le loro regole per chi pubblica via API
 * (Content Sharing Guidelines): nome e foto dell'account che pubblica; privacy
 * scelta a mano fra le opzioni che TikTok dà per quell'account, **senza valore
 * di partenza**; commenti, duetti e stitch spenti finché non si accendono, e
 * bloccati se il creatore li ha spenti; dichiarazione dei contenuti commerciali
 * («Your brand» / «Branded content», e i branded non possono essere privati); la
 * frase sulla Music Usage Confirmation; anteprima del video; lo stato dopo.
 *
 * Il ritorno da TikTok passa da `settegames.com/tiktok/`, che mette codice e
 * state in `sessionStorage` (`settegames.tiktok.ritorno`) e torna qui.
 *
 * Le clip sono quelle di `crescita/video` pubblicate in `sito/tiktok/clip/` con
 * `elenco.json`: TikTok le scarica da lì (prefisso verificato).
 */
import * as api from '../api.js';
import { h, scheda, tabella, pill, data, avvisa, erroreBox, finestra } from '../ui.js';

const RITORNO = 'settegames.tiktok.ritorno';
const NOMI_PRIVACY = {
  PUBLIC_TO_EVERYONE: 'Everyone',
  MUTUAL_FOLLOW_FRIENDS: 'Friends',
  FOLLOWER_OF_CREATOR: 'Followers',
  SELF_ONLY: 'Only me',
};
const STATI = {
  inviato: ['Sent', 'cielo'], PROCESSING_DOWNLOAD: ['TikTok is downloading', 'cielo'], PROCESSING_UPLOAD: ['Uploading', 'cielo'],
  SEND_TO_USER_INBOX: ['In TikTok inbox', 'ambra'], PUBLISH_COMPLETE: ['Posted', 'verde'], FAILED: ['Failed', 'rosso'],
};

export async function disegna(ctx) {
  ctx.ricordaRecente('Social');

  // Si torna da TikTok: il codice si consegna al server una volta sola.
  let ritorno = null;
  try { ritorno = JSON.parse(sessionStorage.getItem(RITORNO) ?? 'null'); sessionStorage.removeItem(RITORNO); } catch { /* niente */ }
  let collegamento = null;
  if (ritorno?.codice) {
    try { await api.tiktokCollega(ritorno.codice, ritorno.stato); avvisa('TikTok account connected'); } catch (e) { collegamento = e; }
  } else if (ritorno?.errore) {
    collegamento = new Error(`TikTok: ${ritorno.errore}`);
  }

  let r;
  let clip = [];
  try {
    [r, clip] = await Promise.all([
      api.social(),
      fetch('/tiktok/clip/elenco.json', { cache: 'no-store' }).then((x) => (x.ok ? x.json() : [])).catch(() => []),
    ]);
  } catch (e) { return [erroreBox(e)]; }
  const tt = r.tiktok;

  return [
    collegamento ? erroreBox(collegamento) : null,
    r.configurato ? null : h('div', { class: 'avviso ambra' }, h('span', { class: 'ico' }, 'ⓘ'),
      h('div', {}, h('strong', {}, 'TikTok is not configured yet. '), 'The function secrets TIKTOK_CLIENT_KEY and TIKTOK_CLIENT_SECRET are missing.')),
    scheda('TikTok account', tt ? account(ctx, tt) : collega(r.configurato), { nota: 'Login Kit · user.info.basic' }),
    tt ? scheda('Post a video to TikTok', modulo(ctx, tt, clip), { nota: 'Content Posting API · video.publish (Direct Post)' }) : null,
    scheda('Recent posts', tabella([
      { titolo: 'When', cella: (p) => data(p.creato) },
      { titolo: 'Clip', cella: (p) => p.clip ?? '—' },
      { titolo: 'Caption', cella: (p) => h('span', { title: p.titolo ?? '' }, (p.titolo ?? '').slice(0, 60)) },
      { titolo: 'Privacy', cella: (p) => NOMI_PRIVACY[p.privacy] ?? p.privacy ?? '—' },
      { titolo: 'Status', cella: (p) => statoPill(p.stato) },
      { titolo: 'By', cella: (p) => p.chi ?? '—' },
      { titolo: '', cella: (p) => (['PUBLISH_COMPLETE', 'FAILED'].includes(p.stato) ? '' : h('button', {
        class: 'bottone', type: 'button', onclick: async (e) => { e.stopPropagation(); await aggiorna(ctx, p.id); },
      }, 'Check status')) },
    ], r.post ?? [], { vuoto: 'Nothing posted yet.' })),
  ].filter(Boolean);
}

const statoPill = (s) => { const [t, c] = STATI[s] ?? [s, '']; return pill(t, c); };

async function aggiorna(ctx, id) {
  try {
    const e = await api.tiktokEsito(id);
    avvisa(e.stato === 'FAILED' ? `Failed: ${e.motivo ?? 'unknown reason'}` : `Status: ${STATI[e.stato]?.[0] ?? e.stato}`, e.stato === 'FAILED');
  } catch (e) { avvisa(e.message, true); }
  ctx.vai(`#/social?${Date.now()}`);
}

function collega(configurato) {
  return h('div', {},
    h('p', {}, 'Connect the official SetteGames TikTok account (@settegames). You will be sent to TikTok to log in and authorize, then back here.'),
    h('button', {
      class: 'bottone primario', type: 'button', disabled: !configurato,
      onclick: async (e) => {
        e.target.disabled = true;
        try { location.href = (await api.tiktokInizio()).indirizzo; } catch (err) { avvisa(err.message, true); e.target.disabled = false; }
      },
    }, 'Connect TikTok'));
}

function account(ctx, tt) {
  return h('div', { style: { display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' } },
    tt.avatar ? h('img', { src: tt.avatar, alt: '', width: 56, height: 56, style: { borderRadius: '50%' } }) : null,
    h('div', { style: { flex: '1' } },
      h('div', {}, h('strong', {}, tt.nome ?? 'TikTok account'), tt.utente ? ` @${tt.utente}` : ''),
      h('div', { class: 'nota' }, `Connected by ${tt.collegatoDa ?? '—'} · scopes: ${tt.permessi ?? '—'}`),
      tt.errore ? h('div', { class: 'errore-testo' }, `TikTok creator info: ${tt.errore}`) : null),
    h('button', {
      class: 'bottone', type: 'button',
      onclick: async () => {
        const ok = await finestra({ titolo: 'Disconnect TikTok?', corpo: h('p', {}, 'The access is revoked on TikTok too. You can connect again at any time.'),
          tasti: [{ testo: 'Cancel', risposta: null }, { testo: 'Disconnect', classe: 'pericolo pieno', risposta: true }] });
        if (!ok) return;
        try { await api.tiktokScollega(); avvisa('Disconnected'); } catch (e) { avvisa(e.message, true); }
        ctx.vai(`#/social?${Date.now()}`);
      },
    }, 'Disconnect'));
}

function modulo(ctx, tt, clip) {
  const video = h('video', { controls: true, playsinline: true, muted: true, style: { width: '220px', maxWidth: '100%', borderRadius: '10px', background: '#000' } });
  const durata = h('div', { class: 'nota' });
  const sceltaClip = h('select', { 'aria-label': 'Clip' },
    h('option', { value: '' }, '— choose a clip —'),
    clip.map((c) => h('option', { value: c.id }, `${c.id} · ${c.formato ?? ''}`)));
  const titolo = h('textarea', { rows: 4, maxlength: 2200, placeholder: 'Caption and hashtags', 'aria-label': 'Caption' });
  const privacy = h('select', { 'aria-label': 'Who can view this video' },
    h('option', { value: '', selected: true, disabled: true }, '— select who can view —'),
    tt.privacy.map((p) => h('option', { value: p }, NOMI_PRIVACY[p] ?? p)));
  const spunta = (testo, spento) => {
    const i = h('input', { type: 'checkbox', disabled: spento });
    return [i, h('label', { class: 'interruttore' }, h('span', {}, testo, spento ? h('span', { class: 'desc' }, ' — turned off in the TikTok account settings') : null), i)];
  };
  const [commenti, nodoCommenti] = spunta('Allow comments', tt.commentiSpenti);
  const [duetti, nodoDuetti] = spunta('Allow Duet', tt.duettiSpenti);
  const [stitch, nodoStitch] = spunta('Allow Stitch', tt.stitchSpenti);
  const commerciale = h('input', { type: 'checkbox' });
  const marchioTuo = h('input', { type: 'checkbox' });
  const marchioAltri = h('input', { type: 'checkbox' });
  const dettagliCommerciali = h('div', { style: { display: 'none', paddingLeft: '16px' } },
    h('label', { class: 'interruttore' }, h('span', {}, 'Your brand', h('div', { class: 'desc' }, 'You are promoting yourself or your own business. The video will be labeled "Promotional content".')), marchioTuo),
    h('label', { class: 'interruttore' }, h('span', {}, 'Branded content', h('div', { class: 'desc' }, 'You are promoting another brand or a third party. The video will be labeled "Paid partnership".')), marchioAltri));
  const dichiarazione = h('p', { class: 'nota' });
  const errore = h('div', { class: 'errore-testo' });
  const invia = h('button', { class: 'bottone primario', type: 'button', disabled: true }, 'Post to TikTok');

  const clipScelta = () => clip.find((c) => c.id === sceltaClip.value);
  const controlla = () => {
    dettagliCommerciali.style.display = commerciale.checked ? '' : 'none';
    // I contenuti sponsorizzati non possono essere «solo io».
    const soloIo = privacy.querySelector('option[value="SELF_ONLY"]');
    if (soloIo) {
      soloIo.disabled = commerciale.checked && marchioAltri.checked;
      soloIo.title = soloIo.disabled ? 'Branded content visibility cannot be set to private.' : '';
      if (soloIo.disabled && privacy.value === 'SELF_ONLY') privacy.value = '';
    }
    dichiarazione.textContent = commerciale.checked && marchioAltri.checked
      ? 'By posting, you agree to TikTok\'s Branded Content Policy and Music Usage Confirmation.'
      : 'By posting, you agree to TikTok\'s Music Usage Confirmation.';
    const c = clipScelta();
    const troppoLunga = c && tt.durataMassima && c.durata > tt.durataMassima;
    durata.textContent = c ? `${c.durata ?? '?'} s${tt.durataMassima ? ` · max allowed ${tt.durataMassima} s` : ''}` : '';
    let manca = '';
    if (!c) manca = 'Choose a clip.';
    else if (troppoLunga) manca = 'This clip is longer than TikTok allows for this account.';
    else if (!privacy.value) manca = 'Select who can view this video.';
    else if (commerciale.checked && !marchioTuo.checked && !marchioAltri.checked) manca = 'You need to indicate if your content promotes yourself, a third party, or both.';
    errore.textContent = manca;
    invia.disabled = !!manca;
  };
  sceltaClip.addEventListener('change', () => {
    const c = clipScelta();
    video.src = c ? c.url : '';
    if (c && !titolo.value) titolo.value = c.didascalia ?? '';
    controlla();
  });
  for (const el of [privacy, commerciale, marchioTuo, marchioAltri]) el.addEventListener('change', controlla);
  controlla();

  invia.addEventListener('click', async () => {
    const c = clipScelta();
    invia.disabled = true;
    invia.textContent = 'Posting…';
    try {
      const p = await api.tiktokPubblica({
        clip: c.id, video: c.url, titolo: titolo.value, privacy: privacy.value,
        commenti: commenti.checked, duetti: duetti.checked, stitch: stitch.checked,
        commerciale: commerciale.checked, marchioTuo: commerciale.checked && marchioTuo.checked, marchioAltri: commerciale.checked && marchioAltri.checked,
      });
      avvisa('Sent to TikTok. It may take a few minutes for the post to appear on the profile.');
      // TikTok scarica e lavora il video: si guarda lo stato dopo qualche secondo.
      setTimeout(() => aggiorna(ctx, p.id), 8000);
      ctx.vai(`#/social?${Date.now()}`);
    } catch (e) {
      avvisa(e.message, true);
      invia.textContent = 'Post to TikTok';
      controlla();
    }
  });

  return h('div', { style: { display: 'flex', gap: '20px', flexWrap: 'wrap', alignItems: 'flex-start' } },
    h('div', {}, video, durata),
    h('div', { style: { flex: '1', minWidth: '260px' } },
      h('div', { style: { display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' } },
        tt.avatar ? h('img', { src: tt.avatar, alt: '', width: 28, height: 28, style: { borderRadius: '50%' } }) : null,
        h('span', {}, 'Posting as ', h('strong', {}, tt.nome ?? 'TikTok account'))),
      h('label', { class: 'campo' }, h('span', {}, 'Clip'), sceltaClip),
      h('label', { class: 'campo' }, h('span', {}, 'Caption'), titolo),
      h('label', { class: 'campo' }, h('span', {}, 'Who can view this video'), privacy),
      nodoCommenti, nodoDuetti, nodoStitch,
      h('label', { class: 'interruttore' }, h('span', {}, 'Disclose video content', h('div', { class: 'desc' }, 'Turn on to disclose that this video promotes goods or services in exchange for something of value.')), commerciale),
      dettagliCommerciali,
      dichiarazione, errore, invia));
}
