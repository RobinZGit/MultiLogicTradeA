/*
 * PIKH — Peak Horizontal: боковик корзины, без охоты за иглами PIK.
 * Включать вместо PIK, когда нужен горизонтальный режим (не смешивать в одном стеке с PIK).
 */
(function (root) {
  "use strict";
  const F = root.MultiLogicFinrespLogics.fragment;
  root.MultiLogicFinrespLogics.register({
    id: "PIKH",
    name: "Пик горизонт — боковик корзины (TotStoch 30–70, Bollinger)",
    defaultLine:
      F("BOKOVIK_REGIME")
      + "Op(Long(TotStoch(14-3-3)(K>=32) AND TotStoch(14-3-3)(K<=68) AND Bollinger(30;Dev=2)(AbLo) AND Bollinger(30;Dev=2)(BlUp) AND Stoch(14-3-3)(K<=22))) "
      + "Cl(Long(TotStoch(14-3-3)(K>=48) AND Stoch(14-3-3)(K>=75))) "
      + "Op(Short(TotStoch(14-3-3)(K>=32) AND TotStoch(14-3-3)(K<=68) AND Bollinger(30;Dev=2)(BlUp) AND Bollinger(30;Dev=2)(AbLo) AND Stoch(14-3-3)(K>=78))) "
      + "Cl(Short(TotStoch(14-3-3)(K<=52) AND Stoch(14-3-3)(K<=25))) "
      + F("SLTP") + "Note(peak-horizontal-basket-range)"
  });
})(typeof window !== "undefined" ? window : globalThis);
