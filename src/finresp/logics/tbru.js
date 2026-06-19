(function (root) {
  "use strict";
  root.MultiLogicFinrespLogics.register({
    id: "TBRU",
    name: "TBRU — портфель облигаций (состав фонда)",
    type: "bond_tbru",
    defaultLine: "BondTBRU()",
    helpText: [
      "Покупка облигаций из состава БПИФ «Т-Капитал Облигации» (TBRU, porti.ru).",
      "Аллокация: жадно по текущей доходности — сначала самые доходные ISIN из списка фонда.",
      "Лимит: min(100%, Volume% × Max positions) × депозит — без маржи.",
      "Live: на опросе TF — refresh porti.ru и rebalance; песочница — модельные купоны."
    ].join("\n")
  });
})(typeof window !== "undefined" ? window : globalThis);
