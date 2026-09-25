/**
 * ADMIN E SICUREZZA (§73, §74, §75)
 * =================================
 *
 * Chi entra, con che ruolo, con quali permessi; e il registro di tutto quello
 * che gli amministratori hanno fatto. Il registro si legge e si filtra, ma da
 * qui non si modifica né si cancella: lo impedisce il server, non la pagina.
 */
import * as api from '../api.js';
import { h, svuota, metti, scheda, tabella, pill, data, fa, memoria, caricamento, erroreBox } from '../ui.js';

export async function disegna(ctx) {
  ctx.ricordaRecente('Admin e sicurezza');
  const [admin, ruoli] = await Promise.all([api.amministratori().catch((e) => ({ errore: e })), api.ruoli().catch((e) => ({ errore: e }))]);
  const tuttiPermessi = Array.isArray(ruoli) ? [...new Set(ruoli.flatMap((r) => r.permessi ?? []))].sort() : [];

  const f = memoria.leggi('registro.filtri', { chi: '', azione: '', app: '', da: '' });
  const chi = h('input', { type: 'search', value: f.chi, placeholder: 'email', 'aria-label': 'Amministratore' });
  const azione = h('input', { type: 'search', value: f.azione, placeholder: 'es. giocatori.accredita', 'aria-label': 'Azione' });
  const app = h('select', { 'aria-label': 'App' }, h('option', { value: '' }, 'Tutte'), ctx.apps.map((a) => h('option', { value: a.id }, a.nome)));
  app.value = f.app;
  const da = h('input', { type: 'date', value: f.da, 'aria-label': 'Dal' });
  const esiti = h('div', {});
  const carica = async () => {
    const filtri = { chi: chi.value.trim(), azione: azione.value.trim(), app: app.value, da: da.value };
    memoria.scrivi('registro.filtri', filtri);
    metti(svuota(esiti), caricamento());
    try {
      const voci = await api.registro(Object.fromEntries(Object.entries(filtri).filter(([, v]) => v)));
      metti(svuota(esiti), tabella([
        { titolo: 'Quando', cella: (v) => data(v.quando) },
        { titolo: 'Chi', cella: (v) => v.admin ?? '—' },
        { titolo: 'Azione', cella: (v) => h('span', { class: 'mono' }, v.azione) },
        { titolo: 'App', cella: (v) => ctx.apps.find((a) => a.id === v.app)?.nome ?? v.app ?? '—' },
        { titolo: 'Su cosa', cella: (v) => v.bersaglio ? h('span', { class: 'mono', style: { overflowWrap: 'anywhere' } }, v.bersaglio) : '—' },
        { titolo: 'Prima → dopo', cella: (v) => v.prima || v.dopo ? h('span', { class: 'mono', style: { overflowWrap: 'anywhere' } }, `${JSON.stringify(v.prima ?? null)} → ${JSON.stringify(v.dopo ?? null)}`) : '—' },
        { titolo: 'Motivo', cella: (v) => v.motivo ?? '—' },
        { titolo: 'IP', cella: (v) => h('span', { class: 'mono' }, v.ip ?? '—') },
      ], voci, { vuoto: 'Nessuna voce con questi filtri.' }));
    } catch (e) { metti(svuota(esiti), erroreBox(e)); }
  };
  void carica();

  return [
    h('div', { class: 'griglia g2' },
      scheda('Amministratori', admin.errore ? erroreBox(admin.errore) : tabella([
        { titolo: 'Email', chiave: 'email' },
        { titolo: 'Ruolo', cella: (a) => pill(a.ruolo, a.ruolo === 'Super Admin' ? 'viola' : '') },
        { titolo: 'Secondo fattore', cella: (a) => a.mfa === undefined ? pill('obbligatorio', 'viola') : a.mfa ? pill('attivo', 'verde') : pill('mancante', 'rosso') },
        { titolo: 'Stato', cella: (a) => a.attivo ? pill('attivo', 'verde') : pill('sospeso', 'ambra') },
        { titolo: 'Ultimo accesso', cella: (a) => fa(a.ultimo) },
      ], admin), { nota: 'si aggiungono dal server (ARCHITETTURA.md)' }),
      scheda('Come si entra (§73)', h('ul', { style: { margin: 0, paddingLeft: '18px', color: 'var(--ink2)' } },
        h('li', {}, 'Email e password, poi il codice a sei cifre dell\'app di autenticazione: senza il secondo fattore il server non risponde.'),
        h('li', {}, 'Dopo 30 minuti senza toccare niente si esce da soli.'),
        h('li', {}, 'La pagina non contiene chiavi: i segreti dei giochi stanno nel Vault del server e non si mostrano mai.'),
        h('li', {}, 'Le operazioni critiche chiedono di nuovo il codice e partono dopo 10 minuti (un solo Super Admin).')))),
    scheda('Ruoli e permessi (§74)', ruoli.errore ? erroreBox(ruoli.errore) : tabella([
      { titolo: 'Ruolo', cella: (r) => h('strong', {}, r.nome) },
      ...tuttiPermessi.filter((p) => p !== '*').slice(0, 12).map((p) => ({
        titolo: p, cella: (r) => (r.permessi ?? []).includes('*') || (r.permessi ?? []).includes(p) ? pill('✓', 'verde') : '',
      })),
      { titolo: 'Tutto', cella: (r) => (r.permessi ?? []).includes('*') ? pill('✓', 'viola') : '' },
    ], ruoli)),
    scheda('Registro (§75)', [
      h('form', { class: 'filtri', style: { marginBottom: '10px' }, onsubmit: (e) => { e.preventDefault(); void carica(); } },
        h('label', { class: 'campo' }, h('span', {}, 'Chi'), chi), h('label', { class: 'campo' }, h('span', {}, 'Azione'), azione),
        h('label', { class: 'campo' }, h('span', {}, 'App'), app), h('label', { class: 'campo' }, h('span', {}, 'Dal'), da),
        h('button', { class: 'bottone primario', type: 'submit' }, 'Filtra')),
      esiti,
    ], { nota: 'non modificabile: nessun amministratore lo può cambiare o cancellare' }),
  ];
}
