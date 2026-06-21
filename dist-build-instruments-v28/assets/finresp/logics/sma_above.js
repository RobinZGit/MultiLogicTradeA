/*
 * sma_above — не Op/Cl логика, а «SMA Vol-модель» для объёмного калькулятора.
 *
 * Строка имеет специальный формат, который движок распознаёт отдельно:
 * - `SMA(100;Vol)(Ab)` означает «считать buy/sell объёмы из |Close − SMA(100)|»,
 *   а знак (Ab/Bl) задаёт сторону (выше/ниже).
 * - `SL[@SL] TP[@TP]` здесь используются как параметры для маркеров/симуляции,
 *   но основная цель — оценка FINRESP на модели, привязанной к SMA.
 *
 * Важно: это не «торговая стратегия Op/Cl», а отдельный тип spec: `sma_spread`.
 */
(function (root) {
  "use strict";
  root.MultiLogicFinrespLogics.register({
    id: "sma_above",
    name: "Выше SMA — объём |Close−SMA|",
    defaultLine: "SMA(100;Vol)(Ab) SL[@SL] TP[@TP] Note(SMA-Vol-above)"
  });
})(typeof window !== "undefined" ? window : globalThis);
