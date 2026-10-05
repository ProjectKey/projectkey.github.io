/**
 * MISSIONI (Control Center fase 2, blocco B4, §21)
 * ================================================
 *
 * Le missioni del giorno e della settimana, scritte dal pannello senza una
 * versione nuova dell'app. Si possono fare missioni delle **famiglie** che il
 * gioco sa già contare (gioca, vinci, scope, settebello, avversari duri, online,
 * le miste) o «vinci a quel gioco»; un tipo nuovo vuole codice.
 *
 * Si salvano proponendo la configurazione (`missioni`): passano dalla verifica
 * (elenco valido, tetti), dal **rubinetto** (premi più alti = più monete
 * regalate) e dall'approvazione critica, come tutto quello che tocca
 * l'economia. Valgono dal giorno (o dal lunedì) dopo: quelle già pescate stanno
 * nel salvataggio di chi gioca.
 */
import * as api from '../api.js';
import { h, scheda, tabella, pill, finestra, confermaConMotivo, avvisa, erroreBox, nonDisponibile } from '../ui.js';

/** Come il gioco conta ogni famiglia (`avanzamento` in `esito.ts`), detto per esteso. */
const NOMI = {
  play: 'gioca N partite', win: 'vinci N partite', scopa: 'fai N scope', sette: 'prendi il settebello N volte',
  hard: 'batti N Esperti o Maestri', online: 'vinci N partite online', winsette: 'vinci prendendo il settebello',
  winscopa: 'vinci con almeno N scope',
};
const nome = (f) => NOMI[f] ?? f;

export async function disegna(ctx) {
  ctx.ricordaRecente('Missioni');
  const app = ctx.app ?? ctx.apps.find((a) => api.sa(a, 'missioni.leggi'));
  if (!app || !api.sa(app, 'missioni.leggi')) return [nonDisponibile('Missioni', 'nessun gioco espone ancora le missioni (`missioni.leggi`).')];
  let m; let attuale;
  try { [m, attuale] = await Promise.all([api.missioniLeggi(app.id), api.configLeggi(app.id)]); } catch (e) { return [erroreBox(e)]; }

  const giorno = m.giorno.map((x) => ({ ...x }));
  const settimana = m.settimana.map((x) => ({ ...x }));
  const err = h('div', { class: 'errore-testo', role: 'alert' });

  const proponi = async (valoriMissioni, cosa) => {
    err.textContent = '';
    const r = await confermaConMotivo({
      titolo: 'Proponi le missioni', tasto: 'Proponi',
      testo: `${cosa} Tocca l'economia: passa dalla verifica e dal rubinetto, e parte dopo l'approvazione (codice e dieci minuti). Vale dal giorno dopo.`,
    });
    if (!r) return;
    const valori = { ...(attuale.valori ?? {}) };
    if (valoriMissioni) valori.missioni = valoriMissioni; else delete valori.missioni;
    const invia = (forza) => api.configProponi(app.id, { valori, portata: { livello: 'app', valore: null }, motivo: r.motivo, forza });
    try {
      let res;
      try { res = await invia(false); } catch (x) {
        if (x.codice !== 'rubinetto') throw x;
        const rb = x.dati?.rubinetto ?? {};
        const ok = await finestra({
          titolo: 'Il rubinetto non regge',
          corpo: [h('p', {}, `Con queste missioni, al locale peggiore (${rb.tavolo ?? '?'}) si regalano ${rb.monete ?? '?'} monete al giorno contro un tetto di ${rb.tetto ?? '?'} (${Math.round((rb.quota ?? 0) * 100)}%). Abbassa i premi, o forza: passa dall'approvazione critica.`)],
          tasti: [{ testo: 'Torna a correggere', risposta: false }, { testo: 'Forza (va in approvazione)', classe: 'pericolo', risposta: true }],
        });
        if (!ok) return;
        res = await invia(true);
      }
      avvisa(res?.approvazione ? `Missioni in approvazione: ${res.approvazione.stato}` : 'Missioni proposte');
      ctx.vai(`#/missioni?${Date.now()}`);
    } catch (x) { err.textContent = x.message; }
  };

  return [
    h('div', { class: 'avviso' }, h('span', { class: 'ico' }, 'ⓘ'),
      h('div', {}, `Si scrivono missioni dei tipi che il gioco sa contare — ${m.famiglie.map(nome).join(' · ')} — oppure «vinci a un gioco». Nel testo, {n} diventa l'obiettivo.`)),
    editor('Missioni del giorno', giorno, m, { premio: true, dalPannello: m.dalPannello.giorno, minimo: m.tetti.minimoGiorno }),
    editor('Missioni della settimana', settimana, m, { premio: false, dalPannello: m.dalPannello.settimana, minimo: m.tetti.minimoSettimana }),
    scheda(null, h('div', { style: { display: 'flex', gap: '10px', flexWrap: 'wrap' } },
      h('button', { class: 'bottone primario', onclick: () => void proponi({ giorno, settimana }, `${giorno.length} missioni del giorno e ${settimana.length} della settimana.`) }, 'Proponi le missioni'),
      h('button', { class: 'bottone', onclick: () => void proponi(null, 'Si torna alle missioni di casa (quelle scritte nell\'app).') }, 'Torna a quelle di casa'),
      err)),
  ];
}

function editor(titolo, righe, m, { premio, dalPannello, minimo }) {
  const corpo = h('div');
  const numero = (r, k, max) => h('input', {
    type: 'number', min: k === 'goal' ? 1 : 0, max, value: r[k], style: { width: '80px' },
    oninput: (e) => { r[k] = Math.round(Number(e.target.value) || 0); },
  });
  const disegna = () => {
    corpo.replaceChildren(tabella([
      { titolo: 'Id', cella: (r) => r.id },
      { titolo: 'Testo', cella: (r) => h('input', { type: 'text', value: r.testo, maxlength: 60, oninput: (e) => { r.testo = e.target.value; } }) },
      { titolo: 'Obiettivo', cella: (r) => numero(r, 'goal', m.tetti.goal) },
      ...(premio ? [{ titolo: 'Monete', cella: (r) => numero(r, 'monete', m.tetti.moneteGiorno) }] : []),
      { titolo: 'Pass XP', cella: (r) => numero(r, 'passXp', m.tetti.passXp) },
      { titolo: 'Gioco', cella: (r) => (r.giochi ?? []).join(', ') || '—' },
      { titolo: '', cella: (r) => h('button', { class: 'bottone', type: 'button', onclick: () => { righe.splice(righe.indexOf(r), 1); disegna(); } }, 'Togli') },
    ], righe), aggiungi());
  };
  const aggiungi = () => {
    const fam = h('select', { 'aria-label': 'Famiglia' },
      m.famiglie.map((f) => h('option', { value: f }, nome(f))),
      m.giochi.map((g) => h('option', { value: `gioco:${g.id}` }, `vinci a ${g.nome}`)));
    return h('div', { class: 'filtri', style: { marginTop: '8px' } }, fam, h('button', {
      class: 'bottone', type: 'button',
      onclick: () => {
        const v = fam.value;
        const gioco = v.startsWith('gioco:') ? v.slice(6) : null;
        const radice = gioco ? `${gioco.replace(/[^a-z]/g, '').slice(0, 8)}v` : v;
        let n = 2; while (righe.some((r) => r.id === `${radice}${n}`)) n++;
        righe.push({ id: `${radice}${n}`, testo: gioco ? `Vinci a ${m.giochi.find((g) => g.id === gioco)?.nome}` : 'Nuova missione {n}', goal: 1, monete: 0, passXp: 30, ...(gioco ? { giochi: [gioco] } : {}) });
        disegna();
      },
    }, 'Aggiungi'));
  };
  disegna();
  return scheda(titolo, corpo, { nota: `${dalPannello ? 'Dal pannello' : 'Quelle di casa'} · ne servono almeno ${minimo}${premio ? ', di tre famiglie diverse' : ''}.`, azioni: [pill(dalPannello ? 'pannello' : 'di casa', dalPannello ? 'blu' : '')] });
}
