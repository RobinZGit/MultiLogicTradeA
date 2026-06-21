/*
 * L1 — лонг, трендовая логика (мульти-фильтр: SMA + LinReg + ATR-режим + CCI + MACD).
 *
 * Идея: входить только при сильном бычьем импульсе и достаточной волатильности,
 * выходить при сломе структуры и/или развороте режима.
 *
 * Строка:
 * - `F("TREND_REGIME")`: трендовый Regime(...) с Entry=MatchSide и OnFlip=Close (см. fragments.js).
 * - Long вход (`Op(Long(...))`) когда одновременно:
 *   - `SMA(100)(Ab)` цена выше SMA(100)
 *   - `LinReg(@LR;Dev=2)(AbUp)` линрег-канал вверх/цена у верхней части (трендовое подтверждение)
 *   - `ATR(14;Gr=3%;Lb=5)(GrOk)` ATR растёт (фильтр «есть движение»)
 *   - `CCI(20)(CCI>=100)` CCI в сильной зоне тренда
 *   - `MACD(12,26,9)(Macd>Sig)` MACD выше сигнальной
 * - Long выход (`Cl(Long(...))`) когда одновременно:
 *   - `SMA(100)(Bl)` цена ниже SMA(100)
 *   - `LinReg(...)(BlLo)` цена/линия в нижней зоне (слом)
 *   - `CCI<=-100` и `Macd<Sig` (медвежий импульс)
 *   - `OnFlip(Close)` — закрыть на развороте режима (даже если часть условий не успела выполниться)
 * - `F("SLTP")` — SL/TP по параметрам (@SL/@TP), если строка не задаёт %.
 */
(function (root) {
  "use strict";
  const F = root.MultiLogicFinrespLogics.fragment;
  root.MultiLogicFinrespLogics.register({
    id: "L1",
    name: "L1 — лонг, тренд",
    defaultLine:
      F("TREND_REGIME")
      + "Op(Long(SMA(100)(Ab) AND LinReg(@LR;Dev=2)(AbUp) AND ATR(14;Gr=3%;Lb=5)(GrOk) AND CCI(20;Lmin=100;Smax=-100)(CCI>=100) AND MACD(12,26,9)(Macd>Sig))) "
      + "Cl(Long(SMA(100)(Bl) AND LinReg(@LR;Dev=2)(BlLo) AND CCI(20;Lmin=100;Smax=-100)(CCI<=-100) AND MACD(12,26,9)(Macd<Sig)) OnFlip(Close))"
      + F("SLTP") + "Note(lon-trend)"
  });
})(typeof window !== "undefined" ? window : globalThis);
