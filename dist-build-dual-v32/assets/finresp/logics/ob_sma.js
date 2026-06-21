/*
 * OB_SMA — SMA(100) + три OB-атома: Imb, Spr, Depth.
 */
(function (root) {
  "use strict";
  root.MultiLogicFinrespLogics.register({
    id: "OB_SMA",
    name: "SMA + стакан (Imb·Spr·Depth)",
    obProfile: "mixed",
    requiresOrderBook: true,
    defaultLine: [
      "Op(Long(SMA(100)(Ab) AND OB.Imb(D=@ObDepth;Thr=@ObThr;Mode=trend)(BuyOk)",
      "AND OB.Spr(Max=@ObSpr)(Tight) AND OB.Depth(D=@ObDepth;Min=@ObMinLots)(Liquid)))",
      "Cl(Long(SMA(100)(Bl) OR OB.Imb(D=@ObDepth;Thr=@ObThr;Mode=anti)(SellOk)))",
      "SL[@SL] TP[@TP] Note(SMA+стакан)"
    ].join(" ")
  });
})(typeof window !== "undefined" ? window : globalThis);
