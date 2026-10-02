/**
 * LA PRIMIERA, COME LA CONTA SETTEBELLO
 * =====================================
 * Gli stessi valori del motore del gioco (`src/engine/scoring.ts`): una prova
 * (`src/engine/__tests__/primiera-sito.test.ts`) li confronta mano per mano, così
 * il calcolatore del sito non può dire una cosa e il gioco un'altra.
 *
 * Per ogni seme si tiene la carta che vale di più; si sommano i quattro semi.
 * Un seme che manca vale zero.
 */
export const VALORI = { 7: 21, 6: 18, 1: 16, 5: 15, 4: 14, 3: 13, 2: 12, 8: 10, 9: 10, 10: 10 };

/** `carte`: id come «denari-7». Torna il totale e, per seme, la carta che conta. */
export function primiera(carte) {
  const migliore = {};
  for (const id of carte) {
    const [seme, v] = id.split('-');
    const valore = VALORI[Number(v)];
    if (valore > (migliore[seme]?.valore ?? 0)) migliore[seme] = { id, valore };
  }
  const totale = Object.values(migliore).reduce((a, m) => a + m.valore, 0);
  return { totale, migliore };
}
