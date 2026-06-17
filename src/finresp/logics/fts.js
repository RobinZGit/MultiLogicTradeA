/*
 * FTS — фьючерсы: CtgStoch + обычный Stoch, лонг-only, контртрендовая схема 20↔80.
 *
 * CtgStoch — стохастик по контанго (фьючерс − базовый актив), контртрендовый фильтр.
 * Stoch — по цене фьючерса, трендовый/локальный.
 *
 * Строка:
 * - `Op(Long(CtgStoch(...)(K<=20) AND Stoch(...)(K<=20)))`
 * - `Cl(Long(CtgStoch(...)(K>=80) AND Stoch(...)(K>=80)))`
 * - `F("SLTP")`
 */
(function (root) {
  "use strict";
  const F = root.MultiLogicFinrespLogics.fragment;
  root.MultiLogicFinrespLogics.register({
    id: "FTS",
    name: "Фьючерс: CtgStoch+Stoch (лонг), контртренд 20↔80",
    defaultLine:
      "Op(Long(CtgStoch(14-3-3)(K<=20) AND Stoch(14-3-3)(K<=20))) "
      + "Cl(Long(CtgStoch(14-3-3)(K>=80) AND Stoch(14-3-3)(K>=80))) "
      + F("SLTP") + "Note(futures-ctg-stoch-anti)"
  });
})(typeof window !== "undefined" ? window : globalThis);
