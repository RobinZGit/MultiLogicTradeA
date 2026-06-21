/*
 * MultiLogic FINRESP — DSL parser (Op/Cl logic lines).
 *
 * Этот файл отделяет «разбор строк логики» от движка симуляции.
 *
 * ## Что это за DSL
 * Логика в каталоге — это строка, которая описывает:
 * - входы в позицию (Op),
 * - выходы из позиции (Cl),
 * - опциональный режим Regime(...) (правила поведения вокруг разворотов/тренда),
 * - опциональные SL/TP (в ATR-кратности или в %),
 * - служебные декораторы Strict(...), Note(...), @OBT(...) и т.п.
 *
 * Пример (упрощённо):
 *   Strict(@Strict) Regime(LinReg;L=@LR;SlopeLb=3;OnFlip=Close;Entry=MatchSide)
 *   Op(Long(SMA(100)(Ab)) AND Long(MOM(10)(>0)))
 *   Cl(Long(SMA(100)(Bl)) OnFlip(Close))
 *   SL[@SL] TP[@TP] Note(Trend)
 *
 * ### Основные блоки
 * - `Op(Long(...))`, `Op(Short(...))` — условия входа.
 * - `Cl(Long(...))`, `Cl(Short(...))` — условия выхода.
 *
 * Внутри `Long(...)` / `Short(...)` допускается логическое И на верхнем уровне:
 * - `A AND B AND C` (строго верхнеуровневое, с учётом скобок).
 *
 * ### «Атом» условия (Atom)
 * Атом пишется как:
 *   `<KIND>(<params>)(<signal>)`
 *
 * Примеры:
 * - `SMA(100)(Ab)` — цена выше SMA(100)
 * - `SMA(100)(Bl)` — цена ниже SMA(100)
 * - `LinReg(20;Dev=2)(Up)` — линрег вверх
 * - `Rand(P=12%)(IsOk)` — случайный вход с вероятностью
 *
 * Парсер **не вычисляет** индикаторы и не исполняет стратегию.
 * Он только строит структурированное представление строки (AST-ish объект),
 * которое затем использует движок.
 *
 * ## Глобальный экспорт
 * Файл встраивается как `<script>` в браузер, и публикует:
 *   `window.MultiLogicFinrespParser` (или `globalThis.MultiLogicFinrespParser` в Node VM).
 *
 * Движок ожидает, что этот файл будет загружен **до** `MultiLogic_FinrespCalculator.engine.js`.
 */
(function (root) {
  "use strict";

  const P = root.MultiLogicFinrespParser = root.MultiLogicFinrespParser || {};

  /**
   * Доля из «12%» или «0.12».
   * - "12%" → 0.12
   * - "0.12" → 0.12
   * - "12"  → 0.12 (эвристика: если число > 1, считаем процентами)
   */
  function parsePercentFraction(raw) {
    if (raw == null || raw === "") return 0;
    const t = String(raw).trim();
    const n = parseFloat(t.replace("%", ""));
    if (!Number.isFinite(n) || n <= 0) return 0;
    return t.includes("%") || n > 1 ? n / 100 : n;
  }

  /**
   * Токен SL[…]/TP[…]:
   * - "1%" → { mode:"pct", value:0.01 }
   * - "2ATR" / "2×ATR" (в строке часто "2ATR") → { mode:"atr", value:2 }
   */
  function parseSlTpToken(raw) {
    if (!raw) return { mode: null, value: 0 };
    const t = String(raw).trim().toUpperCase();
    if (t.includes("%")) {
      const pct = parsePercentFraction(raw);
      return pct > 0 ? { mode: "pct", value: pct } : { mode: null, value: 0 };
    }
    const n = parseFloat(t.replace(/ATR/gi, "").replace("×", ""));
    return Number.isFinite(n) && n > 0 ? { mode: "atr", value: n } : { mode: null, value: 0 };
  }

  /**
   * Разбор SL/TP из строки.
   * Возвращает сразу обе модели:
   * - slAtr/tpAtr — ATR-кратность
   * - slPct/tpPct — доля от цены входа
   * И признак slTpMode (если хотя бы один в %, то "pct", иначе "atr").
   */
  function parseSlTp(line) {
    const l = String(line || "");
    const slM = l.match(/SL\[([^\]]+)\]/i);
    const tpM = l.match(/TP\[([^\]]+)\]/i);
    const sl = parseSlTpToken(slM?.[1]);
    const tp = parseSlTpToken(tpM?.[1]);
    const slTpMode = sl.mode === "pct" || tp.mode === "pct" ? "pct" : "atr";
    return {
      slAtr: sl.mode === "atr" ? sl.value : 0,
      tpAtr: tp.mode === "atr" ? tp.value : 0,
      slPct: sl.mode === "pct" ? sl.value : 0,
      tpPct: tp.mode === "pct" ? tp.value : 0,
      slTpMode
    };
  }

  /**
   * Подпрограмма: удаляет `OnFlip(Close)` из выражения, чтобы не мешать разбору `A AND B`.
   * Важно: движок отдельно учитывает факт наличия OnFlip(Close) как флаг поведения.
   */
  function stripOnFlipFromExpr(expr) {
    return String(expr || "").replace(/\s*OnFlip\s*\(\s*Close\s*\)/gi, "").trim();
  }

  /** Факт присутствия `OnFlip(Close)` внутри блока. */
  function exprHasOnFlipClose(expr) {
    return /OnFlip\s*\(\s*Close\s*\)/i.test(String(expr || ""));
  }

  /**
   * Разбор `Regime(...)` из строки.
   * Сейчас парсер вытаскивает только то, что нужно движку:
   * - slopeLb (окно, по которому оцениваем знак наклона)
   * - onFlipClose (режим закрытия на смене знака тренда)
   * - regimeLinLen (длина линрега, если указана)
   *
   * Остальные параметры режима (Entry=..., Dev=...) движок интерпретирует отдельно
   * или они используются только как маркеры в строке.
   */
  function parseRegimeFromLine(raw) {
    const m = String(raw || "").match(/Regime\s*\(\s*([^)]*)\s*\)/i);
    if (!m) return {};
    const map = parseParamsMap(m[1].replace(/,/g, ";"));
    const slopeLb = parseInt(map.SlopeLb || map.slopelb || "3", 10);
    const onFlip = String(map.OnFlip || map.onflip || "").toLowerCase();
    let regimeLinLen = null;
    const lRaw = map.L || map.l;
    if (lRaw != null) {
      const n = parseInt(String(lRaw).replace(/@LR/i, ""), 10);
      if (Number.isFinite(n) && n > 0) regimeLinLen = n;
    }
    return {
      regimeSlopeLb: Number.isFinite(slopeLb) && slopeLb > 0 ? slopeLb : 3,
      onFlipClose: onFlip === "close",
      regimeLinLen
    };
  }

  /**
   * Удаляет из строки декораторы, которые не должны мешать разбору `Op(...)` / `Cl(...)`.
   * Декораторы сами по себе важны для движка, но он считывает их отдельно (или как маркеры).
   */
  function stripDecor(line) {
    return String(line || "")
      .replace(/Strict\([^)]*\)\s*/gi, "")
      .replace(/Regime\([^)]*\)\s*/gi, "")
      .replace(/SmaSpread\s*\([^)]*\)\s*/gi, "")
      .replace(/SmaCorridor\s*\([^)]*\)\s*/gi, "")
      .replace(/OnFlip\([^)]*\)/gi, "")
      .replace(/Note\([^)]*\)/gi, "")
      .replace(/@OBT\s*(\([^)]*\))?\s*/gi, "")
      .trim();
  }

  /**
   * Извлекает все блоки `Tag(Long(...))` / `Tag(Short(...))`, учитывая вложенные скобки.
   * Возвращает: [{ side:"long"|"short", expr:"..." }, ...]
   */
  function extractBlocks(line, tag) {
    const blocks = [];
    const s = String(line || "");
    const scanRe = new RegExp(tag + "\\((Long|Short)\\(", "ig");
    let m = scanRe.exec(s);
    while (m) {
      const side = m[1].toLowerCase();
      let i = m.index + m[0].length;
      let depth = 1;
      const start = i;
      while (i < s.length && depth > 0) {
        if (s[i] === "(") depth++;
        else if (s[i] === ")") depth--;
        i++;
      }
      const inner = s.slice(start, i - 1);
      blocks.push({ side, expr: inner.trim() });
      scanRe.lastIndex = i;
      m = scanRe.exec(s);
    }
    return blocks;
  }

  /**
   * Делит выражение по ` AND ` только на верхнем уровне (не внутри скобок).
   * Это важно, потому что атомы имеют вид `KIND(...)(...)`, где внутри скобок могут быть пробелы.
   */
  function splitTopLevelAnd(expr) {
    const parts = [];
    let depth = 0;
    let cur = "";
    const s = String(expr || "");
    for (let i = 0; i < s.length; i++) {
      const ch = s[i];
      if (ch === "(") depth++;
      if (ch === ")") depth--;
      if (depth === 0 && s.slice(i, i + 5).toUpperCase() === " AND ") {
        if (cur.trim()) parts.push(cur.trim());
        cur = "";
        i += 4;
        continue;
      }
      cur += ch;
    }
    if (cur.trim()) parts.push(cur.trim());
    return parts;
  }

  /**
   * Разбор атома условия: `<kind>(<params>)(<signal>)`.
   * Возвращает:
   * - kind: нижний регистр (например, "sma", "linreg", "rand")
   * - params: сырой текст параметров внутри первой пары скобок
   * - signal: сырой текст сигнала (внутри второй пары скобок)
   */
  function parseAtom(atomStr) {
    const s = String(atomStr || "").trim();
    const idx = s.indexOf(")(");
    if (idx < 0) return null;
    const namePart = s.slice(0, idx + 1);
    const sigPart = s.slice(idx + 2);
    const m = namePart.match(/^(\w+)\((.*)\)$/);
    if (!m) return null;
    return { kind: m[1].toLowerCase(), params: m[2], signal: sigPart.replace(/^\(|\)$/g, "").trim() };
  }

  /**
   * Разбор параметров (внутри KIND(...)).
   *
   * Поддерживаемые формы:
   * - `L=20;Dev=2;K=2ATR` → { L:"20", Dev:"2", K:"2ATR" }
   * - `20`                → { L:20 }
   * - `14-3-3`            → { K1:14, K2:3, D:3 } (стохастик)
   * - `12,26,9`           → { fast:12, slow:26, signal:9 } (MACD)
   *
   * Возвращаем значения как строки/числа максимально «как есть»:
   * окончательная нормализация делается движком.
   */
  function parseParamsMap(raw) {
    const map = {};
    for (const part of String(raw || "").split(";")) {
      const p = part.trim();
      if (!p) continue;
      if (p.includes("=")) {
        const [k, v] = p.split("=");
        map[k.trim()] = v.trim();
      } else if (/^\d+-\d+-\d+$/.test(p)) {
        const [a, b, c] = p.split("-").map(Number);
        map.K1 = a; map.K2 = b; map.D = c;
      } else if (/^\d+,\d+,\d+$/.test(p)) {
        const [a, b, c] = p.split(",").map(Number);
        map.fast = a; map.slow = b; map.signal = c;
      } else if (/^\d+$/.test(p)) {
        map.L = Number(p);
      }
    }
    return map;
  }

  /**
   * Разбор "1ATR" / "2ATR" / "0.8" в число.
   * Возвращает null для "@SmaCorridor" и прочих плейсхолдеров (они подставляются раньше).
   */
  function parseAtrMultToken(raw) {
    if (raw == null || raw === "") return null;
    const s = String(raw).trim();
    if (!s || s.startsWith("@")) return null;
    const n = parseFloat(s.replace(/ATR/gi, "").replace("×", ""));
    return Number.isFinite(n) ? n : null;
  }

  /**
   * SMA(100;Vol)(Ab|Bl) и SMA(100;Spread=1ATR)(Trend|Anti) → параметры объёмной/коридорной модели.
   * Это «быстрый распознаватель» строк, которые на самом деле описывают не Op/Cl, а SMA-модель.
   */
  function parseSmaModelFromLine(line) {
    const raw = String(line || "");
    const atomRe = /SMA\s*\(\s*([^)]*)\s*\)\s*\(\s*([^)]+)\s*\)/gi;
    let m;
    while ((m = atomRe.exec(raw)) !== null) {
      const paramsRaw = m[1];
      const pm = parseParamsMap(paramsRaw);
      const sigU = m[2].replace(/\s+/g, "").toUpperCase();
      const smaLen = Math.max(
        1,
        Number(pm.L) || (/^\d+/.test(String(paramsRaw).trim()) ? parseInt(paramsRaw, 10) : 3)
      );

      if (/(\bVol\b|Vol=)/i.test(paramsRaw)) {
        const side = sigU === "BL" || sigU === "VOLBL" ? "below" : "above";
        return { model: "spread", smaLen, side };
      }

      const spreadRaw = pm.Spread ?? pm.spread ?? pm.Corridor ?? pm.corridor ?? pm.Band ?? pm.band;
      if (spreadRaw != null && spreadRaw !== "") {
        const corridorAtr = parseAtrMultToken(spreadRaw);
        const mode = sigU === "ANTI" || sigU === "ANTITREND" || sigU.includes("ANTI") ? "anti" : "trend";
        return { model: "corridor", smaLen, mode, corridorAtr };
      }
    }

    const spreadM = raw.match(/SmaSpread\s*\(\s*([^)]*)\s*\)/i);
    if (spreadM) {
      const pm = parseParamsMap(spreadM[1]);
      const smaLen = Math.max(1, Number(pm.L) || 3);
      const sideRaw = String(pm.Side || pm.side || "above").toLowerCase();
      return { model: "spread", smaLen, side: sideRaw === "below" ? "below" : "above" };
    }
    const corrM = raw.match(/SmaCorridor\s*\(\s*([^)]*)\s*\)/i);
    if (corrM) {
      const pm = parseParamsMap(corrM[1]);
      const smaLen = Math.max(1, Number(pm.L) || 3);
      const modeRaw = String(pm.Mode || pm.mode || "trend").toLowerCase();
      const kRaw = pm.K != null && pm.K !== "" ? Number(pm.K) : NaN;
      return {
        model: "corridor",
        smaLen,
        mode: modeRaw === "anti" ? "anti" : "trend",
        corridorAtr: Number.isFinite(kRaw) ? kRaw : null
      };
    }
    return null;
  }

  /**
   * CMA(N;P=…;Vol)(Ab|Bl) → объёмная модель вокруг кастомной SMA.
   * CMA в движке — это «custom moving average» со степенными весами, поэтому здесь дополнительно парсим P.
   */
  function parseCmaModelFromLine(line) {
    const raw = String(line || "");
    const atomRe = /CMA\s*\(\s*([^)]*)\s*\)\s*\(\s*([^)]+)\s*\)/gi;
    let m;
    while ((m = atomRe.exec(raw)) !== null) {
      const paramsRaw = m[1];
      const pm = parseParamsMap(paramsRaw);
      const sigU = m[2].replace(/\s+/g, "").toUpperCase();
      const cmaLen = Math.max(
        1,
        Number(pm.L) || (/^\d+/.test(String(paramsRaw).trim()) ? parseInt(paramsRaw, 10) : 100)
      );
      const powRaw = pm.P ?? pm.Pow ?? pm.pow ?? pm.Deg ?? pm.deg;
      const cmaPow = powRaw != null && powRaw !== "" ? parseFloat(powRaw) : 1;

      if (/(\bVol\b|Vol=)/i.test(paramsRaw)) {
        const side = sigU === "BL" || sigU === "VOLBL" ? "below" : "above";
        return {
          model: "spread",
          cmaLen,
          cmaPow: Number.isFinite(cmaPow) ? cmaPow : 1,
          side
        };
      }
    }
    return null;
  }

  /**
   * Главный разбор Op/Cl-строки в объект «распарсенной логики».
   *
   * Вход: уже «подставленная» строка (в движке заранее заменяются @LR/@SL/...).
   * Выход:
   * - side-настройки (opSide / clSide),
   * - списки атомов по сторонам (opLongAtoms/opShortAtoms и т.д.) БЕЗ фильтра по индикаторам,
   * - sl/tp (как написано в строке),
   * - regime-параметры (частичные),
   * - флаги OnFlip(Close) внутри Cl(...).
   *
   * Дальше движок:
   * - фильтрует атомы по включенным индикаторам,
   * - применяет SL/TP из параметров, если строка не в % режиме,
   * - исполняет симуляцию.
   */
  function parseLogicLine(line) {
    const raw = String(line || "");
    const regime = parseRegimeFromLine(raw);
    const sltp = parseSlTp(raw);
    const body = stripDecor(raw);
    const opBlocks = extractBlocks(body, "Op");
    const clBlocks = extractBlocks(body, "Cl");
    const firstOp = opBlocks[0];
    const firstCl = clBlocks[0];
    const atomsForSide = (blocks, side) => blocks
      .filter((block) => block.side === side)
      .flatMap((block) => splitTopLevelAnd(stripOnFlipFromExpr(block.expr)).map(parseAtom).filter(Boolean));
    const opLongAtoms = atomsForSide(opBlocks, "long");
    const opShortAtoms = atomsForSide(opBlocks, "short");
    const clLongAtoms = atomsForSide(clBlocks, "long");
    const clShortAtoms = atomsForSide(clBlocks, "short");
    const clLongOnFlip = clBlocks.filter((b) => b.side === "long").some((b) => exprHasOnFlipClose(b.expr));
    const clShortOnFlip = clBlocks.filter((b) => b.side === "short").some((b) => exprHasOnFlipClose(b.expr));
    return {
      slAtr: sltp.slAtr,
      tpAtr: sltp.tpAtr,
      slPct: sltp.slPct,
      tpPct: sltp.tpPct,
      slTpMode: sltp.slTpMode,
      opSide: firstOp?.side || "long",
      clSide: firstCl?.side || firstOp?.side || "long",
      opAtoms: [...opLongAtoms, ...opShortAtoms],
      clAtoms: [...clLongAtoms, ...clShortAtoms],
      opLongAtoms,
      opShortAtoms,
      clLongAtoms,
      clShortAtoms,
      regimeSlopeLb: regime.regimeSlopeLb || 3,
      regimeLinLen: regime.regimeLinLen,
      onFlipClose: regime.onFlipClose || clLongOnFlip || clShortOnFlip,
      clLongOnFlip,
      clShortOnFlip
    };
  }

  // Публичный API.
  P.parsePercentFraction = parsePercentFraction;
  P.parseParamsMap = parseParamsMap;
  P.parseRegimeFromLine = parseRegimeFromLine;
  P.parseSlTp = parseSlTp;
  P.parseAtrMultToken = parseAtrMultToken;
  P.parseSmaModelFromLine = parseSmaModelFromLine;
  P.parseCmaModelFromLine = parseCmaModelFromLine;
  P.parseLogicLine = parseLogicLine;

  // Экспорт вспомогательных функций (полезны для отладки и будущих логик/редактора строк).
  P._stripDecor = stripDecor;
  P._extractBlocks = extractBlocks;
  P._splitTopLevelAnd = splitTopLevelAnd;
  P._parseAtom = parseAtom;
  P._exprHasOnFlipClose = exprHasOnFlipClose;
  P._stripOnFlipFromExpr = stripOnFlipFromExpr;
})(typeof window !== "undefined" ? window : globalThis);

