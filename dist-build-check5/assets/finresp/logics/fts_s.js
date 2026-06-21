/*
 * FTS_S — фьючерсы: TotStoch + Stoch, шорт-only, контртрендовая схема 80↔20.
 *
 * Идея: продавать перегретость (K>=80) и закрывать при «остывании» (K<=20).
 * Это шорт-зеркало FTS/FTT с соответствующей интерпретацией уровней.
 *
 * Строка:
 * - `Op(Short(...K>=80... AND ...K>=80...))` — обе линии в перекупленности
 * - `Cl(Short(...K<=20... AND ...K<=20...))` — обе линии внизу
 * - `F("SLTP")` — SL/TP по параметрам (@SL/@TP), если строка не задаёт %.
 */
(function (root) {
  "use strict";
  const F = root.MultiLogicFinrespLogics.fragment;
  root.MultiLogicFinrespLogics.register({
    id: "FTS_S",
    name: "Фьючерс: TotStoch+Stoch (шорт), контртренд 80↔20",
    defaultLine:
      "Op(Short(TotStoch(14-3-3)(K>=80) AND Stoch(14-3-3)(K>=80))) "
      + "Cl(Short(TotStoch(14-3-3)(K<=20) AND Stoch(14-3-3)(K<=20))) "
      + F("SLTP") + "Note(futures-total-stoch-anti-short)"
  });
})(typeof window !== "undefined" ? window : globalThis);
