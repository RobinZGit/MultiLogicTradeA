/*
 * RND — «случайные сделки» (random long/short), позиционные SL/TP.
 *
 * Это тестовая/демонстрационная логика: она не пытается предсказывать рынок,
 * а генерирует входы через `Rand(P=...)` с заданной вероятностью на каждом баре.
 *
 * Строка:
 * - `Op(Long(Rand(P=12%)(IsOk)))`: вход в лонг с вероятностью 12% на бар;
 * - `Op(Short(Rand(P=12%)(IsOk)))`: вход в шорт с вероятностью 12% на бар;
 * - `SL[1%] TP[5%]`: позиционный риск-менеджмент в % от цены входа (важно: это именно %,
 *   т.е. режим SL/TP = "pct", а не ATR-кратность).
 *
 * Применение: быстрый smoke-test симулятора, UI и маркеров сделок, а также проверка
 * корректности позиционных SL/TP на разных инструментах.
 */
(function (root) {
  "use strict";
  root.MultiLogicFinrespLogics.register({
    id: "RND",
    name: "Случайные сделки — random long/short, SL 1% / TP 5%",
    defaultLine:
      "Op(Long(Rand(P=12%)(IsOk))) Op(Short(Rand(P=12%)(IsOk))) SL[1%] TP[5%] Note(Случайные сделки)"
  });
})(typeof window !== "undefined" ? window : globalThis);
