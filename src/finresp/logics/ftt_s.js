/*
 * FTT_S — фьючерсы: TotStoch + CtgStoch + Stoch, шорт-only, тренд 20↔80.
 */
(function (root) {
  "use strict";
  const F = root.MultiLogicFinrespLogics.fragment;
  root.MultiLogicFinrespLogics.register({
    id: "FTT_S",
    name: "Фьючерс: TotStoch+CtgStoch+Stoch (шорт), тренд 20↔80",
    defaultLine:
      "Op(Short(TotStoch(14-3-3)(K<=20) AND CtgStoch(14-3-3)(K<=20) AND Stoch(14-3-3)(K<=20))) "
      + "Cl(Short(TotStoch(14-3-3)(K>=80) AND CtgStoch(14-3-3)(K>=80) AND Stoch(14-3-3)(K>=80))) "
      + F("SLTP") + "Note(futures-tot-ctg-stoch-trend-short)"
  });
})(typeof window !== "undefined" ? window : globalThis);
