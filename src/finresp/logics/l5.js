/*
 * L5 — «LmaxTrend»: максимально строгая трендовая логика (лонг + шорт), много подтверждений.
 *
 * Идея: брать только «самые очевидные» трендовые участки, когда большинство индикаторов
 * смотрят в одну сторону. За счёт этого меньше сделок, но потенциально выше качество.
 *
 * Строка:
 * - `F("TREND_REGIME")`: трендовый режим (см. fragments.js).
 * - Long вход требует одновременно:
 *   - `SMA(100)(Ab)` + `LinReg(...)(AbUp)` — тренд вверх по средним/регрессии
 *   - `Bollinger(...)(AbUp)` — пробой верхней зоны Боллинджера
 *   - `VWAP()(Ab)` — цена выше VWAP (внутридневная сила)
 *   - `ATR(...)(GrOk)` — есть волатильность/движение
 *   - `Stoch(...)(K>=80)` — «горячий» импульс
 *   - `CCI>=100`, `Momentum>0`, `Macd>Sig` — ещё три подтверждения импульса
 * - Long выход — зеркальный набор условий вниз + `OnFlip(Close)`.
 * - Short вход/выход — симметрично вниз/вверх.
 * - `F("SLTP")` — SL/TP по параметрам (@SL/@TP), если строка не задаёт %.
 */
(function (root) {
  "use strict";
  const F = root.MultiLogicFinrespLogics.fragment;
  root.MultiLogicFinrespLogics.register({
    id: "L5",
    name: "L5 — LmaxTrend, лонг+шорт тренд",
    defaultLine:
      F("TREND_REGIME")
      + "Op(Long(SMA(100)(Ab) AND LinReg(@LR;Dev=2)(AbUp) AND Bollinger(20;Dev=2)(AbUp) AND VWAP()(Ab) AND ATR(14;Gr=3%;Lb=5)(GrOk) AND Stoch(14-3-3;Lmin=80;Smax=20)(K>=80) AND CCI(20;Lmin=100;Smax=-100)(CCI>=100) AND Momentum(10)(MOM>0) AND MACD(12,26,9)(Macd>Sig))) "
      + "Cl(Long(SMA(100)(Bl) AND LinReg(@LR;Dev=2)(BlLo) AND Bollinger(20;Dev=2)(BlLo) AND VWAP()(Bl) AND Stoch(14-3-3;Lmin=80;Smax=20)(K<=20) AND CCI(20;Lmin=100;Smax=-100)(CCI<=-100) AND Momentum(10)(MOM<0) AND MACD(12,26,9)(Macd<Sig)) OnFlip(Close)) "
      + "Op(Short(SMA(100)(Bl) AND LinReg(@LR;Dev=2)(BlLo) AND Bollinger(20;Dev=2)(BlLo) AND VWAP()(Bl) AND ATR(14;Gr=3%;Lb=5)(GrOk) AND Stoch(14-3-3;Lmin=80;Smax=20)(K<=20) AND CCI(20;Lmin=100;Smax=-100)(CCI<=-100) AND Momentum(10)(MOM<0) AND MACD(12,26,9)(Macd<Sig))) "
      + "Cl(Short(SMA(100)(Ab) AND LinReg(@LR;Dev=2)(AbUp) AND Bollinger(20;Dev=2)(AbUp) AND VWAP()(Ab) AND Stoch(14-3-3;Lmin=80;Smax=20)(K>=80) AND CCI(20;Lmin=100;Smax=-100)(CCI>=100) AND Momentum(10)(MOM>0) AND MACD(12,26,9)(Macd>Sig)) OnFlip(Close))"
      + F("SLTP") + "Note(LmaxTrend)"
  });
})(typeof window !== "undefined" ? window : globalThis);
