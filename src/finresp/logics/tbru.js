(function (root) {
  "use strict";
  root.MultiLogicFinrespLogics.register({
    id: "TBRU",
    name: "TBRU — портфель облигаций (состав фонда)",
    type: "bond_tbru",
    defaultLine: "BondTBRU()",
    helpText: [
      "Покупка облигаций из состава БПИФ «Т-Капитал Облигации» (TBRU, porti.ru).",
      "Лимит вложений: min(100%, Volume% × Max positions) × депозит — без маржи.",
      "Доли — по весам фонда; rebalance на опросе live (таймфрейм).",
      "В песочнице: ежедневные тестовые купоны и цены из каталога."
    ].join("\n")
  });
})(typeof window !== "undefined" ? window : globalThis);
