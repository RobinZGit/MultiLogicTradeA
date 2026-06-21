/*
 * FTS — фьючерсы: TotStoch + CtgStoch + Stoch, лонг-only, контртренд 20↔80.
 *
 * TotStoch — стохастик по тотальной цене корзины; CtgStoch — по контанго (фьючерс − spot);
 * Stoch — по цене фьючерса.
 */
(function (root) {
  "use strict";
  const F = root.MultiLogicFinrespLogics.fragment;
  root.MultiLogicFinrespLogics.register({
    id: "FTS",
    name: "Фьючерс: TotStoch+CtgStoch+Stoch (лонг), контртренд 20↔80",
    defaultLine:
      "Op(Long(TotStoch(14-3-3)(K<=20) AND CtgStoch(14-3-3)(K<=20) AND Stoch(14-3-3)(K<=20))) "
      + "Cl(Long(TotStoch(14-3-3)(K>=80) AND CtgStoch(14-3-3)(K>=80) AND Stoch(14-3-3)(K>=80))) "
      + F("SLTP") + "Note(futures-tot-ctg-stoch-anti)"
  });
})(typeof window !== "undefined" ? window : globalThis);
