/**
 * LE CARTE DELLE GUIDE
 * ====================
 * Disegna una carta napoletana dal foglio del mazzo (`img/napoletane-foglio.webp`,
 * lo stesso dell'app: 10 colonne dall'asso al re, 4 righe denari, coppe, spade,
 * bastoni). Un id è «seme-valore», come nel motore del gioco: `denari-7`.
 */
export const SEMI = ['denari', 'coppe', 'spade', 'bastoni'];
const FIGURE = { 1: 'Asso', 8: 'Fante', 9: 'Cavallo', 10: 'Re' };

export const nomeCarta = (id) => {
  const [seme, v] = id.split('-');
  return `${FIGURE[v] ?? v} di ${seme}`;
};

/** Un elemento che mostra la carta. `larghezza` in pixel CSS (o una stringa CSS). */
export function carta(id, larghezza = 64) {
  const [seme, v] = id.split('-');
  const el = document.createElement('span');
  el.className = 'carta-g';
  el.setAttribute('role', 'img');
  el.setAttribute('aria-label', nomeCarta(id));
  el.title = nomeCarta(id);
  el.style.setProperty('--w', typeof larghezza === 'number' ? `${larghezza}px` : larghezza);
  el.style.backgroundPosition = `${((Number(v) - 1) / 9) * 100}% ${(SEMI.indexOf(seme) / 3) * 100}%`;
  return el;
}

/** Sostituisce ogni `<span data-carta="denari-7">` della pagina con la carta disegnata. */
export function disegnaCarte(radice = document) {
  for (const s of radice.querySelectorAll('[data-carta]')) {
    const c = carta(s.dataset.carta, s.dataset.larghezza ? Number(s.dataset.larghezza) : 64);
    s.replaceWith(c);
  }
}
