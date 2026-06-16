/**
 * Упрощённая копия @@AutoReverses: 4 варианта ReverseSides × ReverseSignals на окне [a..b].
 * @param {object} E — MultiLogicFinrespEngine
 */
export const AUTO_REVERSE_VARIANTS = [
  { sides: false, signals: false, key: "00" },
  { sides: true, signals: false, key: "10" },
  { sides: false, signals: true, key: "01" },
  { sides: true, signals: true, key: "11" }
];

/**
 * @param {object} E
 * @param {object[][]} packs
 * @param {object} spec
 * @param {object} params
 * @param {object} vol
 * @param {object} stopper
 * @param {number} lookback — @@AutoLookback (свечей)
 */
export function simulateAutoReversesPick(E, packs, spec, params, vol, stopper, lookback) {
  const lens = packs.map((p) => (p?.length || 0)).filter((n) => n > 0);
  if (!lens.length) return { best: null, variants: [], a: 0, b: -1, totalMs: 0 };
  const b = Math.min(...lens.map((n) => n - 1));
  const a = Math.max(0, b - lookback + 1);
  let best = null;
  const variants = [];
  let totalMs = 0;

  for (const v of AUTO_REVERSE_VARIANTS) {
    const pv = { ...params, ReverseSides: v.sides, ReverseSignals: v.signals };
    const t0 = performance.now();
    const out = E.runMulti(packs, spec, a, b, pv, vol, stopper, {
      reverseSides: v.sides,
      reverseSignals: v.signals
    });
    const ms = performance.now() - t0;
    totalMs += ms;
    const fin = out?.agg?.finresp;
    const row = {
      ...v,
      finresp: fin,
      ms,
      perSecCount: out?.perSec?.length ?? 0
    };
    variants.push(row);
    if (Number.isFinite(fin) && (!best || fin > best.finresp)) best = row;
  }

  return { best, variants, a, b, totalMs };
}
