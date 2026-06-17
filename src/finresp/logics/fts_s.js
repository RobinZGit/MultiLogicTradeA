/*
 * FTS_S — фьючерсы: TotStoch + CtgStoch + Stoch, шорт-only, контртренд 80↔20.
 */
(function (root) {
  "use strict";
  const F = root.MultiLogicFinrespLogics.fragment;
  root.MultiLogicFinrespLogics.register({
    id: "FTS_S",
    name: "Фьючерс: TotStoch+CtgStoch+Stoch (шорт), контртренд 80↔20",
    defaultLine:
      "Op(Short(TotStoch(14-3-3)(K>=80) AND CtgStoch(14-3-3)(K>=80) AND Stoch(14-3-3)(K>=80))) "
      + "Cl(Short(TotStoch(14-3-3)(K<=20) AND CtgStoch(14-3-3)(K<=20) AND Stoch(14-3-3)(K<=20))) "
      + F("SLTP") + "Note(futures-tot-ctg-stoch-anti-short)"
  });
})(typeof window !== "undefined" ? window : globalThis);
