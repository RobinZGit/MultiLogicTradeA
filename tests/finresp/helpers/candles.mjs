/** Синтетические часовые свечи для unit-тестов (без MOEX). */
export function makeCandles(sec, count, options) {
  const opts = options || {};
  let price = opts.startPrice ?? 100;
  const barMinutes = opts.barMinutes ?? 60;
  const base = opts.startDate ? new Date(opts.startDate) : new Date("2024-01-02T10:00:00Z");
  const drift = opts.drift ?? 0.03;
  const candles = [];

  for (let i = 0; i < count; i++) {
    const t = new Date(base.getTime() + i * barMinutes * 60000);
    const pad = (n) => String(n).padStart(2, "0");
    const time =
      `${t.getUTCFullYear()}-${pad(t.getUTCMonth() + 1)}-${pad(t.getUTCDate())} `
      + `${pad(t.getUTCHours())}:${pad(t.getUTCMinutes())}:00`;
    price += Math.sin(i / 11) * 0.4 + drift;
    const close = +price.toFixed(4);
    const open = +(close - 0.08).toFixed(4);
    const high = +(close + 0.55).toFixed(4);
    const low = +(close - 0.55).toFixed(4);
    candles.push({ time, open, high, low, close, sec, market: opts.market || "shares" });
  }
  return candles;
}

export const ALL_INDICATORS = {
  sma: true,
  cma: true,
  atr: true,
  stoch: true,
  linreg: true,
  macd: true,
  cci: true,
  bollinger: true,
  momentum: true,
  vwap: true,
  rand: true
};
