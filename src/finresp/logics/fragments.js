/*
 * Shared string fragments for built-in logic lines (regime prefixes, SL/TP).
 */
(function (root) {
  "use strict";
  const R = root.MultiLogicFinrespLogics = root.MultiLogicFinrespLogics || {};
  R._fragments = {
    TREND_REGIME:
      "Strict(@Strict) Regime(LinReg;L=@LR;Dev=2;SlopeLb=3;OnFlip=Close;Entry=MatchSide) ",
    BOKOVIK_REGIME:
      "Strict(@Strict) Regime(LinReg;L=@LR;Dev=2;SlopeLb=3;SlopeDead=0.05%;OnFlip=Close;Entry=FlatOnly) ",
    TBC_REGIME:
      "Strict(@Strict) Regime(LinReg;L=@LR;Dev=2;SlopeLb=3;SlopeDead=0.05%;OnFlip=Close) ",
    UCT_REGIME:
      "Strict(@Strict) Regime(LinReg;L=@LR;SlopeLb=3;OnFlip=Close) ",
    SLTP: " SL[@SL] TP[@TP] "
  };
  R.fragment = (key) => R._fragments[key] || "";
})(typeof window !== "undefined" ? window : globalThis);
