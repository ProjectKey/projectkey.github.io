/**
 * LE SEZIONI CHE NON CI SONO ANCORA
 * =================================
 *
 * Sono nel menu perché il pannello nasce con la sua forma intera (§94), ma
 * mostrano **cosa faranno e cosa serve per accenderle**, non dati inventati:
 * è la regola del progetto, *quello che non c'è non si millanta*. Quando una
 * sezione diventa vera, esce da qui e prende la sua pagina.
 */
import { h, scheda } from '../ui.js';

const SEZIONI = {
  assistenza: {
    cosa: 'Ticket collegati alla scheda del giocatore, con gli ultimi match, acquisti, errori, dispositivo e versione (§69).',
    serve: ['Le mail di «Scrivici» arrivano già con ID, versione e partita: il primo passo è leggere la casella supporto dal pannello o collegare uno strumento di ticket.',
      'Nel frattempo: incolla l\'ID che trovi nella mail nella ricerca in alto (tasto /) e arrivi alla scheda.'],
    link: ['#/giocatori', 'Vai ai giocatori'],
  },
  moderazione: {
    cosa: 'Segnalazioni per nickname, cheating, abuso, spam, molestie; azioni warning, mute, reset nome, ban temporaneo o permanente, sempre nel registro (§53).',
    serve: ['Le segnalazioni esistono già nel database di Settebello: serve l\'azione `segnalazioni` nell\'adattatore.',
      'Reset nome e blocco si fanno già dalla scheda del giocatore.'],
    link: ['#/giocatori', 'Reset nome e blocco'],
  },
  frodi: {
    cosa: 'Risk score per giocatore con motivazioni: valute impossibili, video farming, frodi e rimborsi sospetti, multi-account, risultati impossibili (§54).',
    serve: ['Regole di rischio calcolate sul server a partire dal registro della cassa e dai rimborsi.', 'Priorità P1.'],
  },
  giochi: {
    cosa: 'Modulo per gioco: modalità, regole, turn timer, varianti, mazzi, ranked/unranked, matchmaking e bot per Settebello (§27, §30, §31); mappe, velocità, power-up, spawn per Last Sheep (§28).',
    serve: ['Oggi molte regole sono scritte nel codice dell\'app (§99): vanno spostate nella configurazione una alla volta, come è stato fatto per la cassa.',
      'I parametri già spostati si cambiano da Configurazione.'],
    link: ['#/configurazione', 'Configurazione'],
  },
  liveops: {
    cosa: 'Calendario Live Ops con eventi, tornei, missioni, promo, push e weekend bonus, programmabili settimane prima (§23, §24, §84).',
    serve: ['Un motore eventi sul server che l\'app sappia leggere (oggi la «variante del giorno» e l\'appuntamento del torneo sono regole fisse).', 'Priorità P1.'],
  },
  tornei: {
    cosa: 'Creazione tornei da pannello: modalità, date, posti, ingresso, premi, struttura e tie-break (§25), classifiche configurabili (§26).',
    serve: ['I tornei di Settebello stanno già sul server (tabellone): serve renderne configurabili orari e premi.', 'Priorità P1.'],
  },
  economia: {
    cosa: 'Valute, bauli e probabilità, reward engine, daily reward, dashboard dell\'economia con valuta generata e spesa e inflazione (§15-§20).',
    serve: ['Il registro dei movimenti esiste (la cassa): la dashboard si costruisce su quello.',
      'Probabilità dei bauli e premi da pannello: oggi stanno nel codice condiviso fra app e cassa, da spostare in configurazione.'],
    link: ['#/configurazione', 'I numeri già configurabili'],
  },
  negozio: {
    cosa: 'Prodotti, prezzi, contenuti, paesi, segmenti e limiti; offerte con trigger come «prima sconfitta» o «ritorno dopo 7 giorni» (§33, §34).',
    serve: ['I prodotti di Google Play si creano già dall\'API (script prodotti-play.ts): va portato qui.', 'Le offerte richiedono i segmenti (§39).'],
  },
  crm: {
    cosa: 'Push, messaggi in-app, inbox con premi allegati, banner e popup per segmento, lingua, paese e orario (§40-§42).',
    serve: ['Le notifiche push remote richiedono Firebase Cloud Messaging nell\'app: una build nativa nuova.', 'L\'inbox richiede una tabella messaggi e la schermata nell\'app.'],
  },
  crescita: {
    cosa: 'Cross-promotion fra i giochi, referral, deep link, attribuzione delle campagne (Meta, Google Ads, TikTok…) con CPI, ROAS e LTV (§43, §44, §50, §51).',
    serve: ['Uno strumento di attribuzione (AppsFlyer, Adjust o simili) e i costi delle campagne.', 'Il referral c\'è già in Settebello (codici invito): da esporre nell\'adattatore.'],
  },
  esperimenti: {
    cosa: 'A/B test: controllo e varianti, popolazione, date, KPI e risultati su retention, sessioni, IAP e churn (§45).',
    serve: ['L\'app deve ricevere la variante assegnata (la configurazione per segmento) e le misure devono riportarla.', 'Priorità P1.'],
  },
  analisi: {
    cosa: 'Dashboard configurabili, funnel, coorti, esploratore degli eventi con le loro proprietà (§46-§49), taxonomy comune fra i giochi (§92).',
    serve: ['Gli eventi esistono già (tabella eventi): i nomi vanno allineati alla taxonomy comune (match_started, purchase_completed…).',
      'Le coorti richiedono di legare gli eventi al giocatore, non solo all\'installazione.'],
    link: ['#/comando', 'I KPI di oggi'],
  },
  contenuti: {
    cosa: 'Testi, banner, popup, news, tutorial, FAQ e immagini senza release, in più lingue, con libreria media versionata (§66-§68).',
    serve: ['L\'app deve leggere i contenuti dal server invece di averli scritti dentro.', 'Priorità dopo i Live Ops.'],
  },
};

export function disegna(ctx, voce) {
  const s = SEZIONI[voce.k] ?? { cosa: 'Sezione prevista dal requisito.', serve: [] };
  ctx.ricordaRecente(voce.nome);
  return [
    h('div', { class: 'avviso' }, h('span', { class: 'ico' }, 'ⓘ'),
      h('div', {}, h('strong', {}, `Fase ${voce.fase ?? 2}. `), 'Questa sezione non è ancora collegata: qui sotto cosa farà e cosa serve per accenderla. Nessun dato di questa pagina è inventato.')),
    h('div', { class: 'griglia g2' },
      scheda('Cosa farà', h('p', { style: { margin: 0, color: 'var(--ink2)' } }, s.cosa)),
      scheda('Cosa serve per accenderla', h('div', { class: 'pezzo-fase' }, h('ul', { style: { margin: 0 } }, s.serve.map((x) => h('li', {}, x)))),
        { azioni: s.link ? h('a', { class: 'bottone piccolo', href: s.link[0] }, s.link[1]) : null })),
  ];
}
