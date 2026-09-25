/**
 * CONFIGURAZIONE DELLA PAGINA
 * ===========================
 *
 * Qui ci sono solo cose **pubbliche**: l'indirizzo del progetto Supabase e la
 * sua chiave «publishable», le stesse che stanno dentro all'app sul telefono di
 * chiunque. Nessun segreto, nessuna chiave di servizio: senza un accesso da
 * amministratore con il secondo fattore (TOTP) la funzione `controllo` non
 * risponde a niente (docs/controllo/ARCHITETTURA.md).
 */
export const CONFIG = {
  url: 'https://agtvevphfaaycjbcfwfa.supabase.co',
  chiavePubblica: 'sb_publishable_ht_xB-CO7sAf9Jea0zFYfQ_Qu36mRLF',
  funzione: 'controllo',
  // Dopo quanti minuti senza toccare niente si esce da soli (§73).
  minutiInattivita: 30,
  // Fuso e valuta dei KPI: una definizione sola (ARCHITETTURA.md, decisioni).
  fuso: 'Europe/Rome',
  valuta: 'EUR',
};
