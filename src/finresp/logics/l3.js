/*
 * L3 — шорт, трендовая логика (зеркало L1).
 *
 * Идея: входить при сильном медвежьем импульсе и достаточной волатильности,
 * выходить при сломе структуры и/или развороте режима.
 *
 * Строка:
 * - `F("TREND_REGIME")`: трендовый Regime(...) (см. fragments.js).
 * - Short вход:
 *   - `SMA(100)(Bl)` цена ниже SMA(100)
 *   - `LinReg(@LR;Dev=2)(BlLo)` движение вниз (нижняя зона линрега)
 *   - `ATR(...)(GrOk)` есть импульс
 *   - `CCI<=-100` и `Macd<Sig` подтверждение тренда вниз
 * - Short выход:
 *   - `SMA(100)(Ab)` цена выше SMA(100)
 *   - `LinReg(...)(AbUp)` структура вверх
 *   - `CCI>=100` и `Macd>Sig` бычий импульс
 *   - `OnFlip(Close)` — закрыть при развороте режима
 * - `F("SLTP")` — SL/TP по параметрам (@SL/@TP), если строка не задаёт %.
 */
(function (root) {
  "use strict";
  const F = root.MultiLogicFinrespLogics.fragment;
  root.MultiLogicFinrespLogics.register({
    id: "L3",
    name: "L3 — шорт, тренд",
    defaultLine:
      F("TREND_REGIME")
      + "Op(Short(SMA(100)(Bl) AND LinReg(@LR;Dev=2)(BlLo) AND ATR(14;Gr=3%;Lb=5)(GrOk) AND CCI(20;Lmin=100;Smax=-100)(CCI<=-100) AND MACD(12,26,9)(Macd<Sig))) "
      + "Cl(Short(SMA(100)(Ab) AND LinReg(@LR;Dev=2)(AbUp) AND CCI(20;Lmin=100;Smax=-100)(CCI>=100) AND MACD(12,26,9)(Macd>Sig)) OnFlip(Close))"
      + F("SLTP") + "Note(short-trend)"
  });
})(typeof window !== "undefined" ? window : globalThis);
