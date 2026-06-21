/*
 * sma_corridor_trend — SMA-коридорная модель (trend mode).
 *
 * Специальный формат (не Op/Cl):
 * - `SMA(100;Spread=@SmaCorridor)(Trend)` → строим коридор вокруг SMA(100),
 *   ширина = @SmaCorridor × ATR (после подстановки параметров).
 * - Trend означает: «торговать в сторону пробоя» (логика внутри движка `sma_corridor`).
 */
(function (root) {
  "use strict";
  root.MultiLogicFinrespLogics.register({
    id: "sma_corridor_trend",
    name: "SMA-эталон, тренд — коридор ATR",
    defaultLine: "SMA(100;Spread=@SmaCorridor)(Trend) SL[@SL] TP[@TP] Note(SMA-Spread-trend)"
  });
})(typeof window !== "undefined" ? window : globalThis);
