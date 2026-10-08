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
 *
 * Sotto (G8, 7 ott 2026, `controllo/contenuti.ts`, 0092): il **calendario dei
 * contenuti** (2 concetti al giorno, un content ID per clip o post = `utm_content`;
 * niente si segna pubblicato senza l'approvazione, che è il tasto «Approve»), le
 * **community** dove si parla di scopa, con un post proposto da scrivere a mano col
 * proprio nome, e **di cosa si lamentano i giocatori dei concorrenti** (recensioni
 * da 1–2 stelle lette ogni lunedì dalla raccolta).
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
  // Calendario, community e concorrenti: se uno non risponde (migrazione 0092 non ancora fatta), il resto si vede.
  const indietro = new Date(Date.now() - 30 * 86_400_000).toLocaleDateString('sv-SE', { timeZone: 'Europe/Rome' });
  const [cal, com, conc, fatti] = await Promise.all([api.calendario(), api.comunita(), api.concorrenti(), api.calendario(indietro)].map((p) => p.catch((e) => e)));

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
    fatti instanceof Error ? null : risultati(fatti.contenuti ?? []),
    cal instanceof Error ? scheda('Content calendar', erroreBox(cal)) : calendario(ctx, cal, clip),
    com instanceof Error ? scheda('Communities', erroreBox(com)) : comunita(ctx, com.comunita ?? []),
    conc instanceof Error ? scheda('Competitor reviews', erroreBox(conc)) : concorrenti(conc),
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

/* ------------------------------------------------------------ i numeri dei post (0095) */

/*
 * I numeri di ogni post pubblicato (8 ott 2026): li legge la raccolta del mattino da
 * Meta (`_cassa/social.ts`, `misuraIPubblicati`), più installazioni e attivati dal
 * referrer di Play con lo stesso content ID. Giorgio: «andare a tentativi e monitorare
 * se portano quello che ci serve» — qui si vede quale formato porta gente.
 */
const numero = (x) => (typeof x === 'number' ? x.toLocaleString('en-US') : '—');
const brevi = (m = {}) => [
  m.views != null ? `${numero(m.views)} views` : null,
  m.like != null ? `${numero(m.like)} likes` : null,
  m.installazioni ? `${numero(m.installazioni)} installs` : null,
].filter(Boolean).join(' · ');

function risultati(righe) {
  const pubblicati = righe.filter((r) => r.stato === 'pubblicata')
    .sort((a, b) => String(b.pubblicato_il ?? '').localeCompare(String(a.pubblicato_il ?? '')));
  if (!pubblicati.length) return null;
  const somma = (k) => pubblicati.reduce((s, r) => s + (Number(r.metriche?.[k]) || 0), 0);
  const perFormato = new Map();
  for (const r of pubblicati) {
    const f = perFormato.get(r.formato) ?? { formato: r.formato, post: 0, views: 0, like: 0, installazioni: 0, attivati: 0 };
    f.post++; for (const k of ['views', 'like', 'installazioni', 'attivati']) f[k] += Number(r.metriche?.[k]) || 0;
    perFormato.set(r.formato, f);
  }
  return scheda('Post results', h('div', {},
    h('div', { style: { display: 'flex', gap: '8px', flexWrap: 'wrap', margin: '0 0 10px' } },
      pill(`${pubblicati.length} published`, 'verde'), pill(`${numero(somma('views'))} views`, 'cielo'),
      pill(`${numero(somma('like'))} likes`), pill(`${numero(somma('installazioni'))} installs`, 'viola'), pill(`${numero(somma('attivati'))} activated`, 'viola')),
    tabella([
      { titolo: 'Format', cella: (f) => h('strong', {}, f.formato) },
      { titolo: 'Posts', num: true, cella: (f) => numero(f.post) },
      { titolo: 'Views / post', num: true, cella: (f) => numero(Math.round(f.views / f.post)) },
      { titolo: 'Likes / post', num: true, cella: (f) => (f.like / f.post).toFixed(1) },
      { titolo: 'Installs', num: true, cella: (f) => numero(f.installazioni) },
      { titolo: 'Activated', num: true, cella: (f) => numero(f.attivati) },
    ], [...perFormato.values()].sort((a, b) => b.installazioni - a.installazioni || b.views / b.post - a.views / a.post)),
    tabella([
      { titolo: 'Published', cella: (r) => data(r.pubblicato_il) },
      { titolo: 'Content', cella: (r) => h('code', {}, r.contenuto) },
      { titolo: 'Channel', cella: (r) => CANALI[r.canale] ?? r.canale },
      { titolo: 'Views', num: true, cella: (r) => numero(r.metriche?.views) },
      { titolo: 'Watched', num: true, cella: (r) => (r.metriche?.completamento != null ? `${Math.round(r.metriche.completamento * 100)}%` : '—') },
      { titolo: 'Likes', num: true, cella: (r) => numero(r.metriche?.like) },
      { titolo: 'Comments', num: true, cella: (r) => numero(r.metriche?.commenti) },
      { titolo: 'Shares', num: true, cella: (r) => numero(r.metriche?.condivisioni) },
      { titolo: 'Installs', num: true, cella: (r) => numero(r.metriche?.installazioni) },
      { titolo: 'Activated', num: true, cella: (r) => numero(r.metriche?.attivati) },
      { titolo: '', cella: (r) => (r.pubblicato_url ? h('a', { href: r.pubblicato_url, target: '_blank', rel: 'noopener' }, 'open') : '') },
    ], pubblicati)), {
    nota: 'Last 30 days. Views, watch time, likes, comments and shares are read from Meta every morning; installs and activated players come from the Play referrer with the same content ID (utm_content). «Watched» = average watch time / clip length.',
  });
}

/* ------------------------------------------------------------ il calendario (G8, 0092) */

const CANALI = { tiktok: 'TikTok', instagram: 'Instagram', facebook: 'Facebook', youtube: 'YouTube' };
const STATI_CONTENUTO = { proposta: ['Proposed', 'ambra'], approvata: ['Approved', 'cielo'], pubblicata: ['Published', 'verde'], scartata: ['Rejected', 'rosso'] };
const PILASTRI = {
  puzzle: 'Puzzle', regole: 'Rules', errori: 'Mistakes', curiosita: 'Trivia', challenge: 'Challenge', community: 'Community', gameplay: 'Gameplay', achievement: 'Achievement',
};
const statoContenuto = (s) => { const [t, c] = STATI_CONTENUTO[s] ?? [s, '']; return pill(t, c); };
const giornoLungo = (g) => new Date(`${g}T12:00:00Z`).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' });
const ricarica = (ctx) => ctx.vai(`#/social?${Date.now()}`);

async function decidi(ctx, righe, decisione) {
  try {
    const motivo = decisione === 'approvata' ? 'Approvato nel calendario social' : decisione === 'scartata' ? 'Scartato nel calendario social' : 'Rimesso in proposta';
    await api.contenutoDecidi(righe.map((x) => x.id), decisione, motivo);
    avvisa(decisione === 'approvata' ? 'Approved' : decisione === 'scartata' ? 'Rejected' : 'Back to proposed');
  } catch (e) { avvisa(e.message, true); }
  ricarica(ctx);
}

async function segnaPubblicato(ctx, riga) {
  const url = h('input', { type: 'url', placeholder: 'https://…', 'aria-label': 'Post URL' });
  const fatto = await finestra({
    titolo: `Mark ${riga.contenuto} as published on ${CANALI[riga.canale]}`,
    corpo: [h('p', {}, 'Paste the address of the live post: it is how its numbers get matched to installs later (content ID ', h('code', {}, riga.contenuto), ').'),
      h('label', { class: 'campo' }, h('span', {}, 'Post URL'), url)],
    tasti: [{ testo: 'Cancel', risposta: null }, { testo: 'Mark published', classe: 'primario', valore: () => ({ url: url.value.trim() }) }],
  });
  if (!fatto) return;
  try { await api.contenutoPubblicato(riga.id, fatto.url); avvisa('Marked as published'); } catch (e) { avvisa(e.message, true); }
  ricarica(ctx);
}

function calendario(ctx, cal, clip) {
  const righe = cal.contenuti ?? [];
  const conti = cal.conti ?? {};
  const pronte = new Set(clip.map((c) => c.id));
  // Un concetto = un content ID in un giorno, su più canali.
  const giorni = new Map();
  for (const r of righe) {
    if (!giorni.has(r.giorno)) giorni.set(r.giorno, new Map());
    const concetti = giorni.get(r.giorno);
    if (!concetti.has(r.contenuto)) concetti.set(r.contenuto, []);
    concetti.get(r.contenuto).push(r);
  }
  const oggi = new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Rome' });
  let aperti = 0;
  const blocchi = [...giorni.entries()].map(([g, concetti]) => {
    const daDecidere = [...concetti.values()].flat().filter((x) => x.stato === 'proposta').length;
    const aperto = aperti < 3 && g >= oggi;
    if (aperto) aperti++;
    return h('details', { class: 'giorno-calendario', open: aperto, style: { borderTop: '1px solid var(--filo)', padding: '8px 0' } },
      h('summary', { style: { cursor: 'pointer', fontWeight: '600' } }, giornoLungo(g), g === oggi ? ' · today' : '',
        h('span', { class: 'nota', style: { fontWeight: '400', marginLeft: '8px' } }, `${concetti.size} concept${concetti.size === 1 ? '' : 's'}${daDecidere ? ` · ${daDecidere} to approve` : ''}`)),
      [...concetti.entries()].map(([id, canali]) => concetto(ctx, id, canali, pronte)));
  });
  return scheda('Content calendar', h('div', {},
    h('p', { class: 'nota', style: { marginTop: '0' } },
      'Two concepts a day, each on several channels. Every link carries the content ID (utm_content) so installs can be traced back to the post. ',
      h('strong', {}, 'Nothing is published until it is approved here.'),
      ' Approved Facebook and Instagram rows are published automatically at their time (Rome); TikTok and YouTube wait for their API reviews.'),
    h('div', { style: { display: 'flex', gap: '8px', flexWrap: 'wrap', margin: '6px 0 10px' } },
      pill(`${conti.proposte ?? 0} proposed`, 'ambra'), pill(`${conti.approvate ?? 0} approved`, 'cielo'),
      pill(`${conti.pubblicate ?? 0} published`, 'verde'), conti.scartate ? pill(`${conti.scartate} rejected`, 'rosso') : null,
      conti.primo ? h('span', { class: 'nota' }, `plan: ${giornoLungo(conti.primo)} – ${giornoLungo(conti.ultimo)}`) : null),
    blocchi.length ? blocchi : h('p', { class: 'nota' }, 'Nothing planned in the next two weeks.')),
  { nota: 'docs/crescita/social/CALENDARIO.md' });
}

function concetto(ctx, id, canali, pronte) {
  const primo = canali[0];
  const daDecidere = canali.filter((x) => x.stato === 'proposta');
  const decise = canali.filter((x) => x.stato === 'approvata' || x.stato === 'scartata');
  const tipo = primo.formato === 'post' ? pill('image post', 'viola') : pronte.has(id) ? pill('clip ready', 'verde') : pill('clip to make', 'ambra');
  return h('div', { style: { display: 'grid', gridTemplateColumns: 'minmax(0,1fr)', gap: '6px', padding: '10px 0 10px 12px', borderLeft: '3px solid var(--filo)', margin: '8px 0' } },
    h('div', { style: { display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' } },
      h('strong', {}, primo.ora ?? '—'), h('code', {}, id), pill(PILASTRI[primo.pilastro] ?? primo.pilastro), tipo,
      h('span', {}, primo.concetto),
      h('span', { style: { flex: '1' } }),
      daDecidere.length ? h('button', { class: 'bottone primario piccolo', type: 'button', onclick: () => decidi(ctx, daDecidere, 'approvata') }, `Approve (${daDecidere.length})`) : null,
      daDecidere.length ? h('button', { class: 'bottone pericolo piccolo', type: 'button', onclick: () => decidi(ctx, daDecidere, 'scartata') }, 'Reject') : null,
      !daDecidere.length && decise.length ? h('button', { class: 'bottone piccolo', type: 'button', onclick: () => decidi(ctx, decise, 'proposta') }, 'Undo') : null),
    h('div', { class: 'nota', style: { whiteSpace: 'pre-line' } }, (primo.didascalia ?? '').slice(0, 260)),
    primo.nota ? h('div', { class: 'nota', style: { fontStyle: 'italic' } }, primo.nota) : null,
    h('div', { style: { display: 'flex', gap: '6px', flexWrap: 'wrap' } }, canali.map((c) => h('span', {
      style: { display: 'inline-flex', alignItems: 'center', gap: '6px', border: '1px solid var(--filo)', borderRadius: '8px', padding: '3px 6px' },
    },
    h('span', {}, CANALI[c.canale] ?? c.canale), statoContenuto(c.stato),
    c.stato === 'pubblicata' && c.pubblicato_url ? h('a', { href: c.pubblicato_url, target: '_blank', rel: 'noopener' }, 'open') : null,
    c.stato === 'pubblicata' && brevi(c.metriche) ? h('span', { class: 'nota' }, brevi(c.metriche)) : null,
    c.link ? h('a', { href: c.link, target: '_blank', rel: 'noopener', title: c.link }, 'link') : null,
    c.stato === 'approvata' ? h('button', { class: 'bottone piccolo', type: 'button', onclick: () => segnaPubblicato(ctx, c) }, 'Mark published') : null))));
}

/* ------------------------------------------------------------ le community (§28–29) */

const STATI_COMUNITA = {
  da_verificare: ['To check', 'ambra'], pronta: ['Ready', 'cielo'], attiva: ['Active', 'verde'], in_pausa: ['Paused', ''], esclusa: ['Excluded', 'rosso'],
};

async function aggiornaComunita(ctx, c) {
  const stato = h('select', { 'aria-label': 'Status' }, Object.entries(STATI_COMUNITA).map(([k, [t]]) => h('option', { value: k, selected: k === c.stato }, t)));
  const regole = h('textarea', { rows: 2, 'aria-label': 'Rules' }, c.regole ?? '');
  const verificata = h('input', { type: 'checkbox', checked: !!c.verificata });
  const attivita = h('input', { type: 'text', placeholder: 'What was done (e.g. answered a rules question as Giorgio)', 'aria-label': 'Activity' });
  const link = h('input', { type: 'url', placeholder: 'https://… (optional)', 'aria-label': 'Activity link' });
  const fatto = await finestra({
    titolo: c.nome,
    corpo: [
      h('p', { class: 'nota' }, 'Posts are written by a real person with their own account, never by fake profiles or bots. Read the group rules before writing.'),
      h('label', { class: 'campo' }, h('span', {}, 'Status'), stato),
      h('label', { class: 'campo' }, h('span', {}, 'Rules about promotion'), regole),
      h('label', { class: 'interruttore' }, h('span', {}, 'Page and rules actually read'), verificata),
      h('label', { class: 'campo' }, h('span', {}, 'Log an activity'), attivita),
      h('label', { class: 'campo' }, h('span', {}, 'Activity link'), link),
    ],
    tasti: [{ testo: 'Cancel', risposta: null }, {
      testo: 'Save', classe: 'primario',
      valore: () => ({ stato: stato.value, regole: regole.value, verificata: verificata.checked, attivita: attivita.value, link: link.value }),
    }],
  });
  if (!fatto) return;
  try { await api.comunitaAggiorna(c.id, fatto); avvisa('Saved'); } catch (e) { avvisa(e.message, true); }
  ricarica(ctx);
}

function comunita(ctx, lista) {
  const copia = (testo) => navigator.clipboard?.writeText(testo).then(() => avvisa('Copied'), () => avvisa('Copy failed', true));
  return scheda('Communities', h('div', {},
    h('p', { class: 'nota', style: { marginTop: '0' } }, 'Where scopa is discussed. Value first: a question or a puzzle, never «download our app». Unknown sizes stay unknown.'),
    tabella([
      { titolo: 'Community', cella: (c) => h('div', {}, h('a', { href: c.url, target: '_blank', rel: 'noopener' }, c.nome), h('div', { class: 'nota' }, c.topic)) },
      { titolo: 'Where', cella: (c) => c.piattaforma },
      { titolo: 'Members', num: true, cella: (c) => h('span', { title: c.membri_nota ?? '' }, c.membri == null ? '?' : c.membri.toLocaleString('it-IT')) },
      { titolo: 'Promotion rules', cella: (c) => h('span', { class: 'nota' }, c.regole) },
      { titolo: 'Checked', cella: (c) => (c.verificata ? pill('yes', 'verde') : pill('no', 'ambra')) },
      { titolo: 'Status', cella: (c) => { const [t, col] = STATI_COMUNITA[c.stato] ?? [c.stato, '']; return pill(t, col); } },
      { titolo: 'Proposed post', cella: (c) => h('div', { style: { maxWidth: '360px' } },
        h('div', { class: 'nota', title: c.post_proposto ?? '' }, (c.post_proposto ?? '—').slice(0, 140) + ((c.post_proposto ?? '').length > 140 ? '…' : '')),
        (c.attivita ?? []).length ? h('div', { class: 'nota' }, `last activity: ${data(c.attivita.at(-1).quando)}`) : null) },
      { titolo: '', cella: (c) => h('div', { style: { display: 'flex', gap: '4px' } },
        c.post_proposto && !/^(Nessun post|Non si posta)/.test(c.post_proposto) ? h('button', { class: 'bottone piccolo', type: 'button', onclick: (e) => { e.stopPropagation(); copia(c.post_proposto); } }, 'Copy post') : null,
        h('button', { class: 'bottone piccolo', type: 'button', onclick: (e) => { e.stopPropagation(); aggiornaComunita(ctx, c); } }, 'Update')) },
    ], lista, { vuoto: 'No communities yet.' })),
  { nota: '§28–29 · posting is done by a real person' });
}

/* ------------------------------------------------------------ le recensioni dei concorrenti (§38–39) */

function concorrenti(r) {
  const temi = r.temi ?? [];
  const massimo = Math.max(1, ...temi.map((t) => t.recensioni));
  return scheda('What competitors’ players complain about', h('div', {},
    h('p', { class: 'nota', style: { marginTop: '0' } },
      `1–2 star reviews shown on the Play pages of the competitors, read with the weekly collection: ${r.recensioni ?? 0} reviews from ${r.concorrenti ?? 0} apps in the last ${r.giorni ?? 28} days. `,
      'Themes come from written keyword rules (server/funzioni/_cassa/temi.ts). The point is opportunities, never copying.'),
    temi.length ? temi.map((t) => h('div', { style: { padding: '10px 0', borderTop: '1px solid var(--filo)' } },
      h('div', { style: { display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' } },
        h('strong', { style: { minWidth: '240px' } }, t.nome),
        h('span', { style: { flex: '1', minWidth: '120px', height: '8px', background: 'var(--carta3)', borderRadius: '4px', overflow: 'hidden' } },
          h('span', { style: { display: 'block', height: '100%', width: `${Math.round((t.recensioni / massimo) * 100)}%`, background: 'var(--viola)' } })),
        h('span', {}, `${t.recensioni} · ${t.quota}%`)),
      t.risposta ? h('div', {}, h('span', { class: 'nota' }, 'Our answer: '), t.risposta) : null,
      h('div', { class: 'nota' }, t.concorrenti.join(' · ')),
      t.esempi.map((x) => h('blockquote', { class: 'nota', style: { margin: '4px 0 0 0', paddingLeft: '10px', borderLeft: '2px solid var(--filo)' } },
        `${'★'.repeat(x.voto)} ${x.nome}: «${x.testo}${x.testo.length >= 220 ? '…' : ''}»`))))
      : h('p', { class: 'nota' }, 'No competitor reviews yet: they arrive with the weekly competitor collection (Mondays, 6:15).')),
  { nota: '§38–39' });
}
