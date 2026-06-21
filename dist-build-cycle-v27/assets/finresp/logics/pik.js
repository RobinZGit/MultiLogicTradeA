/*
 * PIK — Peak / пик корзины: mean-reversion по средней цене выбранных бумаг.
 *
 * TotStoch — стохастик по TOT (среднее close всех инструментов расчёта), как на графике equity.
 * Stoch — та же бумага локально (виновник отклонения).
 * Расчёт, live и песочница: обычная logic_line.
 */
(function (root) {
  "use strict";
  const F = root.MultiLogicFinrespLogics.fragment;
  root.MultiLogicFinrespLogics.register({
    id: "PIK",
    name: "Пик корзины — откуп провала / продажа всплеска (TotStoch+Stoch)",
    defaultLine:
      "Op(Long(TotStoch(10-3-3)(K<=12) AND Stoch(10-3-3)(K<=15) AND Momentum(5)(MOM<0))) "
      + "Cl(Long(TotStoch(10-3-3)(K>=42) AND Stoch(10-3-3)(K>=42))) "
      + "Op(Short(TotStoch(10-3-3)(K>=88) AND Stoch(10-3-3)(K>=85) AND Momentum(5)(MOM>0))) "
      + "Cl(Short(TotStoch(10-3-3)(K<=55) AND Stoch(10-3-3)(K<=55))) "
      + F("SLTP") + "Note(peak-basket-TotStoch-mean-revert)"
  });
})(typeof window !== "undefined" ? window : globalThis);
