/**
 * APP (§2, §5, §62, §64)
 * ======================
 *
 * L'elenco dei giochi per famiglia, e per ognuno la sua scheda: identità
 * negli store, versioni, manutenzione, aggiornamento obbligatorio o
 * consigliato, interruttori. Ogni cambio passa dal flusso delle approvazioni
 * (§10) e resta nel registro con il motivo.
 */
import * as api from '../api.js';
import { h, scheda, tabella, pill, confermaConMotivo, avvisa, data } from '../ui.js';

export async function disegna(ctx) {
  const id = ctx.param[0];
  const app = id ? ctx.apps.find((a) => a.id === id) : ctx.app;
  if (app) return schedaApp(ctx, app);
  ctx.ricordaRecente('App');
  return [
    h('p', { style: { margin: 0, color: 'var(--ink2)' } },
      'Organizzazione → famiglia → gioco → piattaforma → ambiente. Ogni configurazione vale per uno di questi livelli (§2).'),
    ...famiglie(ctx.apps).map(([fam, lista]) => scheda(fam, tabella([
      { titolo: 'Gioco', cella: (a) => h('a', { href: `#/apps/${a.id}` }, a.nome) },
      { titolo: 'Piattaforme', cella: (a) => (a.piattaforme ?? []).map((p) => pill(p === 'ios' ? 'iOS' : 'Android', 'cielo')) },
      { titolo: 'Pubblicata', cella: (a) => versioneBreve(a, 'pubblicata') },
      { titolo: 'Minima', cella: (a) => versioneBreve(a, 'minima') },
      { titolo: 'Stato', cella: (a) => statoApp(a) },
      { titolo: 'Ambiente', cella: (a) => pill(a.ambiente ?? 'production', a.ambiente === 'production' ? 'verde' : 'ambra') },
      { titolo: 'Contratto', cella: (a) => a.capacita ? `v${a.capacita.versioneContratto ?? 1} · ${(a.capacita.azioni ?? []).length} azioni` : pill('non collegato', 'rosso') },
    ], lista, { clic: (a) => ctx.vai(`#/apps/${a.id}`) }), { nota: lista[0]?.organizzazione ?? '' })),
    scheda('Aggiungere un gioco', [
      h('p', { style: { margin: '0 0 10px', color: 'var(--ink2)' } },
        'Un gioco nuovo si collega col suo adattatore (la funzione `amministra` sul suo server, stesso contratto per tutti). Si può partire clonando la configurazione di un gioco esistente, per esempio Tresette da Briscola.'),
      h('div', { class: 'azioni' },
        h('button', { class: 'bottone primario', onclick: () => nuovaApp(ctx) }, 'Nuova app'),
        h('a', { class: 'bottone', href: '#/configurazione' }, 'Clona una configurazione')),
    ]),
  ];
}

function famiglie(apps) {
  const m = new Map();
  for (const a of apps) m.set(a.famiglia ?? 'Altre', [...(m.get(a.famiglia ?? 'Altre') ?? []), a]);
  return [...m.entries()];
}

const versioneBreve = (a, k) => Object.entries(a.versioni ?? {}).map(([p, v]) => v?.[k] ? `${p === 'ios' ? 'iOS' : 'And.'} ${v[k]}` : null).filter(Boolean).join(' · ') || '—';

function statoApp(a) {
  if (a.config?.manutenzione?.attiva) return pill('Manutenzione', 'ambra');
  if (a.stato === 'live') return pill('Live', 'verde');
  return pill(a.stato ?? '—');
}

async function schedaApp(ctx, app) {
  ctx.ricordaRecente(app.nome);
  ctx.briciole([{ testo: 'App', hash: '#/apps' }, { testo: app.nome }]);
  document.querySelector('.titolo-pagina h1').textContent = app.nome;
  // Interruttori e pubblicità sono chiavi della configurazione del gioco: si leggono da lì.
  const conf = api.sa(app, 'configLeggi') ? await api.configLeggi(app.id).catch(() => null) : null;
  const cfg = { ...(app.config ?? {}), ...(conf?.valori ?? {}), manutenzione: app.config?.manutenzione ?? conf?.valori?.manutenzione };
  const inter = cfg.interruttori ?? {};

  const proponi = async (titolo, cambi, testo, pericolo = false) => {
    const r = await confermaConMotivo({ titolo, testo, pericolo, tasto: 'Proponi' });
    if (!r) return;
    try {
      const res = await api.appAggiorna(app.id, cambi, r.motivo);
      const s = res?.approvazione;
      avvisa(s ? `Fatto: ${s.stato}${s.parte_il ? ` (parte ${data(s.parte_il)})` : ''}` : 'Fatto');
    } catch (e) { avvisa(e.message, true); }
  };

  const riga = (nome, desc, acceso, alClic) => h('div', { class: 'interruttore' },
    h('div', {}, h('div', { style: { fontWeight: 600 } }, nome), h('div', { class: 'desc' }, desc)),
    h('button', { class: `leva${acceso ? ' accesa' : ''}`, role: 'switch', 'aria-checked': String(!!acceso), 'aria-label': nome, onclick: alClic }));

  const v = app.versioni ?? {};
  return [
    h('div', { class: 'griglia g2' },
      scheda('Identità', h('dl', { class: 'dati' },
        h('dt', {}, 'ID nel pannello'), h('dd', { class: 'mono' }, app.id),
        h('dt', {}, 'Famiglia'), h('dd', {}, app.famiglia ?? '—'),
        h('dt', {}, 'Package / Bundle'), h('dd', { class: 'mono' }, app.pacchetto ?? '—'),
        h('dt', {}, 'Google Play'), h('dd', {}, app.playId ? h('a', { href: `https://play.google.com/store/apps/details?id=${encodeURIComponent(app.playId)}`, target: '_blank', rel: 'noopener' }, app.playId) : '—'),
        h('dt', {}, 'App Store'), h('dd', {}, app.appStoreId ?? '— (iOS in attesa)'),
        h('dt', {}, 'Piattaforme'), h('dd', {}, (app.piattaforme ?? []).join(', ') || '—'),
        h('dt', {}, 'Paesi'), h('dd', {}, (app.paesi ?? []).join(', ') || '—'),
        h('dt', {}, 'Lingue'), h('dd', {}, (app.lingue ?? []).join(', ') || '—'),
        h('dt', {}, 'Ambiente'), h('dd', {}, (app.ambienti ?? [app.ambiente ?? 'production']).join(', ')),
        h('dt', {}, 'Stato'), h('dd', {}, statoApp(app)),
        h('dt', {}, 'Modalità'), h('dd', {}, (app.modalita ?? []).join(', ') || '—'),
        h('dt', {}, 'Adattatore'), h('dd', {}, app.capacita ? `contratto v${app.capacita.versioneContratto ?? 1}, ${(app.capacita.azioni ?? []).length} azioni`
          : app.erroreAdattatore ? pill(`non risponde: ${app.erroreAdattatore}`, 'rosso') : 'non collegato'))),
      scheda('Versioni (§63, §64)', [
        tabella([
          { titolo: 'Piattaforma', cella: (r) => r.p === 'ios' ? 'iOS' : 'Android' },
          { titolo: 'Pubblicata', cella: (r) => r.v?.pubblicata ?? '—' },
          { titolo: 'Ultima', cella: (r) => r.v?.ultima ?? '—' },
          { titolo: 'Consigliata', cella: (r) => r.v?.consigliata ?? '—' },
          { titolo: 'Minima', cella: (r) => r.v?.minima ?? cfg.versioneMinima ?? '—' },
        ], Object.entries(v).map(([p, x]) => ({ p, v: x })), { vuoto: 'Nessuna versione registrata.' }),
        h('div', { class: 'azioni', style: { marginTop: '12px' } },
          h('button', {
            class: 'bottone', onclick: async () => {
              const r = await confermaConMotivo({
                titolo: 'Versione minima (aggiornamento obbligatorio)', tasto: 'Proponi', pericolo: true,
                testo: 'Sotto questa versione l\'app mostra «Serve la versione nuova» e non si gioca. Alzala solo quando quella nuova è scaricabile dallo store per tutti.',
                campi: [{ nome: 'versione', etichetta: 'Versione minima', valore: cfg.versioneMinima ?? '' }],
              });
              if (!r) return;
              if (!/^\d+\.\d+\.\d+$/.test(r.versione.trim())) { avvisa('Scrivi una versione come 1.0.8', true); return; }
              try { await api.appAggiorna(app.id, { versioneMinima: r.versione.trim() }, r.motivo); avvisa('Proposta inviata'); } catch (e) { avvisa(e.message, true); }
            },
          }, 'Versione minima…'),
          h('a', { class: 'bottone', href: '#/rilasci' }, 'Rilasci e adozione')),
      ])),
    scheda('Interruttori (§8, §62, §101)', [
      riga('Manutenzione', cfg.manutenzione?.attiva ? `Attiva: «${cfg.manutenzione.messaggio ?? ''}»` : 'Spenta. Accesa: niente partite sul server, l\'allenamento offline resta.',
        cfg.manutenzione?.attiva, async () => {
          if (cfg.manutenzione?.attiva) { await proponi('Spegni la manutenzione', { manutenzione: { attiva: false } }, 'Il gioco torna disponibile per tutti.'); return; }
          const r = await confermaConMotivo({
            titolo: 'Accendi la manutenzione', pericolo: true, parola: 'MANUTENZIONE', tasto: 'Proponi',
            testo: 'I giocatori vedono il messaggio e non possono giocare online finché non la spegni.',
            campi: [{ nome: 'messaggio', etichetta: 'Messaggio ai giocatori (due righe al massimo)', valore: 'Stiamo sistemando il gioco: torniamo tra poco.' },
              { nome: 'riapertura', etichetta: 'Riapertura prevista', tipo: 'datetime-local' }],
          });
          if (!r) return;
          try { await api.appAggiorna(app.id, { manutenzione: { attiva: true, messaggio: r.messaggio, riapertura: r.riapertura || null } }, r.motivo); avvisa('Proposta inviata'); } catch (e) { avvisa(e.message, true); }
        }),
      ...Object.entries(inter).map(([k, acceso]) => riga(nomeInterruttore(k), acceso ? 'Acceso' : 'Spento: la funzione non compare nell\'app', acceso,
        () => proponi(`${acceso ? 'Spegni' : 'Accendi'} ${nomeInterruttore(k).toLowerCase()}`, { interruttori: { ...inter, [k]: !acceso } },
          acceso ? 'Kill switch: la funzione sparisce dall\'app al prossimo avvio o ritorno in primo piano.' : 'La funzione torna disponibile.', acceso))),
      riga('Pubblicità', cfg.pubblicita ? 'Accesa' : 'Spenta per scelta: si riaccende dall\'app quando AdMob approva (F-95-ter).', cfg.pubblicita,
        () => avvisa('La pubblicità si riaccende solo con una nuova versione dell\'app (consenso GDPR e verifica dei video): vedi F-95-ter.', true)),
      Object.keys(inter).length === 0 ? h('p', { style: { color: 'var(--ink3)', margin: '8px 0 0' } }, 'Questo gioco non ha ancora interruttori per funzione.') : null,
    ]),
  ];
}

const NOMI_INT = { online: 'Partite online', torneo: 'Torneo', lega: 'Lega settimanale' };
const nomeInterruttore = (k) => NOMI_INT[k] ?? k;

async function nuovaApp(ctx) {
  const r = await confermaConMotivo({
    titolo: 'Nuova app', tasto: 'Crea',
    testo: 'L\'app compare nel pannello; i dati arrivano quando il suo adattatore è pubblicato e il segreto è nel Vault.',
    campi: [
      { nome: 'nome', etichetta: 'Nome', segnaposto: 'Settebello Briscola' },
      { nome: 'famiglia', etichetta: 'Famiglia', tipo: 'select', opzioni: [...new Set(ctx.apps.map((a) => a.famiglia).filter(Boolean)), 'Nuova famiglia'].map((f) => ({ valore: f, testo: f })) },
      { nome: 'pacchetto', etichetta: 'Package / Bundle ID', segnaposto: 'it.settebello.briscola' },
      { nome: 'adattatore', etichetta: 'Indirizzo dell\'adattatore', segnaposto: 'https://…supabase.co/functions/v1/amministra' },
      { nome: 'clona', etichetta: 'Clona la configurazione di', tipo: 'select', opzioni: [{ valore: '', testo: '— nessuna —' }, ...ctx.apps.map((a) => ({ valore: a.id, testo: a.nome }))] },
    ],
  });
  if (!r) return;
  if (!r.nome.trim()) { avvisa('Serve un nome', true); return; }
  try {
    await api.appCrea({ nome: r.nome.trim(), famiglia: r.famiglia, pacchetto: r.pacchetto.trim(), adattatore: r.adattatore.trim(), clonaDa: r.clona || null }, r.motivo);
    avvisa('App creata: ricarica per vederla');
  } catch (e) { avvisa(e.message, true); }
}
