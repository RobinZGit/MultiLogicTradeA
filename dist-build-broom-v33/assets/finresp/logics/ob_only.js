/*
 * OB_ONLY — только сигналы стакана (live); в расчёте FINRESP недоступна.
 */
(function (root) {
  "use strict";
  root.MultiLogicFinrespLogics.register({
    id: "OB_ONLY",
    name: "Только стакан (Imb·Spr·Depth) · live",
    obProfile: "only",
    requiresOrderBook: true,
    defaultLine: [
      "Op(Long(OB.Imb(D=@ObDepth;Thr=@ObThr;Mode=trend)(BuyOk)",
      "AND OB.Spr(Max=@ObSpr)(Tight) AND OB.Depth(D=@ObDepth;Min=@ObMinLots)(Liquid)))",
      "Cl(Long(OB.Imb(D=@ObDepth;Thr=@ObThr;Mode=anti)(SellOk)))",
      "SL[@SL] TP[@TP] Note(OB-live-only)"
    ].join(" ")
  });
})(typeof window !== "undefined" ? window : globalThis);
