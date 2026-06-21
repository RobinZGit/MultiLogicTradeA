/*
 * CMS — «CM short»: кастомная средняя CMA + LinReg вниз на входе (зеркало CML).
 *
 * Идея:
 * - вход: цена ниже CMA и LinReg подтверждает тренд вниз,
 * - выход: цена выше CMA, плюс OnFlip(Close) как страховка при развороте режима.
 *
 * Строка:
 * - `Op(Short(CMA(...)(Bl) AND LinReg(...)(BlLo)))` — шорт по слабости
 * - `Cl(Short(CMA(...)(Ab) OnFlip(Close)))` — закрыть при возврате выше CMA/развороте режима
 * - `F("SLTP")` — SL/TP по параметрам (@SL/@TP), если строка не задаёт %.
 */
(function (root) {
  "use strict";
  const F = root.MultiLogicFinrespLogics.fragment;
  root.MultiLogicFinrespLogics.register({
    id: "CMS",
    name: "CM — шорт (CMA + LinReg на Op, Cl по CMA)",
    defaultLine:
      "Op(Short(CMA(@CmaLen;P=@CmaPow)(Bl) AND LinReg(@LR;Dev=2)(BlLo))) "
      + "Cl(Short(CMA(@CmaLen;P=@CmaPow)(Ab) OnFlip(Close))) "
      + F("SLTP") + "Note(custom-sma-CM-short-LinReg)"
  });
})(typeof window !== "undefined" ? window : globalThis);
