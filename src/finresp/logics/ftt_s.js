/*
 * FTT_S — фьючерсы: TotStoch + Stoch, шорт-only, «трендовая» схема 20↔80.
 *
 * Идея: входить в шорт при синхронной слабости (K<=20) и выходить при восстановлении (K>=80).
 * Это шорт-зеркало FTT (но с учётом направления позиции).
 *
 * Строка:
 * - `Op(Short(...K<=20... AND ...K<=20...))` — импульс вниз
 * - `Cl(Short(...K>=80... AND ...K>=80...))` — импульс выдохся/разворот
 * - `F("SLTP")` — SL/TP по параметрам (@SL/@TP), если строка не задаёт %.
 */
(function (root) {
  "use strict";
  const F = root.MultiLogicFinrespLogics.fragment;
  root.MultiLogicFinrespLogics.register({
    id: "FTT_S",
    name: "Фьючерс: TotStoch+Stoch (шорт), тренд 20↔80",
    defaultLine:
      "Op(Short(TotStoch(14-3-3)(K<=20) AND Stoch(14-3-3)(K<=20))) "
      + "Cl(Short(TotStoch(14-3-3)(K>=80) AND Stoch(14-3-3)(K>=80))) "
      + F("SLTP") + "Note(futures-total-stoch-trend-short)"
  });
})(typeof window !== "undefined" ? window : globalThis);
