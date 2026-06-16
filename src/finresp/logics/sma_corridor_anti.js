/*
 * sma_corridor_anti — SMA-коридорная модель (anti-trend mode).
 *
 * - `SMA(100;Spread=@SmaCorridor)(Anti)` → тот же ATR-коридор вокруг SMA(100),
 *   но режим Anti означает «контртренд»: брать возврат внутрь коридора/отбой.
 * - Движок распознаёт это как spec `sma_corridor`.
 */
(function (root) {
  "use strict";
  root.MultiLogicFinrespLogics.register({
    id: "sma_corridor_anti",
    name: "SMA-эталон, анти-тренд — коридор ATR",
    defaultLine: "SMA(100;Spread=@SmaCorridor)(Anti) SL[@SL] TP[@TP] Note(SMA-Spread-anti)"
  });
})(typeof window !== "undefined" ? window : globalThis);
