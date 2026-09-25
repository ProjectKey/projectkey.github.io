/**
 * CONFIGURAZIONE DA REMOTO (§7, §8, §9, §10, §84, §86, §88)
 * =========================================================
 *
 * Si cambia un numero del gioco senza pubblicare l'app. Il percorso è sempre
 * lo stesso: modifica → controllo dei valori pericolosi (§86) → differenza
 * prima/dopo → motivo → proposta. La proposta segue il flusso delle
 * approvazioni (§10): con un solo Super Admin si riconferma col codice TOTP e
 * parte dopo dieci minuti, annullabile (ARCHITETTURA.md).
 */
import * as api from '../api.js';
import {
  h, svuota, metti, scheda, tabella, pill, data, fa, finestra, confermaConMotivo, avvisa,
  caricamento, erroreBox, nonDisponibile, memoria,
} from '../ui.js';

export async function disegna(ctx) {
  const app = ctx.param[0] ? ctx.apps.find((a) => a.id === ctx.param[0]) : ctx.app;
  if (!app) {
    ctx.ricordaRecente('Configurazione');
    return [
      h('div', { class: 'avviso' }, h('span', { class: 'ico' }, 'ⓘ'), h('div', {}, 'La configurazione è per gioco: scegline uno qui sotto o dal selettore in alto.')),
      scheda('Giochi', tabella([
        { titolo: 'Gioco', cella: (a) => h('a', { href: `#/configurazione/${a.id}` }, a.nome) },
        { titolo: 'Famiglia', chiave: 'famiglia' },
        { titolo: 'Remote config', cella: (a) => api.sa(a, 'configLeggi') ? pill('sì', 'verde') : pill('non esposto', 'ambra') },
      ], ctx.apps, { clic: (a) => ctx.vai(`#/configurazione/${a.id}`) })),
      await approvazioniNodo(ctx, null),
    ];
  }
  ctx.ricordaRecente(`Configurazione · ${app.nome}`);
  ctx.briciole([{ testo: app.nome }, { testo: 'Configurazione', hash: '#/configurazione' }]);
  if (!api.sa(app, 'configLeggi')) return nonDisponibile('Configurazione da remoto', `${app.nome} non espone ancora \`config.leggi\`.`);

  const [attuale, versioni] = await Promise.all([api.configLeggi(app.id), api.configVersioni(app.id).catch(() => [])]);
  const originale = appiattisci(attuale.valori ?? {});
  const bozza = new Map(Object.entries(originale));
  const filtro = h('input', { type: 'search', placeholder: 'Filtra le chiavi…', value: memoria.leggi('config.filtro', ''), 'aria-label': 'Filtra le chiavi', style: { flex: 1, minWidth: '160px' } });
  const righe = h('tbody', {});
  const contatore = h('span', { class: 'nota' });

  const disegnaRighe = () => {
    memoria.scrivi('config.filtro', filtro.value);
    const f = filtro.value.toLowerCase();
    svuota(righe);
    for (const [k, v] of [...bozza.entries()].sort(([a], [b]) => a.localeCompare(b))) {
      if (f && !k.toLowerCase().includes(f)) continue;
      const cambiato = JSON.stringify(v) !== JSON.stringify(originale[k]);
      righe.append(h('tr', { style: cambiato ? { background: 'var(--ambra-tenue)' } : null },
        h('td', { class: 'mono' }, k, originale[k] === undefined ? [' ', pill('nuova', 'viola')] : null),
        h('td', {}, editor(v, (nuovo) => { bozza.set(k, nuovo); aggiornaContatore(); })),
        h('td', { class: 'mono', style: { color: 'var(--ink3)' } }, originale[k] === undefined ? '—' : mostra(originale[k])),
        h('td', {}, h('button', { class: 'bottone piccolo', title: 'Torna al valore attuale', onclick: () => { if (originale[k] === undefined) bozza.delete(k); else bozza.set(k, originale[k]); disegnaRighe(); aggiornaContatore(); } }, '↺'))));
    }
  };
  const aggiornaContatore = () => {
    const n = diff(originale, Object.fromEntries(bozza)).filter((d) => d.tipo !== 'uguale').length;
    contatore.textContent = n ? `${n} modifiche non ancora proposte` : 'nessuna modifica';
  };
  filtro.addEventListener('input', disegnaRighe);

  /* ---- portata e programmazione (§2, §7, §84) ---- */
  const portata = h('select', { 'aria-label': 'Portata' },
    // Famiglia e globale (§87, operazioni su più app) non ci sono ancora: si fa app per app.
    [['app', `${app.nome} (tutto il gioco)`],
      ['piattaforma', `${app.nome} → una piattaforma`], ['paese', `${app.nome} → un paese`], ['versione', `${app.nome} → da una versione`], ['segmento', `${app.nome} → un segmento`]]
      .map(([v, t]) => h('option', { value: v }, t)));
  const dettaglio = h('input', { type: 'text', placeholder: 'android · IT · 1.0.8 · nome segmento', 'aria-label': 'Dettaglio della portata', hidden: true });
  portata.addEventListener('change', () => { dettaglio.hidden = portata.value === 'app'; });
  const inizio = h('input', { type: 'datetime-local', 'aria-label': 'Inizio' });
  const fine = h('input', { type: 'datetime-local', 'aria-label': 'Fine' });

  const proponi = async () => {
    const dopo = Object.fromEntries(bozza);
    const d = diff(originale, dopo).filter((x) => x.tipo !== 'uguale');
    if (d.length === 0) { avvisa('Nessuna modifica da proporre'); return; }
    const avvisi = valida(originale, dopo, inizio.value, fine.value);
    const bloccanti = avvisi.filter((a) => a.grave);
    const corpo = [
      diffNodo(d),
      avvisi.length ? h('div', { class: `avviso ${bloccanti.length ? 'rosso' : 'ambra'}` }, h('span', { class: 'ico' }, '⚠'),
        h('div', {}, h('strong', {}, bloccanti.length ? 'Da correggere prima di proporre:' : 'Controlla:'),
          h('ul', { style: { margin: '4px 0 0', paddingLeft: '18px' } }, avvisi.map((a) => h('li', {}, a.testo))))) : null,
      h('p', {}, `Portata: ${portata.selectedOptions[0].textContent}${dettaglio.hidden ? '' : ` = ${dettaglio.value || '?'}`}. ${inizio.value ? `Dal ${data(inizio.value)}` : 'Da subito'}${fine.value ? ` al ${data(fine.value)}` : ''}.`),
    ];
    if (bloccanti.length) { await finestra({ titolo: 'La proposta ha dei problemi', corpo, tasti: [{ testo: 'Torna a correggere', risposta: true }] }); return; }
    const ok = await finestra({ titolo: 'Rivedi la modifica', corpo, tasti: [{ testo: 'Annulla', risposta: null }, { testo: 'Avanti', classe: 'primario', risposta: true }] });
    if (!ok) return;
    const r = await confermaConMotivo({ titolo: 'Proponi la configurazione', tasto: 'Proponi', testo: 'Parte secondo il flusso delle approvazioni. La versione di adesso resta nello storico e si ripristina con un clic.' });
    if (!r) return;
    try {
      const res = await api.configProponi(app.id, {
        valori: dispiega(dopo), cambi: d.map((x) => ({ chiave: x.chiave, prima: x.prima, dopo: x.dopo })),
        portata: { livello: portata.value, valore: dettaglio.hidden ? null : dettaglio.value.trim() || null },
        inizio: inizio.value ? new Date(inizio.value).toISOString() : null, fine: fine.value ? new Date(fine.value).toISOString() : null,
        motivo: r.motivo,
      });
      const s = res?.approvazione;
      avvisa(s ? `Proposta: ${s.stato}${s.parte_il ? `, parte ${data(s.parte_il)}` : ''}` : 'Proposta inviata');
      if ((res?.avvisi ?? []).length) avvisa(`Il server segnala: ${res.avvisi.map((x) => x.testo ?? x).join(' · ')}`);
      if (portata.value !== 'app') avvisa('Salvata: vale quando l\'app saprà leggere questa portata (oggi legge solo «tutto il gioco»).');
      ctx.vai(`#/configurazione/${app.id}?${Date.now()}`);
    } catch (e) { avvisa(e.message, true); }
  };

  const aggiungi = async () => {
    const r = await finestraNuovaChiave();
    if (!r) return;
    bozza.set(r.chiave, r.valore);
    disegnaRighe(); aggiornaContatore();
  };

  disegnaRighe(); aggiornaContatore();

  return [
    await approvazioniNodo(ctx, app),
    scheda(`Valori attuali · versione ${attuale.versione ?? '—'}`, [
      h('div', { class: 'filtri', style: { marginBottom: '10px' } }, filtro,
        h('button', { class: 'bottone', onclick: aggiungi }, '+ Parametro'),
        h('button', { class: 'bottone', onclick: () => esporta(app, Object.fromEntries(bozza)) }, 'Esporta JSON'),
        h('label', { class: 'bottone', style: { cursor: 'pointer' } }, 'Importa JSON',
          h('input', { type: 'file', accept: 'application/json', hidden: true, onchange: (e) => importa(e, bozza, () => { disegnaRighe(); aggiornaContatore(); }) }))),
      h('div', { class: 'tabella-scorre' }, h('table', {},
        h('thead', {}, h('tr', {}, h('th', {}, 'Chiave'), h('th', {}, 'Valore'), h('th', {}, 'Adesso'), h('th', {}, ''))), righe)),
    ], { nota: attuale.aggiornato ? `aggiornata ${fa(attuale.aggiornato)}` : '' }),
    scheda('Proporre', [
      h('div', { class: 'filtri' },
        h('label', { class: 'campo' }, h('span', {}, 'Portata (§7)'), portata),
        dettaglio,
        h('label', { class: 'campo' }, h('span', {}, 'Inizio (facoltativo)'), inizio),
        h('label', { class: 'campo' }, h('span', {}, 'Fine (facoltativa)'), fine),
        h('button', { class: 'bottone primario', onclick: proponi }, 'Rivedi e proponi')),
      h('p', { style: { margin: '10px 0 0', color: 'var(--ink3)', fontSize: '12.5px' } },
        'Gli interruttori (feature flag, §8) sono chiavi come ', h('code', {}, 'interruttori.torneo'), '. Percentuali di utenti e segmenti richiedono che l\'app sappia leggerli: per ora valgono per tutti.'),
    ], { azioni: contatore }),
    storicoNodo(ctx, app, versioni),
  ];
}

/* ------------------------------------------------------------ i valori */

function appiattisci(o, prefisso = '', out = {}) {
  for (const [k, v] of Object.entries(o ?? {})) {
    const chiave = prefisso ? `${prefisso}.${k}` : k;
    if (v && typeof v === 'object' && !Array.isArray(v) && Object.keys(v).length) appiattisci(v, chiave, out);
    else out[chiave] = v;
  }
  return out;
}

function dispiega(piatto) {
  const out = {};
  for (const [k, v] of Object.entries(piatto)) {
    const parti = k.split('.');
    let o = out;
    parti.slice(0, -1).forEach((p) => { o[p] = (o[p] && typeof o[p] === 'object') ? o[p] : {}; o = o[p]; });
    o[parti.at(-1)] = v;
  }
  return out;
}

const mostra = (v) => (typeof v === 'string' ? `"${v}"` : JSON.stringify(v));

function editor(v, cambia) {
  if (typeof v === 'boolean') {
    const s = h('select', { onchange: () => cambia(s.value === 'true') }, h('option', { value: 'true' }, 'vero'), h('option', { value: 'false' }, 'falso'));
    s.value = String(v); return s;
  }
  if (typeof v === 'number') return h('input', { type: 'number', value: v, step: 'any', style: { width: '140px' }, oninput: (e) => cambia(e.target.value === '' ? null : Number(e.target.value)) });
  if (typeof v === 'string') return h('input', { type: 'text', value: v, style: { width: '100%', minWidth: '140px' }, oninput: (e) => cambia(e.target.value) });
  const t = h('input', { type: 'text', value: JSON.stringify(v), class: 'mono', style: { width: '100%', minWidth: '140px' } });
  t.addEventListener('change', () => { try { cambia(JSON.parse(t.value)); t.style.borderColor = ''; } catch { t.style.borderColor = 'var(--rosso)'; } });
  return t;
}

function diff(prima, dopo) {
  const chiavi = [...new Set([...Object.keys(prima), ...Object.keys(dopo)])].sort();
  return chiavi.map((k) => {
    const a = prima[k]; const b = dopo[k];
    const tipo = a === undefined ? 'nuova' : b === undefined ? 'tolta' : JSON.stringify(a) === JSON.stringify(b) ? 'uguale' : 'cambiata';
    return { chiave: k, prima: a, dopo: b, tipo };
  });
}

function diffNodo(d, mostraUguali = false) {
  return h('div', { class: 'diff' },
    h('div', { class: 'r testa' }, h('div', {}, 'Chiave'), h('div', {}, 'Prima'), h('div', {}, 'Dopo')),
    d.filter((x) => mostraUguali || x.tipo !== 'uguale').map((x) => h('div', { class: 'r' },
      h('div', {}, x.chiave),
      h('div', { class: x.tipo === 'uguale' ? 'uguale' : 'prima' }, x.prima === undefined ? '—' : mostra(x.prima)),
      h('div', { class: x.tipo === 'uguale' ? 'uguale' : 'dopo' }, x.dopo === undefined ? '— (tolta)' : mostra(x.dopo)))));
}

/**
 * **I controlli prima di proporre** (§86). Un premio da cinquanta milioni, un
 * evento che finisce prima di cominciare, una versione scritta male: si
 * fermano qui, non nel gioco.
 */
export function valida(prima, dopo, inizio, fine) {
  const out = [];
  for (const [k, v] of Object.entries(dopo)) {
    const p = prima[k];
    const nome = k.toLowerCase();
    if (p !== undefined && p !== null && v !== null && typeof p !== typeof v) out.push({ grave: true, testo: `${k}: era ${typeof p}, ora è ${typeof v}` });
    if (typeof v === 'number') {
      if (!Number.isFinite(v)) out.push({ grave: true, testo: `${k}: non è un numero` });
      else if (v < 0 && !/delta|variazione/.test(nome)) out.push({ grave: true, testo: `${k}: negativo (${v})` });
      if (/(premio|reward|monete|coins|gemme|gems|base|regalo)/.test(nome) && v > 100000) out.push({ grave: false, testo: `${k}: ${v.toLocaleString('it-IT')} è un premio enorme` });
      if (/(prob|percent|quota)/.test(nome) && (v > 100 || (v > 1 && String(p ?? '').includes('.')))) out.push({ grave: false, testo: `${k}: una probabilità di ${v} sembra fuori scala` });
      if (/algiorno$/.test(nome) && v > 50) out.push({ grave: false, testo: `${k}: ${v} volte al giorno` });
      if (typeof p === 'number' && p > 0 && (v / p >= 10 || p / Math.max(v, 1e-9) >= 10)) out.push({ grave: false, testo: `${k}: da ${p} a ${v} (×${(v / p).toLocaleString('it-IT', { maximumFractionDigits: 2 })})` });
    }
    if (/versione/.test(nome) && typeof v === 'string' && v && !/^\d+\.\d+\.\d+$/.test(v)) out.push({ grave: true, testo: `${k}: «${v}» non è una versione (es. 1.0.8)` });
    if (/manutenzione\.attiva$/.test(nome) && v === true && p !== true) out.push({ grave: false, testo: 'Stai accendendo la manutenzione: nessuno potrà giocare online' });
  }
  if (inizio && fine && new Date(fine) <= new Date(inizio)) out.push({ grave: true, testo: 'La fine viene prima dell\'inizio' });
  if (fine && new Date(fine) < new Date()) out.push({ grave: true, testo: 'La fine è già passata' });
  return out;
}

async function finestraNuovaChiave() {
  const chiave = h('input', { type: 'text', placeholder: 'es. bonus.base o interruttori.torneo', class: 'mono' });
  const tipo = h('select', {}, [['number', 'numero'], ['boolean', 'vero/falso'], ['string', 'testo'], ['json', 'JSON']].map(([v, t]) => h('option', { value: v }, t)));
  const valore = h('input', { type: 'text', placeholder: 'valore' });
  const err = h('div', { class: 'errore-testo' });
  return finestra({
    titolo: 'Nuovo parametro',
    corpo: [h('label', { class: 'campo' }, h('span', {}, 'Chiave'), chiave), h('label', { class: 'campo' }, h('span', {}, 'Tipo'), tipo), h('label', { class: 'campo' }, h('span', {}, 'Valore'), valore), err,
      h('p', {}, 'Un parametro nuovo serve solo se il gioco lo sa leggere: chiedi prima quale nome si aspetta.')],
    tasti: [{ testo: 'Annulla', risposta: null }, {
      testo: 'Aggiungi', classe: 'primario', valore: () => {
        const k = chiave.value.trim();
        if (!/^[A-Za-z][\w]*(\.[A-Za-z][\w]*)*$/.test(k)) { err.textContent = 'Chiave non valida'; return false; }
        const t = tipo.value; const s = valore.value.trim();
        try {
          const v = t === 'number' ? Number(s) : t === 'boolean' ? s === 'true' || s === 'vero' : t === 'json' ? JSON.parse(s) : s;
          if (t === 'number' && !Number.isFinite(v)) throw new Error();
          return { chiave: k, valore: v };
        } catch { err.textContent = 'Valore non valido per il tipo scelto'; return false; }
      },
    }],
  });
}

function esporta(app, piatto) {
  const blob = new Blob([JSON.stringify(dispiega(piatto), null, 2)], { type: 'application/json' });
  const a = h('a', { href: URL.createObjectURL(blob), download: `config-${app.id}-${new Date().toISOString().slice(0, 10)}.json` });
  document.body.append(a); a.click(); a.remove();
}

async function importa(e, bozza, fatto) {
  const f = e.target.files?.[0];
  if (!f) return;
  try {
    const o = JSON.parse(await f.text());
    if (!o || typeof o !== 'object' || Array.isArray(o)) throw new Error('Il file deve contenere un oggetto JSON');
    const piatto = appiattisci(o);
    for (const [k, v] of Object.entries(piatto)) bozza.set(k, v);
    fatto();
    avvisa(`Importati ${Object.keys(piatto).length} valori nella bozza: rivedi e proponi`);
  } catch (err) { avvisa(`Import non valido: ${err.message}`, true); }
  e.target.value = '';
}

/* ------------------------------------------------------------ lo storico (§9) */

function storicoNodo(ctx, app, versioni) {
  const scelte = new Set();
  const area = h('div', {});
  const confronta = () => {
    const [a, b] = [...scelte].map((v) => versioni.find((x) => x.versione === v)).sort((x, y) => x.versione - y.versione);
    if (!a || !b) { avvisa('Scegli due versioni da confrontare'); return; }
    metti(svuota(area), h('h3', { style: { margin: '12px 0 8px' } }, `Versione ${a.versione} → ${b.versione}`),
      diffNodo(diff(appiattisci(a.valori ?? {}), appiattisci(b.valori ?? {}))));
  };
  const ripristina = async (v) => {
    const r = await confermaConMotivo({ titolo: `Ripristina la versione ${v.versione}`, tasto: 'Ripristina', pericolo: true, testo: 'Diventa una nuova versione, uguale a quella scelta. Passa dalle approvazioni.' });
    if (!r) return;
    try { await api.configRipristina(app.id, v.id ?? v.versione, r.motivo); avvisa('Ripristino proposto'); ctx.vai(`#/configurazione/${app.id}?${Date.now()}`); } catch (e) { avvisa(e.message, true); }
  };
  const clona = async (v) => {
    const altre = ctx.apps.filter((a) => a.id !== app.id && api.sa(a, 'configLeggi'));
    if (!altre.length) { avvisa('Non ci sono altre app con la configurazione da remoto', true); return; }
    const r = await confermaConMotivo({
      titolo: `Clona la versione ${v.versione} in un'altra app`, tasto: 'Proponi',
      campi: [{ nome: 'dove', etichetta: 'Nell\'app', tipo: 'select', opzioni: altre.map((a) => ({ valore: a.id, testo: a.nome })) }],
      testo: 'Diventa una proposta per l\'altra app: le chiavi che quel gioco non conosce vengono ignorate dal suo adattatore.',
    });
    if (!r) return;
    try { await api.configClona(v.id ?? v.versione, r.dove, r.motivo); avvisa('Proposta inviata'); } catch (e) { avvisa(e.message, true); }
  };
  return scheda('Storico delle versioni (§9)', [
    tabella([
      { titolo: '', cella: (v) => h('input', { type: 'checkbox', 'aria-label': `Confronta la versione ${v.versione}`, onchange: (e) => { if (e.target.checked) scelte.add(v.versione); else scelte.delete(v.versione); } }) },
      { titolo: 'Versione', num: true, chiave: 'versione' },
      { titolo: 'Quando', cella: (v) => data(v.quando) },
      { titolo: 'Chi', cella: (v) => v.admin ?? '—' },
      { titolo: 'Motivo', cella: (v) => v.motivo ?? '—' },
      { titolo: 'Portata', cella: (v) => v.scope ?? v.portata?.livello ?? '—' },
      { titolo: 'Stato', cella: (v) => pill(v.stato ?? '—', v.stato === 'live' ? 'verde' : v.stato === 'programmata' ? 'viola' : '') },
      { titolo: '', cella: (v) => h('div', { class: 'azioni' },
        v.stato === 'live' ? null : h('button', { class: 'bottone piccolo', onclick: () => ripristina(v) }, 'Ripristina'),
        h('button', { class: 'bottone piccolo', onclick: () => clona(v) }, 'Clona')) },
    ], versioni, { vuoto: 'Nessuna versione registrata dal pannello.' }),
    h('div', { class: 'azioni', style: { marginTop: '10px' } }, h('button', { class: 'bottone', onclick: confronta }, 'Confronta le due scelte')),
    area,
  ]);
}

/* ------------------------------------------------------------ le approvazioni (§10) */

const COLORI_STATO = { DRAFT: '', REVIEW: 'ambra', APPROVED: 'cielo', SCHEDULED: 'viola', LIVE: 'verde', REJECTED: 'rosso', CANCELLED: '' };

export async function approvazioniNodo(ctx, app) {
  let lista;
  try { lista = await api.approvazioni(); } catch (e) { return scheda('Approvazioni (§10)', erroreBox(e)); }
  const mie = lista.filter((a) => !app || a.app === app.id);
  const aperte = mie.filter((a) => !['LIVE', 'REJECTED', 'CANCELLED'].includes(a.stato));
  const decidi = async (a, decisione) => {
    const codice = h('input', { class: 'codice-otp', inputmode: 'numeric', maxlength: 6, placeholder: '000000', 'aria-label': 'Codice TOTP' });
    const motivo = h('textarea', { placeholder: 'Motivo' });
    const err = h('div', { class: 'errore-testo' });
    const ok = await finestra({
      titolo: decisione === 'approva' ? 'Approva' : decisione === 'rifiuta' ? 'Rifiuta' : 'Annulla la proposta',
      corpo: [h('p', {}, `${a.tipo}: ${a.riassunto ?? ''}`), h('label', { class: 'campo' }, h('span', {}, 'Codice dell\'app di autenticazione'), codice), h('label', { class: 'campo' }, h('span', {}, 'Motivo'), motivo), err],
      tasti: [{ testo: 'Indietro', risposta: null }, {
        testo: 'Conferma', classe: decisione === 'approva' ? 'primario' : 'pericolo pieno', valore: () => {
          if (!/^\d{6}$/.test(codice.value.trim())) { err.textContent = 'Servono le sei cifre del codice'; return false; }
          if (motivo.value.trim().length < 5) { err.textContent = 'Scrivi un motivo'; return false; }
          return true;
        },
      }],
    });
    if (!ok) return;
    try { await api.decidi(a.id, decisione, motivo.value.trim(), codice.value.trim()); avvisa('Fatto'); ctx.vai(`${location.hash.split('?')[0]}?${Date.now()}`); } catch (e) { avvisa(e.message, true); }
  };
  return scheda('Approvazioni (§10)', [
    h('p', { style: { margin: '0 0 10px', color: 'var(--ink3)', fontSize: '12.5px' } },
      'DRAFT → REVIEW → APPROVED → SCHEDULED → LIVE. Con un solo Super Admin si riconferma col codice e la modifica parte dopo 10 minuti, annullabile.'),
    tabella([
      { titolo: 'Quando', cella: (a) => fa(a.quando) },
      { titolo: 'App', cella: (a) => ctx.apps.find((x) => x.id === a.app)?.nome ?? a.app ?? 'Tutte' },
      { titolo: 'Tipo', chiave: 'tipo' },
      { titolo: 'Cosa', cella: (a) => a.riassunto ?? '—' },
      { titolo: 'Chi', cella: (a) => a.proposto_da ?? '—' },
      { titolo: 'Stato', cella: (a) => h('span', {}, pill(a.stato, COLORI_STATO[a.stato] ?? ''), a.parte_il && a.stato === 'SCHEDULED' ? h('span', { style: { color: 'var(--ink3)', fontSize: '12px' } }, ` parte ${data(a.parte_il)}`) : null) },
      { titolo: '', cella: (a) => ['LIVE', 'REJECTED', 'CANCELLED'].includes(a.stato) ? '' : h('div', { class: 'azioni' },
        a.stato === 'REVIEW' ? h('button', { class: 'bottone piccolo primario', onclick: () => decidi(a, 'approva') }, 'Approva') : null,
        a.stato === 'REVIEW' ? h('button', { class: 'bottone piccolo pericolo', onclick: () => decidi(a, 'rifiuta') }, 'Rifiuta') : null,
        h('button', { class: 'bottone piccolo', onclick: () => decidi(a, 'annulla') }, 'Annulla')) },
    ], aperte.length ? aperte : mie.slice(0, 5), { vuoto: 'Nessuna proposta.' }),
  ], { nota: aperte.length ? `${aperte.length} in corso` : 'niente in sospeso' });
}
