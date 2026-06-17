/*
 * FTT_S — фьючерсы: CtgStoch + Stoch, шорт-only, «трендовая» схема 20↔80.
 */
(function (root) {
  "use strict";
  const F = root.MultiLogicFinrespLogics.fragment;
  root.MultiLogicFinrespLogics.register({
    id: "FTT_S",
    name: "Фьючерс: CtgStoch+Stoch (шорт), тренд 20↔80",
    defaultLine:
      "Op(Short(CtgStoch(14-3-3)(K<=20) AND Stoch(14-3-3)(K<=20))) "
      + "Cl(Short(CtgStoch(14-3-3)(K>=80) AND Stoch(14-3-3)(K>=80))) "
      + F("SLTP") + "Note(futures-ctg-stoch-trend-short)"
  });
})(typeof window !== "undefined" ? window : globalThis);
