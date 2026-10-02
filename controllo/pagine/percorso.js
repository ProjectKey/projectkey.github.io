/**
 * IL PERCORSO DEL GIOCATORE (F-128)
 * =================================
 *
 * Per giorno di nascita dell'installazione: quante aprono, iniziano una
 * partita, ne finiscono una, ne finiscono due, tornano il giorno dopo e dopo
 * sette giorni — e quanti secondi passano dalla prima apertura alla prima
 * carta. È la pagina con cui si giudica ogni cambio del piano di crescita
 * (docs/crescita/PIANO.md): un passo che perde gente è il prossimo da curare.
 *
 * Le coorti nate prima del 2 ottobre 2026 non hanno gli eventi nuovi: lo dice
 * la nota, e i loro «iniziano» a zero non sono un crollo.
 */
import * as api from '../api.js';
import { h, scheda, tabella, kpi, num, perc, giorniFa, memoria, erroreBox, nonDisponibile, grafico } from '../ui.js';

const quota = (n, su) => (su ? n / su : null);

export async function disegna(ctx) {
  ctx.ricordaRecente('Percorso');
  const salvati = memoria.leggi('percorso.filtri', null);
  const f = salvati?.giorno === giorniFa(0) ? salvati : { da: giorniFa(29), a: giorniFa(0) };
  const apps = ctx.app ? [ctx.app] : ctx.apps;
  const con = apps.filter((a) => api.sa(a, 'percorso'));
  const risposte = await Promise.all(con.map(async (a) => ({
    app: a, r: await api.percorso(a.id, f.da, f.a).catch((e) => ({ errore: e })),
  })));

  const da = h('input', { type: 'date', value: f.da, 'aria-label': 'Dal' });
  const a = h('input', { type: 'date', value: f.a, 'aria-label': 'Al' });

  return [
    ...apps.filter((x) => !api.sa(x, 'percorso')).map((x) => (x.erroreAdattatore
      ? erroreBox(new Error(`${x.nome} non risponde: ${x.erroreAdattatore}. Ricarica la pagina fra poco.`))
      : nonDisponibile(`Percorso di ${x.nome}`, 'l\'adattatore non espone `percorso`.'))),
    ...risposte.filter((x) => x.r?.errore).map((x) => erroreBox(new Error(`${x.app.nome}: ${x.r.errore.message}`))),
    scheda(null, h('form', {
      class: 'filtri',
      onsubmit: (e) => {
        e.preventDefault();
        memoria.scrivi('percorso.filtri', { da: da.value, a: a.value, giorno: giorniFa(0) });
        ctx.vai(`#/percorso?${Date.now()}`);
      },
    }, h('label', { class: 'campo' }, h('span', {}, 'Nati dal'), da), h('label', { class: 'campo' }, h('span', {}, 'al'), a),
    h('button', { class: 'bottone primario', type: 'submit' }, 'Applica'))),
    ...risposte.filter((x) => !x.r?.errore).flatMap(({ app, r }) => blocco(app, r, apps.length > 1)),
  ];
}

function blocco(app, r, conNome) {
  const t = r.totali ?? {};
  const giorni = r.giorni ?? [];
  const passi = [
    ['Aprono l\'app', t.nuove, t.nuove],
    ['Iniziano una partita', t.iniziano, t.nuove],
    ['Ne finiscono una', t.finiscono_una, t.nuove],
    ['Ne finiscono due', t.finiscono_due, t.nuove],
    ['Tornano il giorno dopo', t.d1, t.d1_possibili],
    ['Tornano dopo 7 giorni', t.d7, t.d7_possibili],
  ];
  const titolo = (s) => (conNome ? `${app.nome} · ${s}` : s);
  return [
    h('div', { class: 'griglia g3' },
      kpi('Installazioni nuove', num(t.nuove), 'nate nel periodo'),
      kpi('Finiscono la prima partita', perc(quota(t.finiscono_una, t.nuove)), `${num(t.finiscono_una)} su ${num(t.nuove)}`),
      kpi('Secondi alla prima carta', t.prima_carta_s === null || t.prima_carta_s === undefined ? '—' : num(t.prima_carta_s),
        `mediana, su ${num(t.con_prima_carta)} installazioni`)),
    scheda(titolo('Il percorso'), tabella([
      { titolo: 'Passo', cella: (p) => p[0] },
      { titolo: 'Installazioni', cella: (p) => num(p[1]) },
      { titolo: 'Su', cella: (p) => num(p[2]) },
      { titolo: 'Quota', cella: (p) => perc(quota(p[1], p[2])) },
    ], passi), { nota: 'D1 e D7 contano solo chi è nato abbastanza presto da poter essere tornato.' }),
    scheda(titolo('Per giorno di nascita'), grafico('bar', {
      etichette: giorni.map((g) => String(g.giorno).slice(5)),
      serie: [
        { nome: 'Nuove', valori: giorni.map((g) => g.nuove) },
        { nome: 'Iniziano', valori: giorni.map((g) => g.iniziano) },
        { nome: 'Finiscono una', valori: giorni.map((g) => g.finiscono_una) },
        { nome: 'Finiscono due', valori: giorni.map((g) => g.finiscono_due) },
      ],
    }, false)),
    scheda(titolo('Le coorti'), tabella([
      { titolo: 'Nati il', cella: (g) => g.giorno },
      { titolo: 'Nuove', cella: (g) => num(g.nuove) },
      { titolo: 'Iniziano', cella: (g) => num(g.iniziano) },
      { titolo: 'Una finita', cella: (g) => num(g.finiscono_una) },
      { titolo: 'Due finite', cella: (g) => num(g.finiscono_due) },
      { titolo: 'D1', cella: (g) => (g.d1_possibili === null ? '—' : perc(quota(g.d1, g.d1_possibili))) },
      { titolo: 'D7', cella: (g) => (g.d7_possibili === null ? '—' : perc(quota(g.d7, g.d7_possibili))) },
      { titolo: 'Prima carta (s)', cella: (g) => num(g.prima_carta_mediana_s) },
    ], [...giorni].reverse(), { vuoto: 'Nessuna installazione nuova nel periodo.' }), { nota: r.note?.coorti }),
  ];
}
