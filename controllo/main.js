/**
 * L'INGRESSO DEL PANNELLO
 * =======================
 *
 * Senza sessione `aal2` (password + codice TOTP) non si disegna niente del
 * pannello. In modalità prova (solo localhost, `?prova=1`) l'accesso si salta:
 * i dati sono finti e la pagina lo scrive in cima.
 */
import { inProva, usaCodiceFresco, usaVerificaCodice } from './api.js';
import { avvia } from './app.js';

const radice = document.getElementById('radice');

if (inProva()) {
  await avvia(radice, { email: 'prova@localhost', token: async () => 'prova' });
} else {
  const { ingresso, supabase, sorvegliaInattivita, verificaCodice, chiediCodiceFresco } = await import('./accesso.js');
  const { email } = await ingresso(radice);
  sorvegliaInattivita();
  usaVerificaCodice(verificaCodice);
  usaCodiceFresco(chiediCodiceFresco);
  await avvia(radice, {
    email,
    token: async () => (await supabase().auth.getSession()).data.session?.access_token ?? null,
  });
}
