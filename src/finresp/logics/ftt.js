/*
 * FTT — фьючерсы: TotStoch + CtgStoch + Stoch, лонг-only, тренд 80↔20.
 */
(function (root) {
  "use strict";
  const F = root.MultiLogicFinrespLogics.fragment;
  root.MultiLogicFinrespLogics.register({
    id: "FTT",
    name: "Фьючерс: TotStoch+CtgStoch+Stoch (лонг), тренд 80↔20",
    defaultLine:
      "Op(Long(TotStoch(14-3-3)(K>=80) AND CtgStoch(14-3-3)(K>=80) AND Stoch(14-3-3)(K>=80))) "
      + "Cl(Long(TotStoch(14-3-3)(K<=20) AND CtgStoch(14-3-3)(K<=20) AND Stoch(14-3-3)(K<=20))) "
      + F("SLTP") + "Note(futures-tot-ctg-stoch-trend)"
  });
})(typeof window !== "undefined" ? window : globalThis);
