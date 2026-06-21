/*
 * UCT (Universal Counter Trend) — контртрендовая версия UT на LinReg-канале ±K×ATR.
 *
 * Отличие от UT: входы берутся «против» тренда относительно SMA(100) и границ канала,
 * то есть покупка на слабости и продажа на силе, с выходом по обратному подтверждению.
 *
 * Строка:
 * - `F("UCT_REGIME")`: режим для контртренда/разворотов (смотри fragments.js).
 * - Long вход:
 *   - `SMA(100)(Bl)` цена ниже SMA(100)
 *   - `LinReg(@LR;K=@K)(BlLinK)` цена ниже нижней границы LinReg-канала → «перепроданность» по каналу
 * - Long выход:
 *   - `SMA(100)(Ab)` цена выше SMA(100)
 *   - `LinReg(...;Anchor=Open;Drift=RegDrift)(AbRegK)` цена выше верхней границы дрейфующего канала
 *   - `OnFlip(Close)` — закрыть при смене режима (развороте)
 * - Short вход/выход симметричны.
 * - `F("SLTP")` — SL/TP по параметрам (@SL/@TP), если строка не задаёт %.
 */
(function (root) {
  "use strict";
  const F = root.MultiLogicFinrespLogics.fragment;
  root.MultiLogicFinrespLogics.register({
    id: "UCT",
    name: "Universal Counter Trend — LinReg K×ATR + RegDrift",
    defaultLine:
      F("UCT_REGIME")
      + "Op(Long(SMA(100)(Bl) AND LinReg(@LR;K=@K)(BlLinK))) "
      + "Cl(Long(SMA(100)(Ab) AND LinReg(@LR;K=@K;Anchor=Open;Drift=RegDrift)(AbRegK) OnFlip(Close))) "
      + "Op(Short(SMA(100)(Ab) AND LinReg(@LR;K=@K)(AbLinK))) "
      + "Cl(Short(SMA(100)(Bl) AND LinReg(@LR;K=@K;Anchor=Open;Drift=RegDrift)(BlRegK) OnFlip(Close))) "
      + F("SLTP") + "Note(universal-counter-trend)"
  });
})(typeof window !== "undefined" ? window : globalThis);
