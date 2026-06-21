/* Contango / backwardation OHLC spread: futures − spot (base asset). */
(function (root) {
  "use strict";
  const reg = root.MultiLogicFinrespIndicators = root.MultiLogicFinrespIndicators || {};

  /**
   * Построить серию спреда контанго по времени фьючерсных баров.
   * spot выравнивается: последняя spot-свеча с time ≤ fut.time.
   */
  reg.buildContangoCandles = function buildContangoCandles(futCandles, spotCandles) {
    if (!futCandles?.length || !spotCandles?.length) return [];
    let spotIdx = 0;
    let lastBar = null;
    const out = [];
    for (const f of futCandles) {
      const ft = f?.time;
      if (!ft) continue;
      while (spotIdx + 1 < spotCandles.length && spotCandles[spotIdx + 1].time <= ft) {
        spotIdx += 1;
      }
      const s = spotCandles[spotIdx];
      if (!s || s.time > ft) {
        if (lastBar) {
          out.push({ ...lastBar, time: ft });
        } else {
          out.push({ time: ft, open: 0, high: 0, low: 0, close: 0, sec: `CTG:${f.sec || "?"}` });
        }
        continue;
      }
      const fo = f.open ?? f.close;
      const fh = f.high ?? f.close;
      const fl = f.low ?? f.close;
      const fc = f.close;
      const so = s.open ?? s.close;
      const sh = s.high ?? s.close;
      const sl = s.low ?? s.close;
      const sc = s.close;
      if (fc == null || sc == null) {
        if (lastBar) out.push({ ...lastBar, time: ft });
        else out.push({ time: ft, open: 0, high: 0, low: 0, close: 0, sec: `CTG:${f.sec || "?"}` });
        continue;
      }
      const bar = {
        time: ft,
        open: (+fo || 0) - (+so || 0),
        high: (+fh || 0) - (+sl || 0),
        low: (+fl || 0) - (+sh || 0),
        close: (+fc || 0) - (+sc || 0),
        sec: `CTG:${f.sec || "?"}`
      };
      lastBar = bar;
      out.push(bar);
    }
    return out;
  };
})(typeof window !== "undefined" ? window : globalThis);
