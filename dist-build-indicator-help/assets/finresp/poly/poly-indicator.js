/*
 * Конструктор составных индикаторов (многочлены над рядами SMA/CMA/… и pp).
 * Операции: + −  * (свёртка)  # (покомпонентно)  /#  [n] (сдвиг)  {…; n=a..b} (сумма).
 */
(function (root) {
  "use strict";

  const MARKET_KEYS = new Set(["pp", "oo", "hh", "ll", "vv"]);

  function isFiniteNum(v) {
    return typeof v === "number" && Number.isFinite(v);
  }

  function seriesLen(a) {
    return a?.length || 0;
  }

  function makeSeries(n, fill) {
    const out = new Array(n);
    for (let i = 0; i < n; i++) out[i] = fill;
    return out;
  }

  function zeroSeries(n) {
    return makeSeries(n, 0);
  }

  function scalarSeries(n, v) {
    return makeSeries(n, v);
  }

  function alignLen(a, b) {
    return Math.max(seriesLen(a), seriesLen(b));
  }

  function componentAdd(a, b) {
    const n = alignLen(a, b);
    const out = zeroSeries(n);
    for (let i = 0; i < n; i++) {
      const x = a?.[i];
      const y = b?.[i];
      if (isFiniteNum(x) && isFiniteNum(y)) out[i] = x + y;
      else if (isFiniteNum(x)) out[i] = x;
      else if (isFiniteNum(y)) out[i] = y;
    }
    return out;
  }

  function componentSub(a, b) {
    const n = alignLen(a, b);
    const out = zeroSeries(n);
    for (let i = 0; i < n; i++) {
      const x = a?.[i];
      const y = b?.[i];
      if (isFiniteNum(x) && isFiniteNum(y)) out[i] = x - y;
      else if (isFiniteNum(x)) out[i] = x;
      else if (isFiniteNum(y)) out[i] = -y;
    }
    return out;
  }

  function componentMul(a, b) {
    const n = alignLen(a, b);
    const out = new Array(n);
    for (let i = 0; i < n; i++) {
      const x = a?.[i];
      const y = b?.[i];
      out[i] = isFiniteNum(x) && isFiniteNum(y) ? x * y : null;
    }
    return out;
  }

  function componentDiv(a, b) {
    const n = alignLen(a, b);
    const out = new Array(n);
    for (let i = 0; i < n; i++) {
      const x = a?.[i];
      const y = b?.[i];
      if (!isFiniteNum(x) || !isFiniteNum(y) || y === 0) out[i] = null;
      else out[i] = x / y;
    }
    return out;
  }

  function scalarMul(a, k) {
    if (!isFiniteNum(k)) return zeroSeries(seriesLen(a));
    const n = seriesLen(a);
    const out = new Array(n);
    for (let i = 0; i < n; i++) {
      const x = a[i];
      out[i] = isFiniteNum(x) ? x * k : null;
    }
    return out;
  }

  /** Свёртка: (a*b)_k = Σ_{i+j=k} a_i b_j */
  function convolve(a, b) {
    const na = seriesLen(a);
    const nb = seriesLen(b);
    if (!na || !nb) return [];
    const out = new Array(na + nb - 1);
    for (let k = 0; k < out.length; k++) out[k] = null;
    for (let i = 0; i < na; i++) {
      const ai = a[i];
      if (!isFiniteNum(ai)) continue;
      for (let j = 0; j < nb; j++) {
        const bj = b[j];
        if (!isFiniteNum(bj)) continue;
        const k = i + j;
        const prev = out[k];
        out[k] = isFiniteNum(prev) ? prev + ai * bj : ai * bj;
      }
    }
    return out;
  }

  /** Сдвиг вправо на n баров: out[t] = in[t-n] */
  function shiftRight(a, n) {
    const shift = Math.max(0, Math.trunc(n));
    const len = seriesLen(a);
    if (!len) return [];
    const out = new Array(len);
    for (let t = 0; t < len; t++) {
      const src = t - shift;
      out[t] = src >= 0 ? a[src] : null;
    }
    return out;
  }

  function polyFromCoeffs(coeffs, n) {
    const out = zeroSeries(n);
    for (let i = 0; i < coeffs.length; i++) {
      if (isFiniteNum(coeffs[i])) out[i] = coeffs[i];
    }
    return out;
  }

  function trimErrors(errors) {
    return (errors || []).filter(Boolean);
  }

  /** Лексер: токены выражения конструктора. */
  function tokenizeFormula(src) {
    const s = String(src || "");
    const tokens = [];
    let i = 0;
    const push = (type, value) => tokens.push({ type, value, pos: i });

    while (i < s.length) {
      const ch = s[i];
      if (/\s/.test(ch)) { i += 1; continue; }
      if (ch === "#" && s[i + 1] === "/") {
        push("op", "/#");
        i += 2;
        continue;
      }
      if (ch === "." && s[i + 1] === ".") {
        push("op", "..");
        i += 2;
        continue;
      }
      if ("+-*#/,;[](){}=".includes(ch)) {
        push(ch === "(" ? "lp" : ch === ")" ? "rp" : ch === "{" ? "lbrace" : ch === "}" ? "rbrace"
          : ch === "[" ? "lbrack" : ch === "]" ? "rbrack" : "op", ch);
        i += 1;
        continue;
      }
      if (/[0-9]/.test(ch)) {
        let j = i;
        while (j < s.length && /[0-9]/.test(s[j])) j += 1;
        if (s[j] === "." && /[0-9]/.test(s[j + 1] || "")) {
          j += 1;
          while (j < s.length && /[0-9]/.test(s[j])) j += 1;
        }
        const raw = s.slice(i, j);
        const num = parseFloat(raw.replace(",", "."));
        if (!Number.isFinite(num)) return { ok: false, error: `Число «${raw}» не распознано`, tokens: [] };
        push("num", num);
        i = j;
        continue;
      }
      if (/[A-Za-z_]/.test(ch)) {
        let j = i;
        while (j < s.length && /[A-Za-z0-9_]/.test(s[j])) j += 1;
        push("ident", s.slice(i, j));
        i = j;
        continue;
      }
      if (ch === "." && /[0-9]/.test(s[i + 1] || "")) {
        let j = i + 1;
        while (j < s.length && /[0-9]/.test(s[j])) j += 1;
        const num = parseFloat(s.slice(i, j).replace(",", "."));
        push("num", num);
        i = j;
        continue;
      }
      return { ok: false, error: `Символ «${ch}» не ожидается (поз. ${i + 1})`, tokens: [] };
    }
    return { ok: true, tokens };
  }

  function parsePrimary(tokens, pos, ctx) {
    const t = tokens[pos];
    if (!t) return { ok: false, error: "Ожидается выражение", pos };

    if (t.type === "num") {
      return { ok: true, node: { type: "scalar", value: t.value }, pos: pos + 1 };
    }

    if (t.type === "ident") {
      const name = t.value;
      const lower = name.toLowerCase();
      if (MARKET_KEYS.has(lower)) {
        return { ok: true, node: { type: "market", key: lower }, pos: pos + 1 };
      }
      const next = tokens[pos + 1];
      if (next?.type === "lp") {
        const closeIdx = findMatchingParen(tokens, pos + 1);
        if (closeIdx < 0) return { ok: false, error: `Нет «)» после ${name}(`, pos };
        const inner = tokens.slice(pos + 2, closeIdx).map((x) => x.value).join("");
        const kind = ctx.resolveKind ? ctx.resolveKind(name) : lower;
        if (!kind) return { ok: false, error: `Неизвестный индикатор «${name}»`, pos };
        return {
          ok: true,
          node: { type: "indicator", kind, params: inner, label: `${name}(${inner})` },
          pos: closeIdx + 1
        };
      }
      if (ctx.resolveCustom && ctx.resolveCustom(name)) {
        const ci = ctx.resolveCustom(name);
        return { ok: true, node: { type: "custom", id: ci.id, name: ci.name, formula: ci.formula }, pos: pos + 1 };
      }
      return { ok: false, error: `«${name}» — ожидается Индикатор(параметры) или pp/oo/hh/ll/vv`, pos };
    }

    if (t.type === "lp") {
      const inner = parseExpr(tokens, pos + 1, ctx);
      if (!inner.ok) return inner;
      if (tokens[inner.pos]?.type !== "rp") return { ok: false, error: "Ожидается «)»", pos: inner.pos };
      return { ok: true, node: inner.node, pos: inner.pos + 1 };
    }

    if (t.type === "lbrace") {
      return parseBrace(tokens, pos, ctx);
    }

    if (t.type === "lbrack") {
      const numTok = tokens[pos + 1];
      if (numTok?.type !== "num") return { ok: false, error: "В [ ] ожидается число сдвига", pos: pos + 1 };
      if (tokens[pos + 2]?.type !== "rbrack") return { ok: false, error: "Ожидается «]»", pos: pos + 2 };
      return { ok: true, node: { type: "shiftKernel", shift: numTok.value }, pos: pos + 3 };
    }

    return { ok: false, error: "Ожидается число, индикатор или «(»", pos };
  }

  function findMatchingParen(tokens, openPos) {
    let depth = 0;
    for (let i = openPos; i < tokens.length; i++) {
      if (tokens[i].type === "lp") depth += 1;
      else if (tokens[i].type === "rp") {
        depth -= 1;
        if (depth === 0) return i;
      }
    }
    return -1;
  }

  function parseBrace(tokens, pos, ctx) {
    const parts = [];
    let i = pos + 1;
    let depth = 1;
    let buf = [];
    const flush = () => {
      const text = buf.map((x) => x.value).join("").trim();
      if (text) parts.push(text);
      buf = [];
    };
    while (i < tokens.length && depth > 0) {
      const t = tokens[i];
      if (t.type === "lbrace") { depth += 1; buf.push(t); i += 1; continue; }
      if (t.type === "rbrace") {
        depth -= 1;
        if (depth === 0) { flush(); i += 1; break; }
        buf.push(t);
        i += 1;
        continue;
      }
      if (depth === 1 && t.type === "op" && t.value === ";") {
        flush();
        i += 1;
        continue;
      }
      buf.push(t);
      i += 1;
    }
    if (depth !== 0) return { ok: false, error: "Нет «}»", pos: i };

    const parseCoeffToken = (raw) => {
      const seg = String(raw || "").trim().replace(",", ".");
      const frac = seg.match(/^([0-9]+(?:\.[0-9]+)?)\s*\/\s*([0-9]+(?:\.[0-9]+)?)$/);
      if (frac) return parseFloat(frac[1]) / parseFloat(frac[2]);
      if (/^[0-9]+(\.[0-9]+)?$/.test(seg)) return parseFloat(seg);
      return null;
    };

    const isRangeSegment = (seg) => {
      const s = String(seg || "").trim();
      return /^([A-Za-z_]\w*)\s*=\s*([0-9]+)\s*\.\.\s*([0-9]+)$/.test(s)
        || /^n0\s*=\s*([0-9]+)$/i.test(s)
        || /^n1\s*=\s*([0-9]+)$/i.test(s);
    };

    const hasRange = parts.slice(1).some(isRangeSegment);
    if (!hasRange) {
      const coeffs = parts.map(parseCoeffToken);
      if (coeffs.length && coeffs.every((c) => Number.isFinite(c))) {
        if (coeffs.length === 1) {
          return { ok: true, node: { type: "scalar", value: coeffs[0] }, pos: i };
        }
        return { ok: true, node: { type: "poly", coeffs }, pos: i };
      }
    }

    let sumRange = null;
    for (let pi = 1; pi < parts.length; pi++) {
      const seg = parts[pi].trim();
      const mRange = seg.match(/^([A-Za-z_]\w*)\s*=\s*([0-9]+)\s*\.\.\s*([0-9]+)$/);
      if (mRange) {
        sumRange = { nVar: mRange[1], nFrom: parseInt(mRange[2], 10), nTo: parseInt(mRange[3], 10) };
        continue;
      }
      const mLo = seg.match(/^n0\s*=\s*([0-9]+)$/i);
      if (mLo) {
        sumRange = sumRange || { nVar: "n", nFrom: null, nTo: null };
        sumRange.nFrom = parseInt(mLo[1], 10);
        continue;
      }
      const mHi = seg.match(/^n1\s*=\s*([0-9]+)$/i);
      if (mHi) {
        sumRange = sumRange || { nVar: "n", nFrom: null, nTo: null };
        sumRange.nTo = parseInt(mHi[1], 10);
        continue;
      }
      return { ok: false, error: `Не разобрано в {…}: «${seg}»`, pos };
    }

    let bodyText = parts[0] || "";
    const nVar = sumRange?.nVar || "n";
    const nFrom = sumRange?.nFrom;
    const nTo = sumRange?.nTo;
    if (nFrom == null || nTo == null) {
      return { ok: false, error: "В {…} для суммы укажите n=1..100 или n0=1; n1=100", pos };
    }
    const subTok = tokenizeFormula(bodyText);
    if (!subTok.ok) return { ok: false, error: subTok.error, pos };
    const subCtx = { ...ctx, sumVar: nVar };
    const subAst = parseExpr(subTok.tokens, 0, subCtx);
    if (!subAst.ok) return subAst;
    return {
      ok: true,
      node: { type: "sum", body: subAst.node, nVar, nFrom, nTo },
      pos: i
    };
  }

  function parseUnary(tokens, pos, ctx) {
    if (tokens[pos]?.type === "op" && tokens[pos].value === "-") {
      const inner = parseUnary(tokens, pos + 1, ctx);
      if (!inner.ok) return inner;
      return { ok: true, node: { type: "unary", op: "-", arg: inner.node }, pos: inner.pos };
    }
    let cur = parsePrimary(tokens, pos, ctx);
    if (!cur.ok) return cur;
    while (tokens[cur.pos]?.type === "lbrack") {
      const numTok = tokens[cur.pos + 1];
      if (numTok?.type !== "num") return { ok: false, error: "В [ ] ожидается число", pos: cur.pos + 1 };
      if (tokens[cur.pos + 2]?.type !== "rbrack") return { ok: false, error: "Ожидается «]»", pos: cur.pos + 2 };
      cur = {
        ok: true,
        node: { type: "shift", shift: numTok.value, body: cur.node },
        pos: cur.pos + 3
      };
    }
    return cur;
  }

  function parseMul(tokens, pos, ctx) {
    let cur = parseUnary(tokens, pos, ctx);
    if (!cur.ok) return cur;
    while (tokens[cur.pos]?.type === "op" && ["*", "#", "/#"].includes(tokens[cur.pos].value)) {
      const op = tokens[cur.pos].value;
      const rhs = parseUnary(tokens, cur.pos + 1, ctx);
      if (!rhs.ok) return rhs;
      cur = { ok: true, node: { type: "binop", op, left: cur.node, right: rhs.node }, pos: rhs.pos };
    }
    return cur;
  }

  function parseExpr(tokens, pos, ctx) {
    let cur = parseMul(tokens, pos, ctx);
    if (!cur.ok) return cur;
    while (tokens[cur.pos]?.type === "op" && ["+", "-"].includes(tokens[cur.pos].value)) {
      const op = tokens[cur.pos].value;
      const rhs = parseMul(tokens, cur.pos + 1, ctx);
      if (!rhs.ok) return rhs;
      cur = { ok: true, node: { type: "binop", op, left: cur.node, right: rhs.node }, pos: rhs.pos };
    }
    if (cur.pos < tokens.length) {
      return { ok: false, error: `Лишний текст у поз. ${cur.pos + 1}`, pos: cur.pos };
    }
    return cur;
  }

  function parsePolyIndicatorFormula(text, ctx) {
    const tok = tokenizeFormula(text);
    if (!tok.ok) return { ok: false, errors: [tok.error] };
    if (!tok.tokens.length) return { ok: false, errors: ["Пустая формула"] };
    const ast = parseExpr(tok.tokens, 0, ctx || {});
    if (!ast.ok) return { ok: false, errors: [ast.error] };
    return { ok: true, ast: ast.node, errors: [] };
  }

  function substParams(params, varName, value) {
    return String(params || "").replace(new RegExp(`\\b${varName}\\b`, "g"), String(value));
  }

  function evalNode(node, cache, ctx) {
    const n = cache?.candles?.length || 0;
    if (!n) return [];

    switch (node.type) {
      case "scalar":
        return scalarSeries(n, node.value);
      case "poly":
        return polyFromCoeffs(node.coeffs, n);
      case "market": {
        const key = node.key;
        const out = new Array(n);
        for (let i = 0; i < n; i++) {
          const c = cache.candles[i];
          if (key === "pp") out[i] = c?.close;
          else if (key === "oo") out[i] = c?.open ?? c?.close;
          else if (key === "hh") out[i] = c?.high ?? c?.close;
          else if (key === "ll") out[i] = c?.low ?? c?.close;
          else if (key === "vv") out[i] = c?.volume ?? 0;
          else out[i] = null;
        }
        return out;
      }
      case "indicator":
        return ctx.indicatorSeries(cache, node.kind, node.params);
      case "custom":
        return ctx.evalCustomFormula(cache, node.formula, ctx);
      case "unary":
        if (node.op === "-") return scalarMul(evalNode(node.arg, cache, ctx), -1);
        return zeroSeries(n);
      case "binop": {
        const L = evalNode(node.left, cache, ctx);
        const R = evalNode(node.right, cache, ctx);
        if (node.op === "+") return componentAdd(L, R);
        if (node.op === "-") return componentSub(L, R);
        if (node.op === "#") return componentMul(L, R);
        if (node.op === "/#") return componentDiv(L, R);
        if (node.op === "*") return convolve(L, R);
        return zeroSeries(n);
      }
      case "shift": {
        const body = evalNode(node.body, cache, ctx);
        return shiftRight(body, node.shift);
      }
      case "shiftKernel": {
        const out = zeroSeries(n);
        const at = Math.trunc(node.shift);
        if (at >= 0 && at < n) out[at] = 1;
        return out;
      }
      case "sum": {
        let acc = zeroSeries(n);
        const step = node.nFrom <= node.nTo ? 1 : -1;
        for (let nv = node.nFrom; step > 0 ? nv <= node.nTo : nv >= node.nTo; nv += step) {
          const subCtx = {
            ...ctx,
            sumVarValue: nv,
            paramSubst: (params) => substParams(params, node.nVar, nv)
          };
          const part = evalNode(node.body, cache, subCtx);
          acc = componentAdd(acc, part);
        }
        return acc;
      }
      default:
        return zeroSeries(n);
    }
  }

  function defaultIndicatorSeries(cache, kind, paramsRaw, ctx) {
    const params = ctx?.paramSubst ? ctx.paramSubst(paramsRaw) : paramsRaw;
    const pm = ctx.parseParamsMap ? ctx.parseParamsMap(params) : {};
    const idxSeries = (getter) => {
      const n = cache.candles.length;
      const src = getter();
      const out = new Array(n);
      for (let i = 0; i < n; i++) out[i] = src?.[i] ?? null;
      return out;
    };
    const k = String(kind || "").toLowerCase();
    if (k === "sma") {
      const len = pm.L || parseInt(params, 10) || 100;
      return idxSeries(() => cache.sma(len));
    }
    if (k === "cma") {
      const len = pm.L || parseInt(params, 10) || 100;
      const powRaw = pm.P ?? pm.Pow ?? pm.pow;
      const pow = powRaw != null && powRaw !== "" ? parseFloat(powRaw) : 1;
      return idxSeries(() => cache.cma(len, Number.isFinite(pow) ? pow : 1));
    }
    if (k === "linreg") {
      const len = pm.L || parseInt(params, 10) || 20;
      const dev = parseFloat(pm.Dev || pm.dev || "2");
      return idxSeries(() => cache.linreg(len, dev).center);
    }
    if (k === "bollinger") {
      const len = pm.L || parseInt(params, 10) || 20;
      const dev = parseFloat(pm.Dev || pm.dev || "2");
      return idxSeries(() => cache.bollinger(len, dev).center);
    }
    if (k === "vwap") return idxSeries(() => cache.vwap());
    if (k === "momentum" || k === "mom") {
      const len = pm.L || parseInt(params, 10) || 10;
      return idxSeries(() => cache.momentum(len));
    }
    if (k === "atr") {
      const len = pm.L || parseInt(params, 10) || 14;
      return idxSeries(() => cache.atr(len));
    }
    if (k === "cci") {
      const len = pm.L || parseInt(params, 10) || 20;
      return idxSeries(() => cache.cci(len));
    }
    if (k === "macd") {
      const fast = pm.fast || 12;
      const slow = pm.slow || 26;
      const sig = pm.signal || 9;
      return idxSeries(() => cache.macd(fast, slow, sig).macd);
    }
    if (k === "stoch") {
      const k1 = pm.K1 || 14;
      const k2 = pm.K2 || 3;
      const d = pm.D || 3;
      return idxSeries(() => cache.stoch(k1, k2, d).k);
    }
    return zeroSeries(cache.candles.length);
  }

  function evalPolyIndicatorSeries(ast, cache, options) {
    const opts = options || {};
    const ctx = {
      parseParamsMap: opts.parseParamsMap,
      indicatorSeries: (c, kind, params) => {
        const sub = ctx.paramSubst ? ctx.paramSubst(params) : params;
        if (opts.indicatorSeries) return opts.indicatorSeries(c, kind, sub, ctx);
        return defaultIndicatorSeries(c, kind, sub, ctx);
      },
      evalCustomFormula: (c, formula) => {
        if (opts.evalCustomFormula) return opts.evalCustomFormula(c, formula);
        return zeroSeries(c?.candles?.length || 0);
      },
      resolveKind: opts.resolveKind,
      resolveCustom: opts.resolveCustom,
      paramSubst: (p) => p
    };
    return evalNode(ast, cache, ctx);
  }

  function validatePolyIndicatorFormula(text, options) {
    const opts = options || {};
    const parsed = parsePolyIndicatorFormula(text, {
      resolveKind: opts.resolveKind,
      resolveCustom: opts.resolveCustom
    });
    return parsed;
  }

  const EXAMPLE_PLACEHOLDER = [
    "# Составной индикатор — пример (удалите лишнее, задайте имя выше)",
    "SMA(20) - SMA(50)",
    "pp * {1/20;1/20;1/20;1/20;1/20;1/20;1/20;1/20;1/20;1/20;1/20;1/20;1/20;1/20;1/20;1/20;1/20;1/20;1/20;1/20}",
    "(pp - SMA(20)) # 2",
    "[5] * pp",
    "{ SMA(n); n=5..30 }",
    "{1; n=1..100} * {1/20;1/20;1/20;1/20;1/20;1/20;1/20;1/20;1/20;1/20;1/20;1/20;1/20;1/20;1/20;1/20;1/20;1/20;1/20;1/20}"
  ].join("\n");

  root.MultiLogicFinrespPoly = {
    parsePolyIndicatorFormula,
    validatePolyIndicatorFormula,
    evalPolyIndicatorSeries,
    EXAMPLE_PLACEHOLDER,
    MARKET_KEYS
  };
})(typeof window !== "undefined" ? window : globalThis);
