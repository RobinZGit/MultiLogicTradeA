/*
 * FTT — фьючерсы: CtgStoch + Stoch, лонг-only, трендовая схема 80↔20.
 */
(function (root) {
  "use strict";
  const F = root.MultiLogicFinrespLogics.fragment;
  root.MultiLogicFinrespLogics.register({
    id: "FTT",
    name: "Фьючерс: CtgStoch+Stoch (лонг), тренд 80↔20",
    defaultLine:
      "Op(Long(CtgStoch(14-3-3)(K>=80) AND Stoch(14-3-3)(K>=80))) "
      + "Cl(Long(CtgStoch(14-3-3)(K<=20) AND Stoch(14-3-3)(K<=20))) "
      + F("SLTP") + "Note(futures-ctg-stoch-trend)"
  });
})(typeof window !== "undefined" ? window : globalThis);
