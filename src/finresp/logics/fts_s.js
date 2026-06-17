/*
 * FTS_S — фьючерсы: CtgStoch + Stoch, шорт-only, контртрендовая схема 80↔20.
 */
(function (root) {
  "use strict";
  const F = root.MultiLogicFinrespLogics.fragment;
  root.MultiLogicFinrespLogics.register({
    id: "FTS_S",
    name: "Фьючерс: CtgStoch+Stoch (шорт), контртренд 80↔20",
    defaultLine:
      "Op(Short(CtgStoch(14-3-3)(K>=80) AND Stoch(14-3-3)(K>=80))) "
      + "Cl(Short(CtgStoch(14-3-3)(K<=20) AND Stoch(14-3-3)(K<=20))) "
      + F("SLTP") + "Note(futures-ctg-stoch-anti-short)"
  });
})(typeof window !== "undefined" ? window : globalThis);
