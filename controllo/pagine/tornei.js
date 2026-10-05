/**
 * TORNEI (Control Center fase 2, blocco B5, §25–26)
 * =================================================
 *
 * Il torneo della settimana segue il calendario (Halloween, Natale…: `TEMI` in
 * `gara.ts`). Dal pannello si **sovrascrive una settimana precisa**: nome, riga,
 * gioco, pezzo in palio e un moltiplicatore dei premi fino a x2 (decisione di
 * Giorgio, 5 ott 2026). La settimana in corso non si tocca: i suoi tabelloni
 * sono già nati e pagano come sono nati.
 *
 * Si salva proponendo la configurazione (`torneiSettimana`): verifica,
 * approvazione critica come ogni cosa che tocca l'economia.
 */
import * as api from '../api.js';
import { h, scheda, tabella, pill, finestra, confermaConMotivo, avvisa, erroreBox, nonDisponibile } from '../ui.js';

export async function disegna(ctx) {
  ctx.ricordaRecente('Tornei');
  const app = ctx.app ?? ctx.apps.find((a) => api.sa(a, 'tornei.leggi'));
  if (!app || !api.sa(app, 'tornei.leggi')) return [nonDisponibile('Tornei', 'nessun gioco espone ancora il calendario dei tornei (`tornei.leggi`).')];
  let t; let attuale;
  try { [t, attuale] = await Promise.all([api.torneiLeggi(app.id), api.configLeggi(app.id)]); } catch (e) { return [erroreBox(e)]; }
  const nomeGioco = (id) => t.giochi.find((g) => g.id === id)?.nome ?? id;
  const nomePezzo = (id) => t.trofei.find((p) => p.id === id)?.nome ?? id;

  const salva = async (settimana, nuova) => {
    const tutte = { ...(t.tutte ?? {}) };
    if (nuova) tutte[settimana] = nuova; else delete tutte[settimana];
    // Le settimane passate non servono più: si tolgono, così l'elenco resta corto.
    const primaValida = t.settimane[0].settimana;
    for (const k of Object.keys(tutte)) if (k < primaValida) delete tutte[k];
    const r = await confermaConMotivo({
      titolo: `Torneo della settimana ${settimana}`, tasto: 'Proponi',
      testo: nuova ? 'Cambia il torneo di quella settimana. Tocca l\'economia: passa dall\'approvazione (codice e dieci minuti).' : 'Torna al calendario per quella settimana.',
    });
    if (!r) return;
    try {
      const res = await api.configProponi(app.id, {
        valori: { ...(attuale.valori ?? {}), torneiSettimana: tutte }, portata: { livello: 'app', valore: null }, motivo: r.motivo,
      });
      avvisa(res?.approvazione ? `In approvazione: ${res.approvazione.stato}` : 'Proposta inviata');
      ctx.vai(`#/tornei?${Date.now()}`);
    } catch (x) { avvisa(x.message, true); }
  };

  const modifica = async (s) => {
    const o = s.sovrascritta ?? {};
    const nome = h('input', { type: 'text', maxlength: 30, value: o.nome ?? '', placeholder: s.calendario.nome });
    const riga = h('input', { type: 'text', maxlength: 60, value: o.riga ?? '', placeholder: s.calendario.riga });
    const gioco = h('select', {}, h('option', { value: '' }, `come il calendario (${nomeGioco(s.calendario.gioco)})`),
      t.giochi.map((g) => h('option', { value: g.id, selected: o.gioco === g.id }, g.nome)));
    const premio = h('select', {}, h('option', { value: '' }, `come il calendario (${nomePezzo(s.calendario.premio)})`),
      t.trofei.map((p) => h('option', { value: p.id, selected: o.premio === p.id }, `${p.nome} (${p.genere})`)));
    const x = h('select', {}, [1, 1.5, 2].map((v) => h('option', { value: String(v), selected: (o.premiX ?? 1) === v }, `premi x${String(v).replace('.', ',')}`)));
    const ok = await finestra({
      titolo: `Settimana ${s.settimana} (dal ${s.dal})`,
      corpo: [
        h('label', { class: 'campo' }, h('span', {}, 'Nome'), nome), h('label', { class: 'campo' }, h('span', {}, 'Riga'), riga),
        h('label', { class: 'campo' }, h('span', {}, 'Gioco'), gioco), h('label', { class: 'campo' }, h('span', {}, 'Pezzo in palio'), premio),
        h('label', { class: 'campo' }, h('span', {}, 'Premi'), x),
      ],
      tasti: [{ testo: 'Annulla', risposta: null }, { testo: 'Torna al calendario', risposta: 'via' }, { testo: 'Avanti', classe: 'primario', risposta: 'si' }],
    });
    if (!ok) return;
    if (ok === 'via') { await salva(s.settimana, null); return; }
    const nuova = {
      ...(nome.value.trim() ? { nome: nome.value.trim() } : {}), ...(riga.value.trim() ? { riga: riga.value.trim() } : {}),
      ...(gioco.value ? { gioco: gioco.value } : {}), ...(premio.value ? { premio: premio.value } : {}),
      ...(Number(x.value) > 1 ? { premiX: Number(x.value) } : {}),
    };
    await salva(s.settimana, Object.keys(nuova).length ? nuova : null);
  };

  return [
    scheda(`Le prossime settimane · ${app.nome}`, tabella([
      { titolo: 'Settimana', cella: (s) => `${s.settimana} · dal ${s.dal}` },
      { titolo: 'Torneo', cella: (s) => s.sovrascritta?.nome ?? s.calendario.nome },
      { titolo: 'Gioco', cella: (s) => nomeGioco(s.sovrascritta?.gioco ?? s.calendario.gioco) },
      { titolo: 'Pezzo', cella: (s) => nomePezzo(s.sovrascritta?.premio ?? s.calendario.premio) },
      { titolo: 'Premi', cella: (s) => `x${String(s.sovrascritta?.premiX ?? 1).replace('.', ',')}` },
      { titolo: '', cella: (s) => (s.sovrascritta ? pill('cambiata', 'blu') : pill('calendario', '')) },
      { titolo: '', cella: (s) => (s.inCorso ? pill('in corso', 'verde') : h('button', { class: 'bottone', type: 'button', onclick: () => void modifica(s) }, 'Cambia')) },
    ], t.settimane), { nota: 'La settimana in corso non si cambia: i suoi tabelloni sono già nati.' }),
    scheda('I premi di base', tabella([
      { titolo: 'Livello', cella: (l) => l.nome },
      { titolo: 'Iscrizione', cella: (l) => l.iscrizione.toLocaleString('it-IT') },
      { titolo: 'Premi per turno', cella: (l) => l.premi.map((p) => p.toLocaleString('it-IT')).join(' · ') },
      { titolo: 'Gemme della coppa', cella: (l) => String(l.gemme) },
    ], t.livelli), { nota: 'Il moltiplicatore di una settimana li moltiplica tutti (monete e gemme).' }),
  ];
}
