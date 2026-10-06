/**
 * MODERAZIONE (Control Center, blocco C2, §53 — 6 ottobre 2026)
 * ============================================================
 *
 * Le segnalazioni che i giocatori fanno su altri giocatori (offensivo,
 * imbroglio, nome, inattivo, altro), raccolte **per giocatore segnalato**:
 * quante, da quante persone diverse, per cosa. Uno segnalato da cinque persone
 * diverse è un'altra cosa da uno segnalato cinque volte dalla stessa.
 *
 * Si decide su tutte le sue segnalazioni aperte insieme:
 *   archivia · avviso (un messaggio nella sua posta) · silenzio al tavolo (le
 *   sue frasi non arrivano agli altri: lo controlla l'arbitro) · nome di serie ·
 *   blocco a tempo o per sempre (per sempre è critico: codice e dieci minuti).
 * Ogni decisione chiede un motivo e resta nel registro.
 */
import * as api from '../api.js';
import { h, scheda, tabella, pill, kpi, num, data, fa, memoria, erroreBox, nonDisponibile, avvisa, confermaConMotivo } from '../ui.js';

const MOTIVI = { offensivo: 'offensivo', imbroglio: 'imbroglio', nome: 'nome', inattivo: 'inattivo', altro: 'altro' };

export async function disegna(ctx) {
  ctx.ricordaRecente('Moderazione');
  const app = ctx.app ?? ctx.apps.find((a) => api.sa(a, 'moderazione.coda'));
  if (!app || !api.sa(app, 'moderazione.coda')) return [nonDisponibile('Moderazione', 'nessun gioco espone ancora le segnalazioni fra giocatori (`moderazione.coda`).')];
  const tutte = memoria.leggi('moderazione.tutte', false);
  let giocatori;
  try { giocatori = await api.moderazioneCoda(app.id, tutte); } catch (e) { return [erroreBox(e)]; }
  const aperti = giocatori.filter((g) => g.aperte > 0);
  const ricarica = () => ctx.vai(`#/moderazione?${Date.now()}`);
  const scrive = api.sa(app, 'moderazione.decidi');

  const decidi = async (g, esito, prima) => {
    const testi = {
      archiviata: ['Archivia', 'Le sue segnalazioni si chiudono senza conseguenze.'],
      avviso: ['Manda un avviso', 'Arriva nella sua posta del gioco.'],
      silenzio: ['Silenzia al tavolo', 'Le sue frasi al tavolo non arrivano più agli altri. Lui non se ne accorge.'],
      nome: ['Nome di serie', 'Il nome torna «Giocatore 1234».'],
      blocco: ['Blocca', 'Non entra in coda e sparisce dalle classifiche finché dura. Per sempre è critico: codice e dieci minuti.'],
    };
    const campi = esito === 'silenzio' ? [{ nome: 'ore', etichetta: 'Per quanto', tipo: 'select', opzioni: [
      { valore: '24', testo: '1 giorno' }, { valore: '168', testo: '7 giorni' }, { valore: '720', testo: '30 giorni' }, { valore: '2160', testo: '90 giorni' }] }]
      : esito === 'blocco' ? [{ nome: 'giorni', etichetta: 'Per quanto', tipo: 'select', opzioni: [
        { valore: '1', testo: '1 giorno' }, { valore: '7', testo: '7 giorni' }, { valore: '30', testo: '30 giorni' }, { valore: '0', testo: 'Per sempre (chiede approvazione)' }] }]
        : esito === 'avviso' ? [{ nome: 'testo', etichetta: 'Testo dell\'avviso', valore: 'Ci sono arrivate segnalazioni sul tuo comportamento al tavolo. Gioca con rispetto, grazie.' }] : [];
    const r = await confermaConMotivo({ titolo: `${testi[esito][0]}: ${g.nome}`, testo: testi[esito][1], tasto: testi[esito][0], pericolo: esito === 'blocco', campi });
    if (!r) return;
    try {
      if (esito === 'avviso') {
        await api.postaManda(app.id, { titolo: 'Un avviso dal Settebello', testo: r.testo || testi.avviso[1], monete: 0, gemme: 0, giorni: 30, perTutti: false, destinatari: [g.id], motivo: r.motivo });
      } else if (esito === 'nome') {
        await api.resetNome(app.id, g.id, null, r.motivo);
      } else if (esito === 'blocco') {
        const fino = r.giorni === '0' ? null : new Date(Date.now() + Number(r.giorni) * 86400000).toISOString();
        const b = await api.blocca(app.id, g.id, fino, r.motivo);
        if (b?.inApprovazione) avvisa('Il blocco per sempre è in approvazione: parte fra 10 minuti se non lo annulli');
      }
      await api.moderazioneDecidi(app.id, { id: g.id, esito, ore: r.ore ? Number(r.ore) : undefined, motivo: r.motivo });
      avvisa('Fatto');
      ricarica();
    } catch (e) { avvisa(e.message, true); }
  };

  const solo = h('input', { type: 'checkbox', checked: tutte, onchange: (e) => { memoria.scrivi('moderazione.tutte', e.target.checked); ricarica(); } });
  return [
    h('div', { class: 'griglia g4' },
      kpi('Giocatori da guardare', num(aperti.length), 'con segnalazioni aperte'),
      kpi('Segnalazioni aperte', num(aperti.reduce((s, g) => s + g.aperte, 0))),
      kpi('Segnalati da più persone', num(aperti.filter((g) => g.da_quanti >= 2).length), 'i primi da guardare'),
      kpi('Silenziati adesso', num(giocatori.filter((g) => g.muto_fino && Date.parse(g.muto_fino) > Date.now()).length))),
    scheda(null, h('label', { class: 'campo', style: { flexDirection: 'row', gap: '6px', alignItems: 'center' } }, solo, h('span', {}, 'Mostra anche quelli già decisi'))),
    ...(giocatori.length ? giocatori.map((g) => scheda(null, h('div', {},
      h('div', { style: { display: 'flex', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap', alignItems: 'baseline' } },
        h('div', {},
          h('a', { href: `#/giocatori/${app.id}/${g.id}`, style: { fontSize: '1.15em', fontWeight: 700 } }, g.nome ?? g.id.slice(0, 8)),
          ` · livello ${num(g.livello)} · `, h('strong', {}, `${num(g.quante)} segnalazioni da ${num(g.da_quanti)} ${g.da_quanti === 1 ? 'persona' : 'persone'}`),
          ' ', ...Object.entries(g.motivi ?? {}).map(([m, n]) => pill(`${MOTIVI[m] ?? m} ${n}`, m === 'offensivo' || m === 'imbroglio' ? 'rosso' : '')),
          g.aperte ? null : pill('deciso', 'verde'),
          g.muto_fino && Date.parse(g.muto_fino) > Date.now() ? pill(`silenziato fino al ${data(g.muto_fino)}`, 'ambra') : null,
          g.bandito_fino && Date.parse(g.bandito_fino) > Date.now() ? pill(`bloccato fino al ${data(g.bandito_fino)}`, 'rosso') : null),
        h('span', { style: { color: 'var(--ink3)' } }, `ultima ${fa(g.ultima)} · ha segnalato ${num(g.ha_segnalato)} volte · decisioni prima: ${num(g.decise_prima)}`)),
      tabella([
        { titolo: 'Quando', cella: (s) => data(s.quando) },
        { titolo: 'Da', cella: (s) => s.chi ?? '—' },
        { titolo: 'Per', cella: (s) => pill(MOTIVI[s.motivo] ?? s.motivo, s.motivo === 'offensivo' || s.motivo === 'imbroglio' ? 'rosso' : '') },
        { titolo: 'Nota', cella: (s) => s.nota ?? '—' },
        { titolo: 'Partita', cella: (s) => (s.partita ? h('a', { class: 'mono', href: `#/partite/${app.id}/${s.partita}` }, String(s.partita).slice(0, 8)) : '—') },
        { titolo: 'Esito', cella: (s) => (s.stato === 'chiusa' ? `${s.esito ?? 'chiusa'}${s.deciso_da ? ` · ${s.deciso_da}` : ''}` : pill('aperta', 'ambra')) },
      ], g.segnalazioni ?? []),
      scrive && g.aperte ? h('div', { style: { display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '8px' } },
        h('button', { class: 'bottone', onclick: () => decidi(g, 'archiviata') }, 'Archivia'),
        h('button', { class: 'bottone', onclick: () => decidi(g, 'avviso') }, 'Avviso'),
        h('button', { class: 'bottone', onclick: () => decidi(g, 'silenzio') }, 'Silenzia al tavolo'),
        h('button', { class: 'bottone', onclick: () => decidi(g, 'nome') }, 'Nome di serie'),
        h('button', { class: 'bottone pericolo', onclick: () => decidi(g, 'blocco') }, 'Blocca')) : null)))
      : [scheda(null, h('p', {}, tutte ? 'Nessuna segnalazione fra giocatori, mai.' : 'Nessuna segnalazione aperta. Bene così.'))]),
  ];
}
