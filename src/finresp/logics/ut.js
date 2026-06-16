/*
 * UT (Universal Trend) — трендовая логика на LinReg-канале ±K×ATR с RegDrift на выходе.
 *
 * Идея:
 * - Вход: подтверждение тренда через положение цены относительно SMA(100) и LinReg-канала.
 * - Выход: обратный пробой + дополнительный сдвиг (Drift=RegDrift), и принудительный выход при OnFlip(Close).
 *
 * Строка:
 * - `F("UCT_REGIME")`: режим (укороченный Regime) для поведения на разворотах (смотри fragments.js).
 * - Long вход:
 *   - `SMA(100)(Ab)` цена выше SMA(100)
 *   - `LinReg(@LR;K=@K)(AbLinK)` цена выше верхней границы LinReg-канала (центр + K×ATR)
 * - Long выход:
 *   - `SMA(100)(Bl)` цена ниже SMA(100)
 *   - `LinReg(...;Anchor=Open;Drift=RegDrift)(BlRegK)` цена ниже нижней границы «дрейфующего» канала
 *   - `OnFlip(Close)` — закрыть позицию при смене знака тренда режима
 * - Short вход/выход симметричны (Bl/Ab меняются местами).
 * - `F("SLTP")` — SL/TP берутся из параметров (@SL/@TP), если в строке не задан %.
 */
(function (root) {
  "use strict";
  const F = root.MultiLogicFinrespLogics.fragment;
  root.MultiLogicFinrespLogics.register({
    id: "UT",
    name: "Universal Trend — LinReg K×ATR + RegDrift",
    defaultLine:
      F("UCT_REGIME")
      + "Op(Long(SMA(100)(Ab) AND LinReg(@LR;K=@K)(AbLinK))) "
      + "Cl(Long(SMA(100)(Bl) AND LinReg(@LR;K=@K;Anchor=Open;Drift=RegDrift)(BlRegK) OnFlip(Close))) "
      + "Op(Short(SMA(100)(Bl) AND LinReg(@LR;K=@K)(BlLinK))) "
      + "Cl(Short(SMA(100)(Ab) AND LinReg(@LR;K=@K;Anchor=Open;Drift=RegDrift)(AbRegK) OnFlip(Close))) "
      + F("SLTP") + "Note(universal-trend)"
  });
})(typeof window !== "undefined" ? window : globalThis);
