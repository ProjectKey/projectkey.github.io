/**
 * GIOCATORI (§11, §12, §13, §14)
 * ==============================
 *
 * Ricerca per ID, nome, email, ID Play Games, ordine d'acquisto o partita;
 * la scheda con profilo, gioco, economia, soldi, tecnica; la timeline unica;
 * e gli strumenti dell'assistenza. Ogni azione che cambia qualcosa chiede il
 * motivo, passa dal server e finisce nel registro (§12, §102).
 */
import * as api from '../api.js';
import { tastoRimborsa } from './monetizzazione.js';
import {
  h, svuota, metti, scheda, tabella, pill, kpi, num, soldi, perc, data, ora, giornoDi, fa,
  confermaConMotivo, avvisa, caricamento, erroreBox, nonDisponibile, memoria,
} from '../ui.js';

export async function disegna(ctx) {
  const [appId, id] = ctx.param;
  if (appId && id) {
    const app = ctx.apps.find((a) => a.id === appId);
    if (!app) return erroreBox(new Error(`App sconosciuta: ${appId}`));
    return schedaGiocatore(ctx, app, id);
  }
  ctx.ricordaRecente('Giocatori');
  const bersagli = (ctx.app ? [ctx.app] : ctx.apps).filter((a) => api.sa(a, 'cercaGiocatori'));
  const q = h('input', { type: 'search', placeholder: 'ID, nome, email, ID Play Games, ordine GPA…, ID partita', value: memoria.leggi('giocatori.q', ''), style: { flex: 1, minWidth: '220px' }, 'aria-label': 'Cerca un giocatore' });
  const esiti = h('div', {});
  const cerca = async () => {
    memoria.scrivi('giocatori.q', q.value.trim());
    metti(svuota(esiti), caricamento('Cerco…'));
    const righe = [];
    const errori = [];
    await Promise.all(bersagli.map(async (app) => {
      try { for (const g of await api.cercaGiocatori(app.id, q.value.trim())) righe.push({ ...g, app }); } catch (e) { errori.push(`${app.nome}: ${e.message}`); }
    }));
    righe.sort((x, y) => String(y.visto ?? '').localeCompare(String(x.visto ?? '')));
    const cercato = q.value.trim();
    // A vuoto non tutti i giochi sanno rispondere (Last Sheep vuole un testo): lo si dice piano,
    // non in rosso. Cercando qualcosa, invece, un errore è un errore.
    metti(svuota(esiti),
      errori.length && q.value.trim() ? erroreBox(new Error(errori.join(' · '))) : null,
      errori.length && !q.value.trim() ? h('p', { class: 'nota', style: { color: 'var(--ink3)', fontSize: '13px' } }, `Senza ricerca non rispondono: ${errori.join(' · ')}. Scrivi un nome o un ID per cercare anche lì.`) : null,
      scheda(cercato ? `Risultati per «${cercato}» (${righe.length})` : `Ultimi giocatori visti (${righe.length})`, tabella([
        { titolo: 'Nome', cella: (g) => h('strong', {}, g.nome ?? '—') },
        { titolo: 'ID', cella: (g) => h('span', { class: 'mono' }, g.id) },
        { titolo: 'App', cella: (g) => g.app.nome },
        { titolo: 'Livello', num: true, cella: (g) => num(g.livello) },
        { titolo: 'Legami', cella: (g) => (g.legami ?? []).length ? g.legami.map((l) => pill(l, 'viola')) : pill('anonimo') },
        { titolo: 'Iscritto', cella: (g) => data(g.creato, false) },
        { titolo: 'Ultimo accesso', cella: (g) => fa(g.visto) },
      ], righe, { vuoto: 'Nessun giocatore trovato.', clic: (g) => ctx.vai(`#/giocatori/${g.app.id}/${g.id}`) }),
      { nota: cercato ? '' : 'a ricerca vuota: gli ultimi 50 per app, senza amministratori e account di prova' }));
  };
  const nodi = [
    scheda(null, h('form', { class: 'filtri', onsubmit: (e) => { e.preventDefault(); void cerca(); } },
      q, h('button', { class: 'bottone primario', type: 'submit' }, 'Cerca'))),
    esiti,
    ...(ctx.app ? [ctx.app] : ctx.apps).filter((a) => a.erroreAdattatore)
      .map((a) => erroreBox(new Error(`${a.nome} non risponde: ${a.erroreAdattatore}. Ricarica la pagina fra poco.`))),
    bersagli.length === 0 ? nonDisponibile('Ricerca giocatori', 'l\'adattatore non espone `giocatori.cerca`.') : null,
  ];
  if (bersagli.length) void cerca();
  return nodi;
}

async function schedaGiocatore(ctx, app, id) {
  if (!api.sa(app, 'scheda')) return nonDisponibile('Scheda giocatore', `${app.nome} non espone ancora \`giocatori.scheda\`.`);
  const g = await api.scheda(app.id, id);
  if (!g) return erroreBox(new Error('Giocatore non trovato'));
  ctx.ricordaRecente(`${g.nome ?? 'Giocatore'} · ${app.nome}`);
  ctx.briciole([{ testo: app.nome }, { testo: 'Giocatori', hash: '#/giocatori' }, { testo: g.nome ?? id }]);
  document.querySelector('.titolo-pagina h1').textContent = g.nome ?? 'Giocatore';

  const bandito = g.stato?.bandito_fino && new Date(g.stato.bandito_fino) > new Date();
  const scrive = (azione) => api.sa(app, azione);

  const ricarica = () => { location.hash = `${location.hash.split('?')[0]}?${Date.now()}`; };
  const azioni = h('div', { class: 'azioni' },
    scrive('accredita') ? h('button', {
      class: 'bottone primario', onclick: async () => {
        // Le valute le dichiara l'adattatore (`capacita`): { codice, nome }.
        const valute = (app.capacita?.valute ?? []).map((v) => (typeof v === 'string' ? { codice: v, nome: v } : v));
        const r = await confermaConMotivo({
          titolo: `Accredita a ${g.nome ?? 'questo giocatore'}`, tasto: 'Accredita',
          testo: 'Il movimento passa dalla cassa del gioco (una volta sola anche se premi due volte) e resta nel registro. Un numero negativo toglie.',
          campi: [
            { nome: 'valuta', etichetta: 'Valuta', tipo: 'select', opzioni: valute.map((v) => ({ valore: v.codice, testo: v.nome })) },
            { nome: 'quantita', etichetta: 'Quantità', tipo: 'number', step: 1, valore: 100 },
          ],
        });
        if (!r) return;
        const n = Number(r.quantita);
        if (!Number.isInteger(n) || n === 0) { avvisa('La quantità deve essere un numero intero diverso da zero', true); return; }
        if (Math.abs(n) > 100000) { avvisa('Più di 100.000 in una volta: serve il flusso di approvazione dalla Configurazione (§86)', true); return; }
        try {
          const esito = await api.accredita(app.id, id, r.valuta, n, r.motivo);
          avvisa(esito?.inApprovazione ? 'Oltre il tetto del tuo ruolo: è in approvazione' : 'Fatto');
          ricarica();
        } catch (e) { avvisa(e.message, true); }
      },
    }, 'Accredita / togli') : null,
    scrive(bandito ? 'sblocca' : 'blocca') ? h('button', {
      class: `bottone${bandito ? '' : ' pericolo'}`, onclick: async () => {
        if (bandito) {
          const r = await confermaConMotivo({ titolo: 'Sblocca l\'account', tasto: 'Sblocca' });
          if (!r) return;
          try { await api.sblocca(app.id, id, r.motivo); avvisa('Sbloccato'); ricarica(); } catch (e) { avvisa(e.message, true); }
          return;
        }
        const r = await confermaConMotivo({
          titolo: 'Blocca l\'account', tasto: 'Blocca', pericolo: true, parola: 'BLOCCA',
          testo: 'Non entra in coda e sparisce dalle classifiche finché dura il blocco.',
          campi: [{ nome: 'durata', etichetta: 'Per quanto', tipo: 'select', opzioni: [
            { valore: '1', testo: '1 giorno' }, { valore: '7', testo: '7 giorni' }, { valore: '30', testo: '30 giorni' }, { valore: '0', testo: 'Per sempre (chiede approvazione)' }] }],
        });
        if (!r) return;
        const fino = r.durata === '0' ? null : new Date(Date.now() + Number(r.durata) * 86400000).toISOString();
        try {
          const esito = await api.blocca(app.id, id, fino, r.motivo);
          avvisa(esito?.inApprovazione ? 'In approvazione: parte fra 10 minuti se non lo annulli' : 'Bloccato');
          ricarica();
        } catch (e) { avvisa(e.message, true); }
      },
    }, bandito ? 'Sblocca' : 'Blocca') : null,
    scrive('nome') ? h('button', {
      class: 'bottone', onclick: async () => {
        const r = await confermaConMotivo({
          titolo: 'Reimposta il nome', tasto: 'Reimposta',
          testo: 'Per un nome offensivo o che si spaccia per qualcun altro. Lascia vuoto per un nome di serie («Giocatore 1234»).',
          campi: [{ nome: 'nome', etichetta: 'Nome nuovo', valore: '' }],
        });
        if (!r) return;
        try { await api.resetNome(app.id, id, r.nome.trim() || null, r.motivo); avvisa('Nome cambiato'); ricarica(); } catch (e) { avvisa(e.message, true); }
      },
    }, 'Reimposta nome') : null,
    h('button', { class: 'bottone', onclick: () => { void navigator.clipboard?.writeText(id).then(() => avvisa('ID copiato')); } }, 'Copia ID'));

  const gi = g.gioco ?? {};
  const eco = g.economia ?? {};
  const mon = g.monetizzazione ?? {};
  const tec = g.tecnica ?? {};

  const pannelli = {
    Profilo: () => h('div', { class: 'griglia g2' },
      scheda('Profilo', h('dl', { class: 'dati' },
        h('dt', {}, 'ID'), h('dd', { class: 'mono' }, g.id),
        h('dt', {}, 'Nome'), h('dd', {}, g.nome ?? '—'),
        h('dt', {}, 'Livello · XP'), h('dd', {}, `${num(g.livello)} · ${num(g.xp)}`),
        h('dt', {}, 'Iscritto'), h('dd', {}, data(g.creato)),
        h('dt', {}, 'Ultimo accesso'), h('dd', {}, `${data(g.visto)} (${fa(g.visto)})`),
        h('dt', {}, 'Legami'), h('dd', {}, (g.legami ?? []).length ? g.legami.map((l) => pill(l, 'viola')) : 'anonimo: non recuperabile da un altro telefono'),
        h('dt', {}, 'App usate'), h('dd', {}, (g.app ?? [app.nome]).join(', ')),
        h('dt', {}, 'Paese · lingua'), h('dd', {}, `${g.paese ?? '—'} · ${g.lingua ?? '—'}`),
        h('dt', {}, 'Stato'), h('dd', {}, bandito ? pill(`Bloccato fino al ${data(g.stato.bandito_fino)}`, 'rosso') : pill('Attivo', 'verde')))),
      scheda('Dispositivo e consensi', h('dl', { class: 'dati' },
        h('dt', {}, 'Dispositivo'), h('dd', {}, g.device ?? '—'),
        h('dt', {}, 'Sistema'), h('dd', {}, g.os ?? '—'),
        h('dt', {}, 'Versione app'), h('dd', {}, g.versione ?? '—'),
        ...Object.entries(g.consensi ?? {}).flatMap(([k, v]) => [h('dt', {}, `Consenso ${k}`), h('dd', {}, String(v))]),
        Object.keys(g.consensi ?? {}).length ? null : [h('dt', {}, 'Consensi'), h('dd', {}, 'lo storico dei consensi non è ancora registrato dall\'app (§71)')]))),
    Gioco: () => h('div', { class: 'griglia g4' },
      kpi('Partite', num(gi.partite)), kpi('Vinte', num(gi.vinte), gi.partite ? `win rate ${perc(gi.vinte / gi.partite)}` : ''),
      kpi('Sconfitte', num(gi.sconfitte)), kpi('Abbandoni', num(gi.abbandoni)),
      kpi('Classifica', gi.ranking ? `${gi.ranking}º` : '—', 'lega della settimana'), kpi('MMR', num(gi.mmr), gi.mmr ? '' : 'non usato'),
      kpi('Tornei', num(gi.tornei)), kpi('Missioni finite', num(gi.missioni))),
    Economia: () => h('div', { class: 'griglia g2' },
      scheda('Saldi', h('div', { class: 'griglia g2' }, (eco.valute ?? []).map((v) => kpi(v.nome, num(v.saldo))))),
      scheda('Battle Pass', eco.pass ? h('dl', { class: 'dati' },
        h('dt', {}, 'Stagione'), h('dd', {}, eco.pass.stagione ?? '—'),
        h('dt', {}, 'Livello'), h('dd', {}, num(eco.pass.livello)),
        h('dt', {}, 'Premium'), h('dd', {}, eco.pass.premium ? pill('sì', 'viola') : 'no')) : h('p', {}, '—')),
      scheda('Bauli', tabella([{ titolo: 'Tipo', chiave: 'tipo' }, { titolo: 'Stato', chiave: 'stato' }, { titolo: 'Pronto', cella: (b) => data(b.pronto) }], eco.bauli ?? [], { vuoto: 'Nessun baule.' })),
      scheda('Inventario', tabella([{ titolo: 'Oggetto', chiave: 'nome' }, { titolo: 'Categoria', cella: (i) => pill(i.categoria ?? '—') }], eco.inventario ?? [], { vuoto: 'Inventario vuoto.' }))),
    Soldi: () => [
      h('div', { class: 'griglia g4' }, kpi('Totale speso', soldi(mon.speso)), kpi('Ultimo acquisto', mon.ultimo ? fa(mon.ultimo) : '—'),
        kpi('Rimborsi', num(mon.rimborsi)), kpi('Premi da video', num(mon.premiVideo), 'pubblicità spenta')),
      scheda('Acquisti', tabella([
        { titolo: 'Quando', cella: (a) => data(a.quando) }, { titolo: 'Prodotto', chiave: 'prodotto' },
        { titolo: 'Prezzo', num: true, cella: (a) => soldi(a.prezzo) },
        { titolo: 'Stato', cella: (a) => pill(a.stato, a.stato === 'consegnato' ? 'verde' : a.stato === 'rimborsato' ? 'rosso' : 'ambra') },
        { titolo: 'Ordine', cella: (a) => h('span', { class: 'mono' }, a.ordine ?? '—') },
        { titolo: '', cella: (a) => tastoRimborsa(ctx, app, a) },
      ], mon.acquisti ?? [], { vuoto: 'Nessun acquisto.' }))],
    Tecnica: () => h('div', { class: 'griglia g2' },
      scheda('Installazioni', tabella([
        { titolo: 'Piattaforma', chiave: 'piattaforma' }, { titolo: 'Versione', chiave: 'versione' },
        { titolo: 'Aggiornamento', cella: (i) => h('span', { class: 'mono' }, i.aggiornamento ?? '—') }, { titolo: 'Ultima volta', cella: (i) => fa(i.ultima) },
      ], tec.installazioni ?? [], { vuoto: 'Nessuna installazione registrata.' })),
      scheda('Errori recenti', tabella([{ titolo: 'Quando', cella: (e) => data(e.quando) }, { titolo: 'Errore', chiave: 'messaggio' }], tec.errori ?? [], { vuoto: 'Nessun errore.' }),
        { nota: tec.disconnessioni !== undefined ? `${num(tec.disconnessioni)} disconnessioni in partita` : '' })),
    Timeline: () => timelineNodo(app, id),
  };

  const scelta = memoria.leggi('giocatori.tab', 'Profilo');
  const area = h('div', {});
  const tab = h('div', { class: 'tab', role: 'tablist' });
  const apri = (nome) => {
    memoria.scrivi('giocatori.tab', nome);
    for (const b of tab.children) b.classList.toggle('attiva', b.textContent === nome);
    const x = pannelli[nome]();
    metti(svuota(area), ...(Array.isArray(x) ? x : [x]));
  };
  for (const nome of Object.keys(pannelli)) tab.append(h('button', { role: 'tab', type: 'button', onclick: () => apri(nome) }, nome));
  apri(pannelli[scelta] ? scelta : 'Profilo');

  return [
    h('div', { class: 'azioni', style: { justifyContent: 'space-between' } },
      h('div', { class: 'azioni' }, pill(app.nome, 'cielo'), bandito ? pill('Bloccato', 'rosso') : null,
        (g.legami ?? []).map((l) => pill(l, 'viola'))),
      azioni),
    h('div', { class: 'griglia g6' },
      kpi('Livello', num(g.livello)), kpi('Partite', num(gi.partite)),
      ...(eco.valute ?? []).slice(0, 2).map((v) => kpi(v.nome, num(v.saldo))),
      kpi('Speso', soldi(mon.speso)), kpi('Ultimo accesso', fa(g.visto))),
    tab, area,
  ];
}

function timelineNodo(app, id) {
  if (!api.sa(app, 'timeline')) return nonDisponibile('Timeline', `${app.nome} non espone ancora \`giocatori.timeline\`.`);
  const box = h('div', {}, caricamento());
  const TIPI = { accesso: '', partita: 'partita', denaro: 'denaro', valuta: 'denaro', acquisto: 'denaro', errore: 'errore', admin: 'admin', cassa: '' };
  api.timeline(app.id, id).then((eventi) => {
    const lista = h('ol', { class: 'linea-tempo' });
    let giornoCorrente = '';
    for (const e of eventi) {
      const gg = giornoDi(e.quando);
      if (gg !== giornoCorrente) { giornoCorrente = gg; lista.append(h('li', {}, h('div', { class: 'giorno' }, gg))); }
      lista.append(h('li', {}, h('span', { class: 'ora' }, ora(e.quando)), h('span', { class: `punto ${TIPI[e.tipo] ?? ''}`, title: e.tipo }), h('span', {}, e.testo)));
    }
    metti(svuota(box), scheda('Timeline (§13)', eventi.length ? lista : h('p', {}, 'Nessun evento.'), { nota: 'accessi, partite, monete, acquisti, errori e azioni degli amministratori' }));
  }).catch((e) => metti(svuota(box), erroreBox(e)));
  return box;
}
