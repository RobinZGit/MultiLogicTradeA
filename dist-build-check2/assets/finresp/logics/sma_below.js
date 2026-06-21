/*
 * sma_below — SMA Vol-модель (зеркало `sma_above`).
 *
 * - `SMA(100;Vol)(Bl)` → объёмная модель вокруг SMA(100), сторона «ниже SMA».
 * - Движок распознаёт это как отдельный тип spec: `sma_spread`, а не Op/Cl.
 */
(function (root) {
  "use strict";
  root.MultiLogicFinrespLogics.register({
    id: "sma_below",
    name: "Ниже SMA — объём |Close−SMA|",
    defaultLine: "SMA(100;Vol)(Bl) SL[@SL] TP[@TP] Note(SMA-Vol-below)"
  });
})(typeof window !== "undefined" ? window : globalThis);
