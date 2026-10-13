/**
 * L'INTERRUTTORE DI GOOGLE PLAY DI BRISCOLA (13 ottobre 2026)
 * ===========================================================
 *
 * Briscola è in **test chiuso**: la sua pagina pubblica su Play risponde 404
 * finché l'app non va in produzione. Per questo il badge di Google Play, in
 * questa pagina e nelle guide, nasce nascosto (`hidden`) e al suo posto si
 * vede «Presto su Google Play».
 *
 * IL GIORNO DELLA PRODUZIONE si cambia **una riga sola**, qui sotto:
 *
 *     const SU_PLAY = true;
 *
 * poi si copia questo file in ../Sito/briscola/ e si pubblica. Prima di
 * accenderlo: https://play.google.com/store/apps/details?id=it.settebello.briscola
 * deve rispondere 200 (non basta «completed» dell'API: lezione L1 di Briscola).
 *
 * Senza JavaScript resta il «presto»: è la scelta sicura, mai un link rotto.
 * Facoltativo, lo stesso giorno: in `index.html` aggiungere al JSON-LD
 * `"sameAs": ["https://play.google.com/store/apps/details?id=it.settebello.briscola"]`
 * e togliere «Coming soon» dalla card della home.
 */
const SU_PLAY = false;

if (SU_PLAY) {
  for (const el of document.querySelectorAll('[data-play]')) el.hidden = false;
  for (const el of document.querySelectorAll('[data-presto]')) el.hidden = true;
}
