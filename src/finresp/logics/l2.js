/*
 * L2 — лонг, боковик (mean-reversion внутри диапазона, но с базовым фильтром тренда по SMA).
 *
 * Идея: в «боковике» брать отскоки от локальных экстремумов (Stoch),
 * но не торговать против общего направления слишком агрессивно.
 *
 * Строка:
 * - `F("BOKOVIK_REGIME")`: режим «боковик» (SlopeDead и/или FlatOnly, см. fragments.js).
 * - Long вход:
 *   - `SMA(100)(Ab)` базовый фильтр: цена выше SMA(100)
 *   - `Stoch(...)(K<=10)` стохастик перепродан → берём отскок
 *   - `ATR(...)(GrOk)` есть движение (ATR растёт)
 *   - `MACD(...)(Macd>Sig)` подтверждение импульса на входе
 * - Long выход:
 *   - `SMA(100)(Bl)` цена ушла ниже среднего
 *   - `Stoch(...)(K>=90)` перекупленность
 *   - `Macd<Sig` импульс сломался
 *   - `OnFlip(Close)` — закрыть при смене режима
 * - `F("SLTP")` — SL/TP по параметрам (@SL/@TP), если строка не задаёт %.
 */
(function (root) {
  "use strict";
  const F = root.MultiLogicFinrespLogics.fragment;
  root.MultiLogicFinrespLogics.register({
    id: "L2",
    name: "L2 — лонг, боковик",
    defaultLine:
      F("BOKOVIK_REGIME")
      + "Op(Long(SMA(100)(Ab) AND Stoch(14-3-3;Lmin=90;Smax=10)(K<=10) AND ATR(14;Gr=3%;Lb=5)(GrOk) AND MACD(12,26,9)(Macd>Sig))) "
      + "Cl(Long(SMA(100)(Bl) AND Stoch(14-3-3;Lmin=90;Smax=10)(K>=90) AND MACD(12,26,9)(Macd<Sig)) OnFlip(Close))"
      + F("SLTP") + "Note(lon-bokovik)"
  });
})(typeof window !== "undefined" ? window : globalThis);
