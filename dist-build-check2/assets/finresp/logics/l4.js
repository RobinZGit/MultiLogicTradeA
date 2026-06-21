/*
 * L4 — шорт, боковик (зеркало L2).
 *
 * Идея: в диапазоне продавать «перегретость» (Stoch перекуплен),
 * но с базовым фильтром по SMA(100) и подтверждением по MACD/ATR.
 *
 * Строка:
 * - `F("BOKOVIK_REGIME")`: режим боковика (см. fragments.js).
 * - Short вход:
 *   - `SMA(100)(Bl)` цена ниже SMA(100)
 *   - `Stoch(...)(K>=90)` перекупленность → контр-вход в шорт
 *   - `ATR(...)(GrOk)` рынок «движется»
 *   - `MACD(...)(Macd<Sig)` подтверждение слабости
 * - Short выход:
 *   - `SMA(100)(Ab)` цена выше среднего
 *   - `Stoch(...)(K<=10)` перепроданность
 *   - `Macd>Sig` импульс восстановился
 *   - `OnFlip(Close)` — закрыть при смене режима
 * - `F("SLTP")` — SL/TP по параметрам (@SL/@TP), если строка не задаёт %.
 */
(function (root) {
  "use strict";
  const F = root.MultiLogicFinrespLogics.fragment;
  root.MultiLogicFinrespLogics.register({
    id: "L4",
    name: "L4 — шорт, боковик",
    defaultLine:
      F("BOKOVIK_REGIME")
      + "Op(Short(SMA(100)(Bl) AND Stoch(14-3-3;Lmin=90;Smax=10)(K>=90) AND ATR(14;Gr=3%;Lb=5)(GrOk) AND MACD(12,26,9)(Macd<Sig))) "
      + "Cl(Short(SMA(100)(Ab) AND Stoch(14-3-3;Lmin=90;Smax=10)(K<=10) AND MACD(12,26,9)(Macd>Sig)) OnFlip(Close))"
      + F("SLTP") + "Note(short-bokovik)"
  });
})(typeof window !== "undefined" ? window : globalThis);
