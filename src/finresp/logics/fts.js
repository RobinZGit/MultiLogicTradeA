/*
 * FTS — фьючерсы: TotStoch + обычный Stoch, лонг-only, контртрендовая схема 20↔80.
 *
 * Идея: входить при синхронной перепроданности на «глобальном» (TotStoch) и локальном Stoch,
 * выходить при синхронной перекупленности. Это чистый mean-reversion без SMA/Regime.
 *
 * Строка:
 * - `Op(Long(TotStoch(...)(K<=20) AND Stoch(...)(K<=20)))` — обе K-линии внизу
 * - `Cl(Long(TotStoch(...)(K>=80) AND Stoch(...)(K>=80)))` — обе K-линии наверху
 * - `F("SLTP")` — SL/TP по параметрам (@SL/@TP), если строка не задаёт %.
 */
(function (root) {
  "use strict";
  const F = root.MultiLogicFinrespLogics.fragment;
  root.MultiLogicFinrespLogics.register({
    id: "FTS",
    name: "Фьючерс: TotStoch+Stoch (лонг), контртренд 20↔80",
    defaultLine:
      "Op(Long(TotStoch(14-3-3)(K<=20) AND Stoch(14-3-3)(K<=20))) "
      + "Cl(Long(TotStoch(14-3-3)(K>=80) AND Stoch(14-3-3)(K>=80))) "
      + F("SLTP") + "Note(futures-total-stoch-anti)"
  });
})(typeof window !== "undefined" ? window : globalThis);
