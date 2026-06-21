/*
 * FTT — фьючерсы: TotStoch + Stoch, лонг-only, трендовая схема 80↔20.
 *
 * Идея: входить «по тренду» при синхронной силе (K>=80), выходить при потере импульса (K<=20).
 * Это зеркально контртрендовой FTS, но логика интерпретации уровней противоположная.
 *
 * Строка:
 * - `Op(Long(...K>=80... AND ...K>=80...))` — импульс вверх
 * - `Cl(Long(...K<=20... AND ...K<=20...))` — импульс выдохся
 * - `F("SLTP")` — SL/TP по параметрам (@SL/@TP), если строка не задаёт %.
 */
(function (root) {
  "use strict";
  const F = root.MultiLogicFinrespLogics.fragment;
  root.MultiLogicFinrespLogics.register({
    id: "FTT",
    name: "Фьючерс: TotStoch+Stoch (лонг), тренд 80↔20",
    defaultLine:
      "Op(Long(TotStoch(14-3-3)(K>=80) AND Stoch(14-3-3)(K>=80))) "
      + "Cl(Long(TotStoch(14-3-3)(K<=20) AND Stoch(14-3-3)(K<=20))) "
      + F("SLTP") + "Note(futures-total-stoch-trend)"
  });
})(typeof window !== "undefined" ? window : globalThis);
