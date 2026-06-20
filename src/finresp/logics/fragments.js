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
    ATR_GROK: "ATR(14;Gr=3%;Lb=5)(GrOk)",
    ADX_TREND: "ADX(14;Min=25)(TrOk)",
    ADX_FLAT: "ADX(14;Max=25)(WkOk)",
    SLTP: " SL[@SL] TP[@TP] "
  };
  R.fragment = (key) => R._fragments[key] || "";
})(typeof window !== "undefined" ? window : globalThis);
