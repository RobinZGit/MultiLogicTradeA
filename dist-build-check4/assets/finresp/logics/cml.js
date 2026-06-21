/*
 * CML — «CM long»: кастомная средняя CMA + фильтр тренда LinReg на входе.
 *
 * CMA (custom moving average) в этом проекте — не классическая EMA, а средняя с весами,
 * зависящими от нормализованных цен в окне и степени P (см. формулу в engine).
 *
 * Идея:
 * - вход: цена выше CMA и тренд подтверждён LinReg вверх,
 * - выход: цена ниже CMA, плюс OnFlip(Close) как страховка на развороте режима.
 *
 * Строка:
 * - `CMA(@CmaLen;P=@CmaPow)(Ab)` — цена выше CMA
 * - `LinReg(@LR;Dev=2)(AbUp)` — линрег подтверждает рост
 * - `Cl(... CMA(...)(Bl) OnFlip(Close))` — выход по пробою CMA вниз и/или на развороте режима
 * - `F("SLTP")` — SL/TP по параметрам (@SL/@TP), если строка не задаёт %.
 */
(function (root) {
  "use strict";
  const F = root.MultiLogicFinrespLogics.fragment;
  root.MultiLogicFinrespLogics.register({
    id: "CML",
    name: "CM — лонг (CMA + LinReg на Op, Cl по CMA)",
    defaultLine:
      "Op(Long(CMA(@CmaLen;P=@CmaPow)(Ab) AND LinReg(@LR;Dev=2)(AbUp))) "
      + "Cl(Long(CMA(@CmaLen;P=@CmaPow)(Bl) OnFlip(Close))) "
      + F("SLTP") + "Note(custom-sma-CM-long-LinReg)"
  });
})(typeof window !== "undefined" ? window : globalThis);
