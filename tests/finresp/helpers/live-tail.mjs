/**
 * Упрощённая копия live-пути calcLiveSignalsPerInstrument (engine only, без DOM/сеть).
 * @param {object} E — MultiLogicFinrespEngine
 */
export function simulateLiveTailFinresp(E, packs, spec, params, vol, tailBars) {
  const tail = tailBars ?? 220;
  const portfolioCap = E.createPortfolioCap(vol);
  const perSec = [];
  const perInstrumentMs = [];

  for (let pi = 0; pi < packs.length; pi++) {
    const candles = packs[pi];
    const sec = candles?.[0]?.sec || "?";
    if (!candles?.length || candles.length < 3) continue;
    const b = candles.length - 1;
    const a = Math.max(0, b - tail + 1);
    const t0 = performance.now();
    const r = E.runOnCandles(candles, spec, a, b, params, vol, { sec, portfolioCap });
    perInstrumentMs.push({ sec, ms: performance.now() - t0 });
    if (!r.rows?.length) continue;
    const last = r.rows.at(-1);
    const probe = E.probeLogicSignalsAtBar(candles, spec, params, {
      barIndex: b,
      pos: r.pos,
      entryBarIdx: r.simState?.entryBarIdx,
      entryMid: r.simState?.entryMid,
      entryBeta: r.simState?.entryBeta,
      reverse: params.Reverse,
      lastRow: last
    });
    perSec.push({ sec, ...r, signalProbe: probe });
  }

  const totalMs = perInstrumentMs.reduce((s, x) => s + x.ms, 0);
  const maxMs = perInstrumentMs.reduce((m, x) => Math.max(m, x.ms), 0);
  const avgMs = perSec.length ? totalMs / perSec.length : 0;

  return { perSec, perInstrumentMs, totalMs, maxMs, avgMs };
}
