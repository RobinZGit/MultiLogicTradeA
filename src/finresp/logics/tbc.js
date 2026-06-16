/*
 * TBC (test counter-bokovik) — тестовая контр-логика для боковика, лонг-only.
 *
 * Идея: входить в «просадке» внутри диапазона и выходить на отскоке.
 *
 * Строка (в терминах DSL):
 * - `F("TBC_REGIME")`: режим боковика/контртренда на базе LinReg (параметры берутся из fragments.js).
 * - `Op(Long(...))` (вход в лонг) когда одновременно:
 *   - `SMA(100)(Bl)`: цена ниже SMA(100) → «дешевле среднего»;
 *   - `Stoch(...)(K<=10)`: стохастик в зоне перепроданности;
 *   - `MACD(...)(Macd<Sig)`: MACD ниже сигнальной → импульс ещё слабый (контр-вход).
 * - `Cl(Long(...))` (выход из лонга) когда одновременно:
 *   - `SMA(100)(Ab)`: цена выше SMA(100);
 *   - `Stoch(...)(K>=90)`: стохастик в перекупленности;
 *   - `MACD(...)(Macd>Sig)`: импульс восстановился.
 * - `F("SLTP")`: SL/TP берутся из общих параметров (@SL/@TP) или из строки (если %).
 * - `Note(...)`: подпись для UI/отладки.
 */
(function (root) {
  "use strict";
  const F = root.MultiLogicFinrespLogics.fragment;
  root.MultiLogicFinrespLogics.register({
    id: "TBC",
    name: "TBC — test counter-bokovik (лонг)",
    defaultLine:
      F("TBC_REGIME")
      + "Op(Long(SMA(100)(Bl) AND Stoch(14-3-3;Lmin=90;Smax=10)(K<=10) AND MACD(12,26,9)(Macd<Sig))) "
      + "Cl(Long(SMA(100)(Ab) AND Stoch(14-3-3;Lmin=90;Smax=10)(K>=90) AND MACD(12,26,9)(Macd>Sig))) "
      + F("SLTP") + "Note(test-counter-bokovik)"
  });
})(typeof window !== "undefined" ? window : globalThis);
