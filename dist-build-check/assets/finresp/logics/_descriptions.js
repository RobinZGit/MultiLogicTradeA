/*
 * Справочные тексты встроенных логик (кнопка «i.» в каталоге).
 * Загружается ПОСЛЕ всех logics/*.js и дополняет registry.helpText.
 */
(function (root) {
  "use strict";
  const reg = root.MultiLogicFinrespLogics;
  if (!reg || typeof reg.get !== "function") return;

  const HELP = {
    RND: [
      "Случайные сделки — smoke-test симулятора и позиционных SL/TP.",
      "",
      "Op(Long(Rand(P=12%)(IsOk))) — вход в лонг с вероятностью 12% на бар.",
      "Op(Short(Rand(P=12%)(IsOk))) — вход в шорт с вероятностью 12% на бар.",
      "Rand(P=…)(IsOk) — генератор случайного сигнала с заданной вероятностью.",
      "SL[1%] TP[5%] — стоп и тейк в процентах от цены входа (не ATR-кратность)."
    ].join("\n"),

    TBC: [
      "Тестовая контр-логика для боковика, только лонг.",
      "",
      "Regime (TBC_REGIME) — режим боковика на LinReg.",
      "Op(Long(...)) — вход при SMA(100)(Bl) (цена ниже SMA), Stoch(K<=10) (перепроданность), MACD(Macd<Sig).",
      "Cl(Long(...)) — выход при SMA(100)(Ab), Stoch(K>=90), MACD(Macd>Sig).",
      "SL[@SL] TP[@TP] — стопы из параметров формы (@SL, @TP)."
    ].join("\n"),

    UT: [
      "Universal Trend — тренд по LinReg-каналу ±K×ATR с RegDrift на выходе.",
      "",
      "Regime (UCT_REGIME) — правила на разворотах; OnFlip(Close) закрывает позицию при смене режима.",
      "Long вход: SMA(100)(Ab) — цена выше SMA; LinReg(@LR;K=@K)(AbLinK) — выше верхней границы канала.",
      "Long выход: SMA(100)(Bl); LinReg(...;Drift=RegDrift)(BlRegK) — ниже дрейфующей нижней границы; OnFlip(Close).",
      "Short — зеркально (Bl/Ab меняются местами).",
      "SL[@SL] TP[@TP] — из параметров, если в строке не задан %."
    ].join("\n"),

    UCT: [
      "Universal Counter Trend — контртренд на том же LinReg-канале ±K×ATR.",
      "",
      "Long вход: SMA(100)(Bl) — ниже SMA; LinReg(...)(BlLinK) — ниже нижней границы канала (перепроданность).",
      "Long выход: SMA(100)(Ab); LinReg(...;Drift=RegDrift)(AbRegK); OnFlip(Close).",
      "Short — зеркально: вход на силе, выход на слабости.",
      "SL[@SL] TP[@TP] — из параметров формы."
    ].join("\n"),

    L1: [
      "L1 — лонг, сильный бычий тренд (SMA + LinReg + ATR + CCI + MACD).",
      "",
      "Regime (TREND_REGIME) — трендовый режим, Entry=MatchSide, OnFlip=Close.",
      "Op(Long(...)) — одновременно: SMA(100)(Ab); LinReg(AbUp); ATR(GrOk) — растущая волатильность;",
      "  CCI(>=100); MACD(Macd>Sig).",
      "Cl(Long(...)) — SMA(Bl); LinReg(BlLo); CCI(<=-100); MACD(Macd<Sig); OnFlip(Close).",
      "SL[@SL] TP[@TP] — из параметров."
    ].join("\n"),

    L2: [
      "L2 — лонг, боковик (отскоки от Stoch внутри диапазона).",
      "",
      "Regime (BOKOVIK_REGIME) — режим боковика.",
      "Op(Long(...)) — SMA(100)(Ab); Stoch(K<=10) перепроданность; ATR(GrOk); MACD(Macd>Sig).",
      "Cl(Long(...)) — SMA(Bl); Stoch(K>=90); MACD(Macd<Sig); OnFlip(Close).",
      "SL[@SL] TP[@TP] — из параметров."
    ].join("\n"),

    L3: [
      "L3 — шорт, сильный медвежий тренд (зеркало L1).",
      "",
      "Regime (TREND_REGIME).",
      "Op(Short(...)) — SMA(Bl); LinReg(BlLo); ATR(GrOk); CCI(<=-100); MACD(Macd<Sig).",
      "Cl(Short(...)) — SMA(Ab); LinReg(AbUp); CCI(>=100); MACD(Macd>Sig); OnFlip(Close).",
      "SL[@SL] TP[@TP] — из параметров."
    ].join("\n"),

    L4: [
      "L4 — шорт, боковик (зеркало L2).",
      "",
      "Regime (BOKOVIK_REGIME).",
      "Op(Short(...)) — SMA(Bl); Stoch(K>=90) перекупленность; ATR(GrOk); MACD(Macd<Sig).",
      "Cl(Short(...)) — SMA(Ab); Stoch(K<=10); MACD(Macd>Sig); OnFlip(Close).",
      "SL[@SL] TP[@TP] — из параметров."
    ].join("\n"),

    L5: [
      "L5 — LmaxTrend: максимально строгий тренд, лонг и шорт, много фильтров.",
      "",
      "Regime (TREND_REGIME).",
      "Long вход: SMA(Ab) + LinReg(AbUp) + Bollinger(AbUp) + VWAP(Ab) + ATR(GrOk) +",
      "  Stoch(K>=80) + CCI(>=100) + Momentum(>0) + MACD(Macd>Sig).",
      "Long выход — зеркальный набор вниз + OnFlip(Close). Short — симметрично.",
      "SL[@SL] TP[@TP] — из параметров."
    ].join("\n"),

    sma_below: [
      "SMA Vol-модель — не Op/Cl, а отдельный тип spec «sma_spread».",
      "",
      "SMA(100;Vol)(Bl) — объёмы buy/sell из |Close − SMA(100)|, сторона «ниже SMA».",
      "SL[@SL] TP[@TP] — параметры для маркеров и симуляции FINRESP."
    ].join("\n"),

    sma_above: [
      "SMA Vol-модель — зеркало sma_below.",
      "",
      "SMA(100;Vol)(Ab) — объёмы из |Close − SMA(100)|, сторона «выше SMA».",
      "SL[@SL] TP[@TP] — параметры маркеров."
    ].join("\n"),

    sma_corridor_trend: [
      "SMA-коридор, режим Trend (пробой в сторону движения).",
      "",
      "SMA(100;Spread=@SmaCorridor)(Trend) — коридор ± Spread×ATR вокруг SMA(100).",
      "Trend — торговать по пробою коридора (логика внутри движка sma_corridor).",
      "SL[@SL] TP[@TP] — из параметров."
    ].join("\n"),

    sma_corridor_anti: [
      "SMA-коридор, режим Anti (контртренд / отбой).",
      "",
      "SMA(100;Spread=@SmaCorridor)(Anti) — тот же ATR-коридор, но входы против пробоя.",
      "SL[@SL] TP[@TP] — из параметров."
    ].join("\n"),

    FTS: [
      "Фьючерсы: TotStoch + CtgStoch + Stoch, лонг, контртренд 20↔80.",
      "",
      "TotStoch — стохастик по тотальной цене корзины; CtgStoch — по контанго (фьючерс − spot).",
      "Op(Long(...)) — все три K<=20; Cl(Long(...)) — все три K>=80.",
      "SL[@SL] TP[@TP] — из параметров."
    ].join("\n"),

    FTT: [
      "Фьючерсы: TotStoch + CtgStoch + Stoch, лонг, тренд 80↔20.",
      "",
      "Op(Long(...)) — K>=80 на всех трёх стохастиках; Cl — K<=20.",
      "SL[@SL] TP[@TP] — из параметров."
    ].join("\n"),

    FTS_S: [
      "Фьючерсы: TotStoch + CtgStoch + Stoch, шорт, контртренд 80↔20.",
      "",
      "Op(Short(...)) — K>=80; Cl(Short(...)) — K<=20.",
      "SL[@SL] TP[@TP] — из параметров."
    ].join("\n"),

    FTT_S: [
      "Фьючерсы: TotStoch + CtgStoch + Stoch, шорт, тренд 20↔80.",
      "",
      "Op(Short(...)) — K<=20; Cl(Short(...)) — K>=80.",
      "SL[@SL] TP[@TP] — из параметров."
    ].join("\n"),

    CML: [
      "CM long — CMA (кастомная средняя) + LinReg на входе.",
      "",
      "Op(Long(CMA(@CmaLen;P=@CmaPow)(Ab) AND LinReg(@LR;Dev=2)(AbUp))) — цена выше CMA, линрег вверх.",
      "Cl(Long(CMA(...)(Bl) OnFlip(Close))) — пробой CMA вниз или разворот режима.",
      "SL[@SL] TP[@TP] — из параметров."
    ].join("\n"),

    CMS: [
      "CM short — зеркало CML.",
      "",
      "Op(Short(CMA(...)(Bl) AND LinReg(...)(BlLo))) — цена ниже CMA, тренд вниз.",
      "Cl(Short(CMA(...)(Ab) OnFlip(Close))) — возврат выше CMA / разворот.",
      "SL[@SL] TP[@TP] — из параметров."
    ].join("\n"),

    OB_SMA: [
      "SMA(100) + фильтры стакана (order book). Требует live-данные стакана.",
      "",
      "SMA(100)(Ab)/(Bl) — цена выше/ниже SMA(100).",
      "OB.Imb(D;Thr;Mode)(BuyOk/SellOk) — дисбаланс bid/ask на глубине D; Mode=trend/anti.",
      "OB.Spr(Max)(Tight) — спред не шире Max (параметр @ObSpr).",
      "OB.Depth(D;Min)(Liquid) — достаточная ликвидность на глубине D (Min=@ObMinLots).",
      "Op — SMA вверх AND все OB-фильтры; Cl — SMA вниз OR дисбаланс против позиции.",
      "SL[@SL] TP[@TP] — из параметров. Подробнее: справка §9.3.1 (OB DSL)."
    ].join("\n"),

    OB_ONLY: [
      "Только сигналы стакана — для live-торговли; расчёт FINRESP по истории недоступен.",
      "",
      "OB.Imb — дисбаланс объёмов на глубине @ObDepth при пороге @ObThr.",
      "OB.Spr(Max=@ObSpr)(Tight) — узкий спред.",
      "OB.Depth(D=@ObDepth;Min=@ObMinLots)(Liquid) — минимальная ликвидность.",
      "Op(Long(...)) — все три условия; Cl — SellOk по Imb в режиме anti.",
      "SL[@SL] TP[@TP] — из параметров."
    ].join("\n")
  };

  for (const [id, text] of Object.entries(HELP)) {
    const e = reg.get(id);
    if (e && !e.helpText) e.helpText = text;
  }
})(typeof window !== "undefined" ? window : globalThis);
