/**
 * RILASCI (§63, §64, §65)
 * =======================
 *
 * Cosa c'è su ogni canale degli store, quanti telefoni hanno quale versione,
 * e gli aggiornamenti via etere (EAS Update) che arrivano senza passare dallo
 * store. Per la versione minima si va nella scheda dell'app.
 */
import * as api from '../api.js';
import { h, scheda, tabella, pill, num, data, fa, grafico, erroreBox, nonDisponibile } from '../ui.js';

export async function disegna(ctx) {
  ctx.ricordaRecente('Rilasci');
  const apps = (ctx.app ? [ctx.app] : ctx.apps);
  const conVersioni = apps.filter((a) => api.sa(a, 'versioni'));
  const risposte = await Promise.all(conVersioni.map(async (a) => ({ app: a, v: await api.versioni(a.id).catch((e) => ({ errore: e })) })));
  return [
    ...apps.filter((a) => !api.sa(a, 'versioni')).map((a) => nonDisponibile(`Rilasci di ${a.nome}`, 'l\'adattatore non espone `versioni`.')),
    ...risposte.map(({ app, v }) => v.errore ? erroreBox(v.errore) : h('div', { class: 'griglia g2' },
      scheda(`${app.nome} · canali degli store`, tabella([
        { titolo: 'Store', chiave: 'store' },
        { titolo: 'Canale', chiave: 'canale' },
        { titolo: 'Versione', cella: (r) => r.versione ?? '—' },
        { titolo: 'Build', num: true, cella: (r) => num(r.build) },
        { titolo: 'Pubblicata', cella: (r) => data(r.data, false) },
        { titolo: 'Stato', cella: (r) => pill(r.stato ?? '—', r.stato === 'completata' ? 'verde' : r.stato === 'non ancora' ? '' : 'ambra') },
        { titolo: 'Rollout', cella: (r) => r.percentuale ? `${Math.round(r.percentuale * 100)}%` : r.stato === 'completata' ? '100%' : '—' },
      ], v.store ?? [], { vuoto: 'Nessun canale letto.' }), { azioni: h('a', { class: 'bottone piccolo', href: `#/apps/${app.id}` }, 'Versione minima') }),
      scheda('Adozione delle versioni', (v.adozione ?? []).length ? grafico('bar', {
        etichette: v.adozione.map((x) => x.versione),
        serie: [{ nome: 'Installazioni attive', valori: v.adozione.map((x) => x.installazioni) }],
      }, false) : h('p', {}, 'Nessun dato di adozione.'), { nota: 'installazioni viste negli ultimi 30 giorni' }),
      scheda('Aggiornamenti via etere', tabella([
        { titolo: 'Ramo', cella: (o) => pill(o.ramo, o.ramo === 'produzione' ? 'verde' : 'cielo') },
        { titolo: 'Per la versione', chiave: 'runtime' },
        { titolo: 'ID', cella: (o) => h('span', { class: 'mono' }, o.id) },
        { titolo: 'Quando', cella: (o) => fa(o.data) },
      ], v.ota ?? [], { vuoto: 'Nessun aggiornamento via etere registrato.' }), { nota: 'arrivano da soli ai telefoni con quella versione' }),
      scheda('Errori per versione', h('p', { style: { margin: 0, color: 'var(--ink2)' } },
        'Il confronto degli errori fra release (§65) sta in ', h('a', { href: '#/tecnica' }, 'Tecnica'), ', colonna «Versioni». Il crash rate per versione arriva con uno strumento di crash reporting (fase 2).')))),
  ];
}
