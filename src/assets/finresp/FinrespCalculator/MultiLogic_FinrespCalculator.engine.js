/*
 * MultiLogic FINRESP calculator engine (browser). No persistence.
 *
 * Термины (как в Pascal/VBA и в этом файле):
 *   — «функция» — подпрограмма, возвращающая значение (return);
 *   — «процедура» — подпрограмма без результата (void); в JS тоже function, но без return.
 *
 * Основные блоки:
 *   parseLogicLine / resolveLogicSpec — разбор строки Op/Cl и сборка spec для симуляции;
 *   simulateLogicLine — одна логика L1…L5 на свечах;
 *   simulateMultiLogicStack — несколько L-логик по приоритету (как слоты MultiLogic);
 *   runMulti / runMultiAsync — портфель инструментов + portfolio stopper;
 *   loadManyDetailed — загрузка свечей MOEX.
 */
(function (root) {
  "use strict";

  // === Indicators registry (loaded from FinrespCalculator/indicators/*.js before this file) ===
  const IND = root.MultiLogicFinrespIndicators || {};
  function requireIndFn(name) {
    const fn = IND[name];
    if (typeof fn !== "function") {
      throw new Error(`Indicator function missing: ${name}. Load FinrespCalculator/indicators/*.js before engine.js`);
    }
    return fn;
  }

  const DEFAULT_PARAMS = { LR: 20, Strict: 3, SL: 2, TP: 6, slTpAtrLen: 14, smaCorridorAtr: 1, LinK: 2, CmaLen: 100, CmaPow: 1, Reverse: false };
  /** Портфельный stop-loss/take-profit по equity и ATR (defaults). */
  const DEFAULT_STOPPER = {
    useSl: false,
    useTp: false,
    slMult: 2,
    tpMult: 10,
    atrLen: 14,
    refEquity: 0
  };
  const DEFAULT_VOLUME = {
    volumeType: "Deposit percent",
    volume: 10,
    deposit: 1000000,
    maxPositions: 10,
    commissionPct: 0
  };
  const DEFAULT_COMMISSION = { type: "Percent", value: 0.02 };

  // === Комиссия и объём сделки ===

  /** Нормализация настроек комиссии (None/Percent/OneLotFix). */
  function normalizeCommission(cfg) {
    const c = cfg || DEFAULT_COMMISSION;
    const type = c.type === "OneLotFix" || c.type === "Percent" ? c.type : "None";
    const value = Math.max(0, Number(c.value) || 0);
    if (type === "None" || value <= 0) return { type: "None", value: 0 };
    return { type, value };
  }

  /** Комиссия одной сделки по объёму, цене и типу. */
  function tradeCommission(volume, price, commissionCfg) {
    const cfg = normalizeCommission(commissionCfg);
    const vol = Math.abs(Number(volume) || 0);
    const px = Math.max(0, Number(price) || 0);
    if (vol <= 0 || px <= 0) return 0;
    if (cfg.type === "Percent") return vol * px * (cfg.value / 100);
    if (cfg.type === "OneLotFix") return vol * cfg.value;
    return 0;
  }

  const INDICATOR_OPTIONS = Object.freeze([
    { key: "sma", label: "SMA" },
    { key: "cma", label: "CMA" },
    { key: "atr", label: "ATR" },
    { key: "stoch", label: "Stoch" },
    { key: "totstoch", label: "TotStoch" },
    { key: "linreg", label: "LinReg" },
    { key: "macd", label: "MACD" },
    { key: "cci", label: "CCI" },
    { key: "bollinger", label: "Bollinger" },
    { key: "momentum", label: "Momentum" },
    { key: "vwap", label: "VWAP" },
    { key: "rand", label: "Rand" }
  ]);
  const INDICATOR_KEYS = INDICATOR_OPTIONS.map((x) => x.key);
  const INDICATOR_KEY_SET = new Set(INDICATOR_KEYS);

  const DEFAULT_STOCK_TICKERS_RAW =
    "AFLT, ALRS, AFKS, BSPB, CHMF, FEES, GAZP, GMKN, HYDR, IRAO, LKOH, MAGN, MOEX, MTSS, MTLRP, "
    + "NVTK, NLMK, PLZL, PIKK, PHOR, ROSN, RUAL, RTKMP, SBER, SBERP, SNGSP, SNGS, TATN, TATNP, UPRO, VTBR";

  const DEFAULT_FUTURES_PREFIXES_RAW =
    "Si,USDRUBF,Eu,EURRUBF,CNY,MX,MM,IMOEXF,RI,BR,BRM,CL,NG,NGM,GD,GLDRUBF,SV,PT,PD,CU,SR,GZ,LK,RN,NK,GN,TT,VB,SN,SG,RL";

  const MOEX_FUTURES_PREFIX_ALIASES = {
    CNY: ["CR", "CNYRUBF"],
    SI: ["Si", "SV", "SILV"],
    RUAL: ["RU"]
  };

  /** Разбор строки/времени/ключа: `parseTickerPrefixes`. */
  function parseTickerPrefixes(raw) {
    const result = [];
    const seen = new Set();
    for (const part of String(raw || "").split(",")) {
      const p = part.trim();
      if (!p) continue;
      const key = p.toUpperCase();
      if (seen.has(key)) continue;
      seen.add(key);
      result.push(p);
    }
    return result;
  }

  /** Подпрограмма `tryExtractMoexFortsSeriesBase`. */
  function tryExtractMoexFortsSeriesBase(ticker) {
    if (ticker.length < 3) return "";
    const len = ticker.length;
    const monthCh = ticker[len - 2];
    const yearCh = ticker[len - 1];
    if (!/[A-Za-z]/.test(monthCh) || !/\d/.test(yearCh)) return "";
    const basePart = ticker.substring(0, len - 2);
    if (!basePart.length) return "";
    for (let i = 0; i < basePart.length; i++) {
      if (!/[A-Za-z]/.test(basePart[i])) return "";
    }
    return basePart;
  }

  /** Подпрограмма `extractFuturesLetterRoot`. */
  function extractFuturesLetterRoot(ticker) {
    const t = String(ticker || "").trim();
    if (!t) return "";
    const dash = t.indexOf("-");
    if (dash > 0) return t.substring(0, dash).trim();
    const dot = t.indexOf(".");
    if (dot > 0) {
      let allLetters = true;
      for (let k = 0; k < dot; k++) {
        if (!/[A-Za-z]/.test(t[k])) { allLetters = false; break; }
      }
      if (allLetters) return t.substring(0, dot).trim();
    }
    const fortBase = tryExtractMoexFortsSeriesBase(t);
    if (fortBase) return fortBase;
    let end = 0;
    while (end < t.length && /[A-Za-z]/.test(t[end])) end++;
    return end > 0 ? t.substring(0, end) : "";
  }

  /** Подпрограмма `expandPrefixWithMoexAliases`. */
  function expandPrefixWithMoexAliases(userPrefix) {
    const p = String(userPrefix || "").trim();
    if (!p) return [];
    const out = [p];
    const aliases = MOEX_FUTURES_PREFIX_ALIASES[p.toUpperCase()];
    if (aliases) out.push(...aliases);
    return out;
  }

  /** Подпрограмма `rootMatchesExpandedPrefix`. */
  function rootMatchesExpandedPrefix(root, expandedPrefix) {
    if (!root || !expandedPrefix) return false;
    const r = root;
    const e = expandedPrefix;
    if (r.toUpperCase() === e.toUpperCase()) return true;
    if (e.length <= r.length && r.toUpperCase().startsWith(e.toUpperCase())) return true;
    if (r.length <= e.length && e.toUpperCase().startsWith(r.toUpperCase())) return true;
    return false;
  }

  /** Подпрограмма `stockTickerMatches`. */
  function stockTickerMatches(secid, prefixes) {
    const name = String(secid || "").trim().toUpperCase();
    return prefixes.some((p) => name === String(p).trim().toUpperCase());
  }

  /** Подпрограмма `normMoexDate`. */
  function normMoexDate(value) {
    if (!value) return "";
    return String(value).slice(0, 10);
  }

  /** Проверка булева условия: `isPerpetualFuture`. */
  function isPerpetualFuture(secid) {
    const s = String(secid || "").trim().toUpperCase();
    return /RUBF$/.test(s) || s === "IMOEXF";
  }

  /** Подпрограмма `futuresMatchesCalcPeriod`. */
  function futuresMatchesCalcPeriod(sec, from, till) {
    const last = normMoexDate(sec.LASTTRADEDATE);
    const first = normMoexDate(sec.FIRSTTRADEDATE);
    if (isPerpetualFuture(sec.SECID)) {
      return !last || last >= from;
    }
    if (last && last < from) return false;
    if (first && first > till) return false;
    if (first && first < from) return false;
    return true;
  }

  /** Подпрограмма `futuresTickerMatches`. */
  function futuresTickerMatches(secid, prefixes) {
    const normalized = String(secid || "").trim();
    const root = extractFuturesLetterRoot(normalized);
    if (!root && !normalized) return false;
    for (const p of prefixes) {
      for (const expanded of expandPrefixWithMoexAliases(p)) {
        if (!expanded) continue;
        if (root && rootMatchesExpandedPrefix(root, expanded)) return true;
        if (expanded.length <= normalized.length
          && normalized.toUpperCase().startsWith(expanded.toUpperCase())) return true;
        if (expanded.length >= 2
          && normalized.toUpperCase().includes(expanded.toUpperCase())) return true;
      }
    }
    return false;
  }

  const LOG_REG = root.MultiLogicFinrespLogics;
  if (!LOG_REG || typeof LOG_REG.defaultLines !== "function") {
    throw new Error("MultiLogicFinrespLogics не загружен — подключите logics/*.js перед engine.js");
  }
  const DEFAULT_LOGIC_LINES = LOG_REG.defaultLines();
  const BUILTIN_META = LOG_REG.builtinMeta();

  const PARSER = root.MultiLogicFinrespParser;
  if (!PARSER || typeof PARSER.parseLogicLine !== "function") {
    throw new Error("MultiLogicFinrespParser не загружен — подключите logics/parser.js перед engine.js");
  }

  const ORDER_BOOK_TREND_TOKEN = "@OBT";
  const DEFAULT_OB_IMBALANCE = 0.12;

  /** Подпрограмма `substituteParams`. */
  function substituteParams(line, params) {
    const p = { ...DEFAULT_PARAMS, ...params };
    return String(line || "")
      .replace(/@LR/g, String(p.LR))
      .replace(/@Strict/g, String(p.Strict))
      .replace(/@SL/g, String(p.SL))
      .replace(/@TP/g, String(p.TP))
      .replace(/@SmaCorridor/g, String(p.smaCorridorAtr ?? DEFAULT_PARAMS.smaCorridorAtr))
      .replace(/@CmaLen/g, String(p.CmaLen ?? DEFAULT_PARAMS.CmaLen))
      .replace(/@CmaPow/g, String(p.CmaPow ?? DEFAULT_PARAMS.CmaPow))
      .replace(/@K/g, String(p.LinK ?? DEFAULT_PARAMS.LinK));
  }

  /** Логика FINRESP: `logicUsesObTrend`. */
  function logicUsesObTrend(line) {
    return /\B@OBT\b/i.test(String(line || ""));
  }

  /** trend | anti | notrend — по Regime/маркерам в строке логики. */
  function detectObTrendMode(line, logicKey) {
    const l = String(line || "");
    if (/@OBT\s*\(\s*anti\s*\)/i.test(l) || /Entry=FlatOnly/i.test(l)) return "anti";
    if (/@OBT\s*\(\s*flat\s*\)/i.test(l) || String(logicKey || "") === "L4" || /боковик/i.test(l)) return "notrend";
    return "trend";
  }

  /** Подпрограмма `sumOrderBookLevels`. */
  function sumOrderBookLevels(ob, depth) {
    const d = Math.max(1, Math.min(+(depth || 0) || 5, 20));
    let bidVol = 0;
    let askVol = 0;
    for (const b of (ob?.bids || []).slice(0, d)) bidVol += Math.max(0, +(b?.quantity || 0));
    for (const a of (ob?.asks || []).slice(0, d)) askVol += Math.max(0, +(a?.quantity || 0));
    return { bidVol, askVol, total: bidVol + askVol };
  }

  /** Подпрограмма `evaluateOrderBookTrend`. */
  function evaluateOrderBookTrend(ob, tradeSide, mode, minImb) {
    const thr = Number.isFinite(minImb) ? minImb : DEFAULT_OB_IMBALANCE;
    const { bidVol, askVol, total } = sumOrderBookLevels(ob, 5);
    if (total < 1) {
      return { ok: false, imb: 0, mode, bidVol, askVol, reason: "пустой стакан" };
    }
    const imb = (bidVol - askVol) / total;
    const buy = tradeSide === "buy";
    if (mode === "anti") {
      const ok = buy ? imb <= -thr : imb >= thr;
      return {
        ok,
        imb,
        mode,
        bidVol,
        askVol,
        reason: ok ? "анти-тренд по стакану" : `imb=${imb.toFixed(3)} (нужно ${buy ? "≤" : "≥"}${buy ? -thr : thr})`
      };
    }
    if (mode === "notrend") {
      const ok = Math.abs(imb) < thr;
      return {
        ok,
        imb,
        mode,
        bidVol,
        askVol,
        reason: ok ? "боковик по стакану" : `|imb|=${Math.abs(imb).toFixed(3)} (нужно <${thr})`
      };
    }
    const ok = buy ? imb >= thr : imb <= -thr;
    return {
      ok,
      imb,
      mode,
      bidVol,
      askVol,
      reason: ok ? "тренд по стакану" : `imb=${imb.toFixed(3)} (нужно ${buy ? "≥" : "≤"}${buy ? thr : -thr})`
    };
  }

  /** Подпрограмма `stripOnFlipFromExpr`. */
  function stripOnFlipFromExpr(expr) {
    return String(expr || "").replace(/\s*OnFlip\s*\(\s*Close\s*\)/gi, "").trim();
  }

  /** Подпрограмма `exprHasOnFlipClose`. */
  function exprHasOnFlipClose(expr) {
    return /OnFlip\s*\(\s*Close\s*\)/i.test(String(expr || ""));
  }

  /** Подпрограмма `parseRegimeFromLine`. */
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

  /** Подпрограмма `parseLinRegK`. */
  function parseLinRegK(pm, params) {
    const kRaw = pm.K ?? pm.k;
    if (kRaw != null) {
      const n = parseFloat(String(kRaw).replace(/ATR/i, "").trim());
      if (Number.isFinite(n) && n > 0) return n;
    }
    const p = params || DEFAULT_PARAMS;
    return Number(p.LinK ?? DEFAULT_PARAMS.LinK) || 2;
  }

  /** Подпрограмма `parseLinRegAtrLen`. */
  function parseLinRegAtrLen(pm) {
    const n = parseInt(pm.AtrL || pm.atrl || pm.Atr || "14", 10);
    return Number.isFinite(n) && n >= 2 ? n : 14;
  }

  /** Подпрограмма `linRegSlopeSign`. */
  function linRegSlopeSign(cache, len, idx, slopeLb) {
    const lr = cache.linreg(len, 2);
    const lb = Math.max(1, slopeLb || 3);
    const c1 = lr.center[idx];
    const c0 = lr.center[idx - lb];
    if (c1 == null || c0 == null) return 0;
    if (c1 > c0) return 1;
    if (c1 < c0) return -1;
    return 0;
  }

  /** Подпрограмма `stripDecor`. */
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

  /** Доля из «12%» или «0.12». */
  function parsePercentFraction(raw) {
    if (raw == null || raw === "") return 0;
    const t = String(raw).trim();
    const n = parseFloat(t.replace("%", ""));
    if (!Number.isFinite(n) || n <= 0) return 0;
    return t.includes("%") || n > 1 ? n / 100 : n;
  }

  /** Токен SL[…]/TP[…]: ×ATR или позиционный %. */
  function parseSlTpToken(raw) {
    if (!raw) return { mode: null, value: 0 };
    const t = String(raw).trim().toUpperCase();
    if (t.includes("%")) {
      const pct = parsePercentFraction(raw);
      return pct > 0 ? { mode: "pct", value: pct } : { mode: null, value: 0 };
    }
    const n = parseFloat(t.replace(/ATR/gi, ""));
    return Number.isFinite(n) && n > 0 ? { mode: "atr", value: n } : { mode: null, value: 0 };
  }

  /** Разбор строки/времени/ключа: `parseSlTp`. */
  function parseSlTp(line) {
    const slM = line.match(/SL\[([^\]]+)\]/i);
    const tpM = line.match(/TP\[([^\]]+)\]/i);
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

  /** Проверка позиционного SL/TP: ATR-кратность и/или % от цены входа. */
  function checkPositionSlTp(pos, entryPrice, price, parsed, atrValue) {
    if (!pos || entryPrice == null || !Number.isFinite(price)) return null;
    const slPct = Math.max(0, +parsed?.slPct || 0);
    const tpPct = Math.max(0, +parsed?.tpPct || 0);
    const slAtr = Math.max(0, +parsed?.slAtr || 0);
    const tpAtr = Math.max(0, +parsed?.tpAtr || 0);
    const a = Number.isFinite(atrValue) && atrValue > 0 ? atrValue : null;
    if (pos > 0) {
      if (slPct > 0 && price <= entryPrice * (1 - slPct)) return "sl";
      if (tpPct > 0 && price >= entryPrice * (1 + tpPct)) return "tp";
      if (a != null && slAtr > 0 && price <= entryPrice - slAtr * a) return "sl";
      if (a != null && tpAtr > 0 && price >= entryPrice + tpAtr * a) return "tp";
    } else if (pos < 0) {
      if (slPct > 0 && price >= entryPrice * (1 + slPct)) return "sl";
      if (tpPct > 0 && price <= entryPrice * (1 - tpPct)) return "tp";
      if (a != null && slAtr > 0 && price >= entryPrice + slAtr * a) return "sl";
      if (a != null && tpAtr > 0 && price <= entryPrice - tpAtr * a) return "tp";
    }
    return null;
  }

  function positionStopsEnabled(parsed) {
    if (!parsed) return false;
    return (parsed.slAtr > 0 || parsed.tpAtr > 0 || parsed.slPct > 0 || parsed.tpPct > 0);
  }

  /** Детерминированный [0,1) для Rand на баре (воспроизводимый бэктест). */
  function deterministic01(idx, salt) {
    // Kept for backward compatibility; new path uses indicators/rand.js
    let x = ((idx + 1) * 374761393 + (salt | 0) * 668265263) >>> 0;
    x = Math.imul(x ^ (x >>> 13), 1274126177) >>> 0;
    return (x >>> 0) / 4294967296;
  }

  /** Состояние Rand на баре: попытка входа и сторона long/short. */
  function randBarRoll(cache, idx, pm) {
    const fn = IND.randBarRoll;
    if (typeof fn === "function") return fn(cache, idx, pm);
    // Fallback: legacy local implementation
    if (!cache._randRolls) cache._randRolls = new Map();
    const seed = parseInt(pm.Seed || pm.seed || "0", 10) || 0;
    const pRaw = pm.P ?? pm.p ?? "12%";
    const key = `${idx}|${seed}|${pRaw}`;
    if (!cache._randRolls.has(key)) {
      const p = parsePercentFraction(pRaw);
      const h1 = deterministic01(idx, seed);
      const h2 = deterministic01(idx + 9973, seed + 17);
      cache._randRolls.set(key, { open: h1 < p, long: h2 < 0.5 });
    }
    return cache._randRolls.get(key);
  }

  /** Подпрограмма `extractBlock`. */
  function extractBlock(line, tag) {
    return extractBlocks(line, tag)[0] || null;
  }

  /** Подпрограмма `extractBlocks`. */
  function extractBlocks(line, tag) {
    const blocks = [];
    const scanRe = new RegExp(tag + "\\((Long|Short)\\(", "ig");
    let m = scanRe.exec(line);
    while (m) {
      const side = m[1].toLowerCase();
      let i = m.index + m[0].length;
      let depth = 1;
      const start = i;
      while (i < line.length && depth > 0) {
        if (line[i] === "(") depth++;
        else if (line[i] === ")") depth--;
        i++;
      }
      const inner = line.slice(start, i - 1);
      blocks.push({ side, expr: inner.trim() });
      scanRe.lastIndex = i;
      m = scanRe.exec(line);
    }
    return blocks;
  }

  /** Подпрограмма `splitTopLevelAnd`. */
  function splitTopLevelAnd(expr) {
    const parts = [];
    let depth = 0;
    let cur = "";
    const s = expr || "";
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

  /** Разбор строки/времени/ключа: `parseAtom`. */
  function parseAtom(atomStr) {
    const s = atomStr.trim();
    const idx = s.indexOf(")(");
    if (idx < 0) return null;
    const namePart = s.slice(0, idx + 1);
    const sigPart = s.slice(idx + 2);
    const m = namePart.match(/^(\w+)\((.*)\)$/);
    if (!m) return null;
    return { kind: m[1].toLowerCase(), params: m[2], signal: sigPart.replace(/^\(|\)$/g, "").trim() };
  }

  /** Разбор строки/времени/ключа: `parseParamsMap`. */
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

  /** Подпрограмма `defaultIndicatorSelection`. */
  function defaultIndicatorSelection() {
    const out = {};
    for (const key of INDICATOR_KEYS) out[key] = true;
    return out;
  }

  /** Нормализация входных данных: `normalizeIndicatorSelection`. */
  function normalizeIndicatorSelection(selection) {
    if (selection == null) return defaultIndicatorSelection();
    const out = {};
    for (const key of INDICATOR_KEYS) out[key] = false;
    if (Array.isArray(selection)) {
      for (const key of selection) {
        const k = indicatorKey(key);
        if (INDICATOR_KEY_SET.has(k)) out[k] = true;
      }
      return out;
    }
    if (typeof selection === "string") {
      return normalizeIndicatorSelection(selection.split(",").map((x) => x.trim()));
    }
    if (typeof selection === "object") {
      for (const [key, value] of Object.entries(selection)) {
        const k = indicatorKey(key);
        if (INDICATOR_KEY_SET.has(k)) out[k] = !!value;
      }
      return out;
    }
    return defaultIndicatorSelection();
  }

  /** Включение режима/флага: `enabledIndicatorSet`. */
  function enabledIndicatorSet(selection) {
    const normalized = normalizeIndicatorSelection(selection);
    return new Set(INDICATOR_KEYS.filter((key) => normalized[key]));
  }

  /** Подпрограмма `filterAtomsByIndicators`. */
  function filterAtomsByIndicators(atoms, indicatorSelection) {
    const enabled = enabledIndicatorSet(indicatorSelection);
    return (atoms || []).filter((atom) => {
      const kind = indicatorKey(atom?.kind);
      return !INDICATOR_KEY_SET.has(kind) || enabled.has(kind);
    });
  }

  /** Проверка булева условия: `isIndicatorEnabled`. */
  function isIndicatorEnabled(indicatorSelection, key) {
    return !!normalizeIndicatorSelection(indicatorSelection)[indicatorKey(key)];
  }

  /** Подпрограмма `indicatorKey`. */
  function indicatorKey(kind) {
    const k = String(kind || "").toLowerCase();
    if (k === "bolinger" || k === "boll" || k === "bb" || k === "polenger") return "bollinger";
    if (k === "mom") return "momentum";
    if (k === "vwma") return "vwap";
    if (k === "random") return "rand";
    if (k === "totstoch" || k === "tot-stoch" || k === "tot_stoch" || k === "totalstoch") return "totstoch";
    return k;
  }

  /** Разбор строки Op/Cl в AST/spec для симуляции одной логики. */
  function parseLogicLine(line, params, indicatorSelection) {
    const raw = substituteParams(line, params || DEFAULT_PARAMS);
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
    const opLongAtoms = filterAtomsByIndicators(atomsForSide(opBlocks, "long"), indicatorSelection);
    const opShortAtoms = filterAtomsByIndicators(atomsForSide(opBlocks, "short"), indicatorSelection);
    const clLongAtoms = filterAtomsByIndicators(atomsForSide(clBlocks, "long"), indicatorSelection);
    const clShortAtoms = filterAtomsByIndicators(atomsForSide(clBlocks, "short"), indicatorSelection);
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
      clShortOnFlip,
      indicators: normalizeIndicatorSelection(indicatorSelection)
    };
  }

  /**
   * CMA: взвешенная средняя close.
   * В окне: норм. цена n_i = p_i / Σp; вес w_i = n_i^P / Σn_j^P (Σw_i = 1); CMA = Σ w_i·p_i.
   * P = 0 → равные веса → SMA.
   */
  function cmaSeries(closes, len, power) {
    return requireIndFn("cmaSeries")(closes, len, power);
  }

  /** Подпрограмма `smaSeries`. */
  function smaSeries(closes, len) {
    return requireIndFn("smaSeries")(closes, len);
  }

  /** Подпрограмма `emaSeries`. */
  function emaSeries(values, len) {
    return requireIndFn("emaSeries")(values, len);
  }

  /** Подпрограмма `atrSeries`. */
  function atrSeries(candles, len) {
    return requireIndFn("atrSeries")(candles, len);
  }

  /** Подпрограмма `stochSeries`. */
  function stochSeries(candles, kLen, kSmooth, dSmooth) {
    return requireIndFn("stochSeries")(candles, kLen, kSmooth, dSmooth);
  }

  /** Подпрограмма `linRegSeries`. */
  function linRegSeries(closes, len, devMult) {
    return requireIndFn("linRegSeries")(closes, len, devMult);
  }

  /** LinReg-центр ± K×ATR (канал Parsa / Universal Counter Trend). */
  function linRegAtrSeries(closes, candles, len, kMult, atrLen) {
    return requireIndFn("linRegAtrSeries")(closes, candles, len, kMult, atrLen);
  }

  /** Подпрограмма `bollingerSeries`. */
  function bollingerSeries(closes, len, devMult) {
    return requireIndFn("bollingerSeries")(closes, len, devMult);
  }

  /** Подпрограмма `momentumSeries`. */
  function momentumSeries(closes, len) {
    return requireIndFn("momentumSeries")(closes, len);
  }

  /** Подпрограмма `vwapSeries`. */
  function vwapSeries(candles) {
    return requireIndFn("vwapSeries")(candles);
  }

  /** Подпрограмма `cciSeries`. */
  function cciSeries(candles, len) {
    return requireIndFn("cciSeries")(candles, len);
  }

  /** Подпрограмма `macdSeries`. */
  function macdSeries(closes, fast, slow, signal) {
    return requireIndFn("macdSeries")(closes, fast, slow, signal);
  }

  class IndicatorCache {
    constructor(candles, extras) {
      const ex = extras || {};
      this.candles = candles;
      this.closes = candles.map((c) => c.close);
      this.totCandles = ex.totCandles || candles;
      this._sma = new Map();
      this._cma = new Map();
      this._atr = new Map();
      this._stoch = new Map();
      this._totStoch = new Map();
      this._linreg = new Map();
      this._linregAtr = new Map();
      this._bollinger = new Map();
      this._momentum = new Map();
      this._vwap = new Map();
      this._cci = new Map();
      this._macd = new Map();
      this._randRolls = new Map();
    }
    sma(len) {
      const k = len;
      if (!this._sma.has(k)) this._sma.set(k, smaSeries(this.closes, len));
      return this._sma.get(k);
    }
    cma(len, power) {
      const pow = Number.isFinite(+power) ? +power : 0;
      const key = `${len};${pow}`;
      if (!this._cma.has(key)) this._cma.set(key, cmaSeries(this.closes, len, pow));
      return this._cma.get(key);
    }
    atr(len) {
      if (!this._atr.has(len)) this._atr.set(len, atrSeries(this.candles, len));
      return this._atr.get(len);
    }
    stoch(k1, k2, d) {
      const key = `${k1}-${k2}-${d}`;
      if (!this._stoch.has(key)) this._stoch.set(key, stochSeries(this.candles, k1, k2, d));
      return this._stoch.get(key);
    }
    totStoch(k1, k2, d) {
      const key = `${k1}-${k2}-${d}`;
      if (!this._totStoch.has(key)) {
        const fn = IND.totStochSeries || stochSeries;
        this._totStoch.set(key, fn(this.totCandles, k1, k2, d));
      }
      return this._totStoch.get(key);
    }
    linreg(len, dev) {
      const key = `${len};${dev}`;
      if (!this._linreg.has(key)) this._linreg.set(key, linRegSeries(this.closes, len, dev));
      return this._linreg.get(key);
    }
    linregAtr(len, kMult, atrLen) {
      const key = `${len};${kMult};${atrLen}`;
      if (!this._linregAtr.has(key)) {
        this._linregAtr.set(key, linRegAtrSeries(this.closes, this.candles, len, kMult, atrLen));
      }
      return this._linregAtr.get(key);
    }
    bollinger(len, dev) {
      const key = `${len};${dev}`;
      if (!this._bollinger.has(key)) this._bollinger.set(key, bollingerSeries(this.closes, len, dev));
      return this._bollinger.get(key);
    }
    momentum(len) {
      if (!this._momentum.has(len)) this._momentum.set(len, momentumSeries(this.closes, len));
      return this._momentum.get(len);
    }
    vwap() {
      if (!this._vwap.has("session")) this._vwap.set("session", vwapSeries(this.candles));
      return this._vwap.get("session");
    }
    cci(len) {
      if (!this._cci.has(len)) this._cci.set(len, cciSeries(this.candles, len));
      return this._cci.get(len);
    }
    macd(fast, slow, signal) {
      const key = `${fast},${slow},${signal}`;
      if (!this._macd.has(key)) this._macd.set(key, macdSeries(this.closes, fast, slow, signal));
      return this._macd.get(key);
    }
  }

  /** Подпрограмма `evalThreshold`. */
  function evalThreshold(signal, value, close) {
    const s = signal.replace(/\s+/g, "").toUpperCase();
    const m = s.match(/^(K|CCI|RSI|MOM)(>=|<=|>|<)(-?\d+(?:\.\d+)?)$/);
    if (m) {
      const thr = parseFloat(m[3]);
      switch (m[2]) {
        case ">=": return value >= thr;
        case "<=": return value <= thr;
        case ">": return value > thr;
        case "<": return value < thr;
      }
    }
    if (s === "AB") return close > value;
    if (s === "BL") return close < value;
    return false;
  }

  /** Подпрограмма `evaluateAtom`. */
  function evaluateAtom(atom, cache, idx, posCtx, evalOpts) {
    const c = cache.candles[idx];
    const close = c.close;
    const pm = parseParamsMap(atom.params);
    const sig0 = atom.signal.replace(/\s+/g, "");
    const sig = evalOpts?.reverseSignals ? reverseSignalToken(sig0) : sig0;
    const sigU = sig.toUpperCase();
    const kind = indicatorKey(atom.kind);

    if (kind === "sma") {
      const len = pm.L || parseInt(atom.params, 10) || 100;
      const v = cache.sma(len)[idx];
      if (v == null) return false;
      return evalThreshold(sigU === "AB" ? "AB" : sigU === "BL" ? "BL" : sig, v, close);
    }
    if (kind === "cma") {
      const len = pm.L || parseInt(atom.params, 10) || 100;
      const powRaw = pm.P ?? pm.Pow ?? pm.pow ?? pm.Deg ?? pm.deg;
      const pow = powRaw != null && powRaw !== "" ? parseFloat(powRaw) : 1;
      const v = cache.cma(len, Number.isFinite(pow) ? pow : 1)[idx];
      if (v == null) return false;
      return evalThreshold(sigU === "AB" ? "AB" : sigU === "BL" ? "BL" : sig, v, close);
    }
    if (kind === "atr") {
      const len = pm.L || 14;
      const lb = parseInt(pm.Lb || pm.lb || "5", 10);
      const gr = parseFloat(String(pm.Gr || pm.gr || "3").replace("%", "")) / 100;
      const atr = cache.atr(len);
      const cur = atr[idx];
      const prev = idx >= lb ? atr[idx - lb] : null;
      if (cur == null || prev == null || prev === 0) return false;
      if (sigU === "GROK" || sigU.includes("GROK")) return cur >= prev * (1 + gr);
      return false;
    }
    if (kind === "stoch") {
      const k1 = pm.K1 || 14, k2 = pm.K2 || 3, d = pm.D || 3;
      const st = cache.stoch(k1, k2, d);
      const k = st.k[idx];
      if (k == null) return false;
      return evalThreshold(sig, k, close);
    }
    if (kind === "totstoch") {
      const k1 = pm.K1 || 14, k2 = pm.K2 || 3, d = pm.D || 3;
      const st = cache.totStoch(k1, k2, d);
      const k = st.k[idx];
      if (k == null) return false;
      return evalThreshold(sig, k, close);
    }
    if (kind === "linreg") {
      const len = pm.L || parseInt(atom.params, 10) || 20;
      const kMult = parseLinRegK(pm);
      const atrLen = parseLinRegAtrLen(pm);
      const useAtrBand = pm.K != null || pm.k != null
        || /BLLINK|ABLINK|ABREGK|BLREGK/i.test(sigU)
        || String(pm.Drift || pm.drift || "").toLowerCase() === "regdrift"
        || String(pm.Anchor || pm.anchor || "").toLowerCase() === "open";
      if (useAtrBand) {
        const bands = cache.linregAtr(len, kMult, atrLen);
        const atr = cache.atr(atrLen);
        const a = atr[idx];
        if (sigU === "BLLINK") return bands.down[idx] != null && close <= bands.down[idx];
        if (sigU === "ABLINK") return bands.up[idx] != null && close >= bands.up[idx];
        if (sigU === "ABREGK" || sigU === "BLREGK") {
          if (!posCtx || posCtx.pos === 0 || posCtx.entryBarIdx == null || posCtx.entryMid == null) return false;
          if (a == null) return false;
          const bars = Math.max(0, idx - posCtx.entryBarIdx);
          const drift = (posCtx.entryBeta || 0) * bars;
          if (sigU === "ABREGK") {
            const target = posCtx.entryMid + drift + kMult * a;
            return close >= target;
          }
          const target = posCtx.entryMid - drift - kMult * a;
          return close <= target;
        }
      }
      const dev = parseFloat(pm.Dev || pm.dev || "2");
      const lr = cache.linreg(len, dev);
      if (sigU === "ABUP") return lr.up[idx] != null && close > lr.up[idx];
      if (sigU === "BLLO") return lr.down[idx] != null && close < lr.down[idx];
      if (sigU === "ABLO") return lr.down[idx] != null && close > lr.down[idx];
      if (sigU === "BLUP") return lr.up[idx] != null && close < lr.up[idx];
      if (sigU === "SLOPEUP" || sigU === "CENTERUP") {
        const c0 = lr.center[idx - 1], c1 = lr.center[idx];
        return c0 != null && c1 != null && c1 > c0;
      }
      if (sigU === "SLOPEDN" || sigU === "CENTERDN") {
        const c0 = lr.center[idx - 1], c1 = lr.center[idx];
        return c0 != null && c1 != null && c1 < c0;
      }
      return false;
    }
    if (kind === "bollinger") {
      const len = pm.L || parseInt(atom.params, 10) || 20;
      const dev = parseFloat(pm.Dev || pm.dev || "2");
      const bb = cache.bollinger(len, dev);
      if (sigU === "ABUP") return bb.up[idx] != null && close > bb.up[idx];
      if (sigU === "BLLO") return bb.down[idx] != null && close < bb.down[idx];
      if (sigU === "ABLO") return bb.down[idx] != null && close > bb.down[idx];
      if (sigU === "BLUP") return bb.up[idx] != null && close < bb.up[idx];
      if (sigU === "AB" || sigU === "ABMID") return bb.center[idx] != null && close > bb.center[idx];
      if (sigU === "BL" || sigU === "BLMID") return bb.center[idx] != null && close < bb.center[idx];
      if (sigU === "SLOPEUP" || sigU === "CENTERUP") {
        const c0 = bb.center[idx - 1], c1 = bb.center[idx];
        return c0 != null && c1 != null && c1 > c0;
      }
      if (sigU === "SLOPEDN" || sigU === "CENTERDN") {
        const c0 = bb.center[idx - 1], c1 = bb.center[idx];
        return c0 != null && c1 != null && c1 < c0;
      }
      return false;
    }
    if (kind === "momentum") {
      const len = pm.L || parseInt(atom.params, 10) || 10;
      const v = cache.momentum(len)[idx];
      if (v == null) return false;
      return evalThreshold(sig, v, close);
    }
    if (kind === "vwap") {
      const v = cache.vwap()[idx];
      if (v == null) return false;
      if (sigU === "AB") return close > v;
      if (sigU === "BL") return close < v;
      if (sigU === "SLOPEUP" || sigU === "CENTERUP") {
        const p = cache.vwap()[idx - 1];
        return p != null && v > p;
      }
      if (sigU === "SLOPEDN" || sigU === "CENTERDN") {
        const p = cache.vwap()[idx - 1];
        return p != null && v < p;
      }
      return false;
    }
    if (kind === "macd") {
      const fast = pm.fast || 12, slow = pm.slow || 26, signal = pm.signal || 9;
      const md = cache.macd(fast, slow, signal);
      const m = md.macd[idx], s = md.signal[idx];
      if (m == null || s == null) return false;
      if (sigU === "MACD>SIG" || sigU === "MACD>SIG") return m > s;
      if (sigU === "MACD<SIG") return m < s;
      return false;
    }
    if (kind === "cci") {
      const len = pm.L || 20;
      const v = cache.cci(len)[idx];
      if (v == null) return false;
      return evalThreshold(sig, v, close);
    }
    if (kind === "rand") {
      const roll = randBarRoll(cache, idx, pm);
      if (sigU === "LONG") return roll.open && roll.long;
      if (sigU === "SHORT") return roll.open && !roll.long;
      if (sigU === "ISOK" || sigU === "OK") {
        if (!roll.open) return false;
        const side = evalOpts?.tradeSide;
        if (side === "long") return roll.long;
        if (side === "short") return !roll.long;
        return roll.open;
      }
      return false;
    }
    return false;
  }

  /** Подпрограмма `evaluateExpr`. */
  function evaluateExpr(atoms, cache, idx, posCtx, evalOpts) {
    if (!atoms.length) return false;
    return atoms.every((a) => evaluateAtom(a, cache, idx, posCtx, evalOpts));
  }

  /** Подпрограмма `captureEntryAnchor`. */
  function captureEntryAnchor(cache, parsed, idx) {
    const len = parsed?.regimeLinLen || DEFAULT_PARAMS.LR;
    const lr = cache.linreg(len, 2);
    const entryMid = lr.center[idx];
    let entryBeta = 0;
    if (idx > 0 && lr.center[idx - 1] != null && entryMid != null) {
      entryBeta = entryMid - lr.center[idx - 1];
    }
    return { entryBarIdx: idx, entryMid, entryBeta };
  }

  /** Подпрограмма `buildPosCtx`. */
  function buildPosCtx(pos, entryBarIdx, entryMid, entryBeta) {
    if (!pos) return { pos: 0, entryBarIdx: null, entryMid: null, entryBeta: null };
    return { pos, entryBarIdx, entryMid, entryBeta };
  }

  /** Подпрограмма `evalOnFlipClose`. */
  function evalOnFlipClose(parsed, cache, idx, pos) {
    if (!parsed?.onFlipClose || pos === 0) return false;
    const len = parsed.regimeLinLen || DEFAULT_PARAMS.LR;
    const sign = linRegSlopeSign(cache, len, idx, parsed.regimeSlopeLb || 3);
    if (pos > 0) return sign < 0;
    if (pos < 0) return sign > 0;
    return false;
  }

  /** Подпрограмма `warmupBars`. */
  function warmupBars() {
    return 120;
  }

  /** Прогрев для Rand-only логик — без индикаторов. */
  function parsedUsesRandOnly(parsed) {
    const atoms = [
      ...(parsed?.opLongAtoms || []),
      ...(parsed?.opShortAtoms || []),
      ...(parsed?.clLongAtoms || []),
      ...(parsed?.clShortAtoms || [])
    ];
    return atoms.length > 0 && atoms.every((a) => indicatorKey(a?.kind) === "rand");
  }

  function logicWarmupBars(parsed) {
    return parsedUsesRandOnly(parsed) ? 1 : warmupBars();
  }

  /** Расчёт: `calcTradeVolume`. */
  function calcTradeVolume(price, volConfig) {
    const cfg = { ...DEFAULT_VOLUME, ...volConfig };
    const p = price > 0 ? price : 0;
    if (p <= 0) return 0;
    if (cfg.volumeType === "Contracts") return Math.max(0, cfg.volume);
    if (cfg.volumeType === "Contract currency") return Math.max(0, cfg.volume / p);
    return Math.max(0, (cfg.deposit * cfg.volume / 100) / p);
  }

  /** Суммарный лимит gross-экспозиции портфеля (₽): депозит × Max positions × Volume%. */
  function portfolioGrossCapRub(volConfig) {
    const vol = normalizedVolConfig(volConfig);
    const deposit = Math.max(0, +vol.deposit || 0);
    const volumePct = Math.max(0, +vol.volume || 0);
    const maxPos = Math.max(0, +vol.maxPositions || 0);
    return deposit * maxPos * volumePct / 100;
  }

  /**
   * Состояние портфельного лимита: Max positions — на все бумаги суммарно,
   * Volume% — размер каждой новой позиции от депозита.
   */
  function createPortfolioCap(volConfig) {
    const capRub = portfolioGrossCapRub(volConfig);
    const positions = new Map();
    const prices = new Map();

    function grossExposureRub() {
      let sum = 0;
      for (const [sec, pos] of positions) {
        const p = prices.get(sec) || 0;
        sum += Math.abs(pos) * Math.max(0, p);
      }
      return sum;
    }

    function secExposureRub(sec) {
      const pos = positions.get(sec) || 0;
      const p = prices.get(sec) || 0;
      return Math.abs(pos) * Math.max(0, p);
    }

    return {
      capRub,
      getPos(sec) { return positions.get(sec) || 0; },
      setPrice(sec, price) {
        if (price > 0) prices.set(sec, price);
      },
      setPos(sec, pos, price) {
        if (price != null && price > 0) prices.set(sec, price);
        if (!pos) positions.delete(sec);
        else positions.set(sec, pos);
      },
      grossExposureRub,
      remainingRub(sec, price) {
        const p = price > 0 ? price : (prices.get(sec) || 0);
        return Math.max(0, capRub - grossExposureRub() + secExposureRub(sec));
      },
      maxAbsPieces(sec, price) {
        const p = Math.max(0, price);
        if (p <= 0) return 0;
        return this.remainingRub(sec, p) / p;
      },
      canOpenPieces(sec, price, pieces) {
        const p = Math.max(0, price);
        const want = Math.abs(+pieces || 0);
        if (p <= 0 || want <= 0) return 0;
        const allowed = Math.floor(this.maxAbsPieces(sec, p) + 1e-9);
        return Math.max(0, Math.min(want, allowed));
      },
      clampTargetPos(sec, price, targetPos) {
        const p = Math.max(0, price);
        const tgt = +targetPos || 0;
        if (p <= 0) return tgt;
        const maxAbs = this.maxAbsPieces(sec, p);
        if (Math.abs(tgt) <= maxAbs + 1e-9) return tgt;
        return Math.sign(tgt || 1) * maxAbs;
      }
    };
  }

  function portfolioSyncPos(opts, pos, price) {
    if (opts?.portfolioCap && opts?.sec) opts.portfolioCap.setPos(opts.sec, pos, price);
  }

  function resolveOpenLot(price, volConfig, opts) {
    const lot = calcTradeVolume(price, volConfig);
    if (lot <= 0) return 0;
    if (opts?.portfolioCap && opts?.sec) {
      opts.portfolioCap.setPrice(opts.sec, price);
      return opts.portfolioCap.canOpenPieces(opts.sec, price, lot);
    }
    const cap = maxAbsPosition(price, volConfig);
    return lot <= cap ? lot : 0;
  }

  function maxAbsPositionAt(price, volConfig, opts) {
    if (opts?.portfolioCap && opts?.sec) {
      opts.portfolioCap.setPrice(opts.sec, price);
      return opts.portfolioCap.maxAbsPieces(opts.sec, price);
    }
    return maxAbsPosition(price, volConfig);
  }

  /** Подпрограмма `maxAbsPosition` (legacy: лимит на один тикер без портфельного контекста). */
  function maxAbsPosition(price, volConfig) {
    const lot = calcTradeVolume(price, volConfig);
    const maxPos = Math.max(1, volConfig?.maxPositions ?? DEFAULT_VOLUME.maxPositions);
    return lot * maxPos;
  }

  function simContinuationFromResult(r) {
    if (!r) return {};
    return {
      pos: r.pos ?? 0,
      cash: r.cash ?? 0,
      entryPrice: r.entryPrice ?? null,
      commission: r.commission ?? 0,
      ...(r.simState || {})
    };
  }

  /** Разрешение id/метаданных: `resolveVolCommission`. */
  function resolveVolCommission(volConfig) {
    const cfg = volConfig?.commission;
    if (cfg != null && typeof cfg === "object" && cfg.type) {
      return normalizeCommission(cfg);
    }
    const pct = Number(volConfig?.commissionPct);
    if (Number.isFinite(pct)) {
      return normalizeCommission({ type: "Percent", value: pct });
    }
    return normalizeCommission(DEFAULT_COMMISSION);
  }

  /** Нормализация входных данных: `normalizedVolConfig`. */
  function normalizedVolConfig(volConfig) {
    const vol = { ...DEFAULT_VOLUME, ...volConfig };
    vol.commission = resolveVolCommission(vol);
    return vol;
  }

  /** Комиссия: `commissionCost`. */
  function commissionCost(price, volume, volConfig) {
    const vol = volConfig?.commission ? volConfig : normalizedVolConfig(volConfig);
    return tradeCommission(volume, price, vol.commission);
  }

  /** Маркеры входа/выхода на графике по смене позиции. */
  function tradeMarkersFromBar(posBefore, posAfter, posStop) {
    let tradeIn = null;
    let tradeOut = null;
    let tradeOutSide = null;
    const pb = posBefore ?? 0;
    const pa = posAfter ?? 0;
    if (pb !== 0 && pa === 0) {
      tradeOut = posStop === "sl" || posStop === "tp" ? posStop : "logic";
      tradeOutSide = pb > 0 ? "long" : "short";
    } else if (posStop && pb !== 0 && pa !== 0) {
      // SL/TP и новый вход на одном баре — оба маркера
      tradeOut = posStop;
      tradeOutSide = pb > 0 ? "long" : "short";
      tradeIn = pa > 0 ? "long" : "short";
    } else if (pb !== 0 && pa !== 0 && Math.sign(pb) !== Math.sign(pa)) {
      tradeOut = posStop === "sl" || posStop === "tp" ? posStop : "logic";
      tradeOutSide = pb > 0 ? "long" : "short";
      tradeIn = pa > 0 ? "long" : "short";
    } else if (pb === 0 && pa !== 0) {
      tradeIn = pa > 0 ? "long" : "short";
    }
    return { tradeIn, tradeOut, tradeOutSide };
  }

  /** Текст сигнала для подсказки на графике (рус.). */
  function tradeSignalHint(signal) {
    const map = {
      op_long: "Op long",
      op_short: "Op short",
      cl_long: "Cl long",
      cl_short: "Cl short",
      flip_to_short: "Flip → short (Op)",
      flip_to_long: "Flip → long (Op)",
      sl: "Stop-loss",
      tp: "Take-profit",
      sma_long: "SMA → long",
      sma_short: "SMA → short",
      sma_flat: "SMA → flat",
      logic: "Cl / сигнал логики"
    };
    return map[signal] || signal || "";
  }

  /** Код сигнала выхода по логике (не SL/TP). */
  function logicLineExitSignal(pos, esig) {
    if (pos > 0) {
      if (esig.longClHit) return "cl_long";
      if (esig.shortOpHit) return "flip_to_short";
    } else if (pos < 0) {
      if (esig.shortClHit) return "cl_short";
      if (esig.longOpHit) return "flip_to_long";
    }
    return "logic";
  }

  /** Текст одного атома логики для подписи на графике. */
  function formatAtomRaw(atom) {
    if (!atom?.kind) return "";
    const params = atom.params != null && atom.params !== "" ? atom.params : "";
    const sig = atom.signal != null && atom.signal !== "" ? atom.signal : "";
    return sig ? `${atom.kind}(${params})(${sig})` : `${atom.kind}(${params})`;
  }

  /** Фрагмент Op(Long(...)) / Cl(Short(...)) из распарсенных атомов. */
  function formatBlockExpr(tag, side, atoms) {
    const cap = String(side || "").charAt(0).toUpperCase() + String(side || "").slice(1).toLowerCase();
    const inner = (atoms || []).map(formatAtomRaw).filter(Boolean);
    if (!inner.length) return `${tag}(${cap})`;
    return `${tag}(${cap}(${inner.join(" AND ")}))`;
  }

  function markerOpExpr(parsed, side) {
    const s = side === "short" ? "short" : "long";
    const atoms = s === "long" ? parsed?.opLongAtoms : parsed?.opShortAtoms;
    return formatBlockExpr("Op", s, atoms);
  }

  function markerSlTpLabel(parsed, posStop) {
    if (posStop === "sl") {
      if (parsed?.slPct > 0) return `SL[${(parsed.slPct * 100).toFixed(2).replace(/\.?0+$/, "")}%]`;
      const m = parsed?.slAtr > 0 ? `${parsed.slAtr}×ATR` : "";
      return m ? `SL[${m}]` : "Stop-loss";
    }
    if (posStop === "tp") {
      if (parsed?.tpPct > 0) return `TP[${(parsed.tpPct * 100).toFixed(2).replace(/\.?0+$/, "")}%]`;
      const m = parsed?.tpAtr > 0 ? `${parsed.tpAtr}×ATR` : "";
      return m ? `TP[${m}]` : "Take-profit";
    }
    return posStop || "";
  }

  /** Строка Cl/Op/SL для подписи выхода на графике. */
  function markerExitExpr(parsed, pos, esig, posStop) {
    if (posStop === "sl" || posStop === "tp") return markerSlTpLabel(parsed, posStop);
    if (pos > 0) {
      if (esig?.longClHit && parsed?.clLongAtoms?.length) return formatBlockExpr("Cl", "long", parsed.clLongAtoms);
      if (esig?.shortOpHit && parsed?.opShortAtoms?.length) return formatBlockExpr("Op", "short", parsed.opShortAtoms);
      if (esig?.longClHit && parsed?.onFlipClose) return "OnFlip close";
    } else if (pos < 0) {
      if (esig?.shortClHit && parsed?.clShortAtoms?.length) return formatBlockExpr("Cl", "short", parsed.clShortAtoms);
      if (esig?.longOpHit && parsed?.opLongAtoms?.length) return formatBlockExpr("Op", "long", parsed.opLongAtoms);
      if (esig?.shortClHit && parsed?.onFlipClose) return "OnFlip close";
    }
    return tradeSignalHint(logicLineExitSignal(pos, esig || {}));
  }

  /** Поля tradeInLogic / tradeOutLogic для SMA при смене позиции через ноль. */
  function smaTradeMarkerFields(posBefore, posAfter, posStop, logicId) {
    const pb = posBefore ?? 0;
    const pa = posAfter ?? 0;
    const fields = {};
    const lid = logicId || "SMA";
    if (pb === 0 && pa !== 0) {
      fields.tradeInLogic = lid;
      fields.tradeInSignal = pa > 0 ? "sma_long" : "sma_short";
      fields.tradeInExpr = pa > 0 ? "Sma → long" : "Sma → short";
    } else if (pb !== 0 && pa === 0) {
      fields.tradeOutLogic = lid;
      fields.tradeOutSignal = posStop === "sl" || posStop === "tp" ? posStop : "sma_flat";
      fields.tradeOutExpr = posStop === "sl" || posStop === "tp"
        ? markerSlTpLabel({ slAtr: 0, tpAtr: 0 }, posStop)
        : "Sma → flat";
    }
    return fields;
  }

  /** Подпрограмма `pushRow`. */
  function pushRow(rows, candle, fields, posBefore) {
    if (!candle) return;
    const posAfter = fields?.pos ?? 0;
    const markers = tradeMarkersFromBar(posBefore, posAfter, fields?.posStop ?? null);
    const row = {
      time: candle.time,
      close: candle.close,
      open: candle.open ?? candle.close,
      high: candle.high ?? candle.close,
      low: candle.low ?? candle.close,
      ...fields,
      ...markers
    };
    for (const k of ["tradeInLogic", "tradeInSignal", "tradeInExpr", "tradeOutLogic", "tradeOutSignal", "tradeOutExpr"]) {
      if (fields?.[k] != null && fields[k] !== "") row[k] = fields[k];
    }
    rows.push(row);
  }

  /** Реверс сторон (Long↔Short): меняет местами long/short сигналы Op и Cl. */
  function isReverseSidesEnabled(options) {
    return !!(options && (options.reverse || options.preparedRun?.reverse));
  }

  /**
   * Реверс сигналов: инверсия уровней Ab/Bl, K/CCI/RSI и т.п.
   * XOR с ReverseSides: инверсия активна, когда включён ровно один из двух реверсов.
   * Так из FTS получаются 4 уникальных угла: FTS, FTT, FTS_S, FTT_S.
   */
  function isReverseSignalsEnabled(options) {
    const rawSignals = !!(options && (options.reverseSignals || options.preparedRun?.reverseSignals));
    const rawSides = isReverseSidesEnabled(options);
    return rawSignals !== rawSides;
  }

  /** Сигналы Op/Cl с учётом @@ReverseSignals и @@ReverseSides (единый порядок для входа и выхода). */
  function logicLineExecSignals(parsed, cache, i, posCtx, opts) {
    let sig = logicLineBarSignals(parsed, cache, i, posCtx, { reverseSignals: isReverseSignalsEnabled(opts) });
    if (isReverseSidesEnabled(opts)) sig = swapLogicExecHits(sig);
    return sig;
  }

  function reverseSignalOp(op) {
    if (op === ">=") return "<=";
    if (op === "<=") return ">=";
    if (op === ">") return "<";
    if (op === "<") return ">";
    return op;
  }

  function reverseSignalToken(sigRaw) {
    const s = String(sigRaw || "").replace(/\s+/g, "");
    const u = s.toUpperCase();
    if (u === "AB") return "Bl";
    if (u === "BL") return "Ab";
    if (u === "ABMID") return "BlMid";
    if (u === "BLMID") return "AbMid";
    if (u === "ABUP") return "BlLo";
    if (u === "BLLO") return "AbUp";
    if (u === "ABLINK") return "BlLinK";
    if (u === "BLLINK") return "AbLinK";
    if (u === "ABREGK") return "BlRegK";
    if (u === "BLREGK") return "AbRegK";
    // Bollinger special cases used in engine:
    if (u === "BLUP") return "AbDn";
    if (u === "ABDN") return "BlUp";
    const m = u.match(/^(K|CCI|RSI|MOM)(>=|<=|>|<)(-?\d+(?:\.\d+)?)$/);
    if (m) {
      const kind = m[1];
      const op = m[2];
      const v = +m[3];
      // For bounded oscillators (Stoch K, RSI), invert both direction and level: v -> 100 - v.
      // This is what you expect when turning "low zone" into "high zone" (20 <-> 80).
      if ((kind === "K" || kind === "RSI") && Number.isFinite(v)) {
        const vv = 100 - v;
        return `${kind}${reverseSignalOp(op)}${vv}`;
      }
      return `${kind}${reverseSignalOp(op)}${m[3]}`;
    }
    return s;
  }

  /** Swap сторон для сигналов Op/Cl (используется в @@ReverseSides). */
  function swapLogicExecHits(sig) {
    return {
      ...sig,
      longOpHit: sig.shortOpHit,
      shortOpHit: sig.longOpHit,
      longClHit: sig.shortClHit,
      shortClHit: sig.longClHit
    };
  }

  /** Поменять местами объёмы покупки и продажи (SMA-логики). */
  function swapTradeVolumes(buy, sell) {
    return { buy: sell, sell: buy };
  }

  /** Симуляция на свечах: `simulateNoSignalRows`. */
  function simulateNoSignalRows(candles, startIdx, endIdx, options) {
    const initial = options?.initial || {};
    const cash = initial.cash || 0;
    const pos = initial.pos || 0;
    const commissionPaid = initial.commission || 0;
    const rows = [];
    const from = Math.max(0, startIdx);
    const to = Math.min(endIdx, candles.length - 1);
    for (let i = from; i <= to; i++) {
      const price = candles[i]?.close || 0;
      pushRow(rows, candles[i], {
        buy: 0,
        sell: 0,
        posStop: null,
        cash,
        pos,
        commission: commissionPaid,
        eq: cash + pos * price
      });
    }
    const last = rows.at(-1);
    return {
      rows,
      finresp: last?.eq ?? 0,
      cash: last?.cash ?? cash,
      pos: last?.pos ?? pos,
      commission: commissionPaid,
      buys: 0,
      sells: 0
    };
  }

  /** Подпрограмма `longestPack`. */
  function longestPack(packs) {
    if (!packs?.length) return [];
    return packs.reduce((best, p) => ((p?.length || 0) > (best?.length || 0) ? p : best), packs[0]);
  }

  /** Подпрограмма `collectChartIndicators`. */
  function collectChartIndicators(cache, parsed, idx) {
    const ind = {};
    const atoms = [...(parsed?.opAtoms || []), ...(parsed?.clAtoms || [])];
    for (const atom of atoms) {
      const pm = parseParamsMap(atom.params);
      const kind = indicatorKey(atom.kind);
      if (kind === "sma") {
        const len = pm.L || parseInt(atom.params, 10) || 100;
        ind.sma = cache.sma(len)[idx];
      }
      if (kind === "cma") {
        const len = pm.L || parseInt(atom.params, 10) || 100;
        const powRaw = pm.P ?? pm.Pow ?? pm.pow ?? pm.Deg ?? pm.deg;
        const pow = powRaw != null && powRaw !== "" ? parseFloat(powRaw) : 1;
        ind.cma = cache.cma(len, Number.isFinite(pow) ? pow : 1)[idx];
      }
      if (kind === "linreg") {
        const len = pm.L || parseInt(atom.params, 10) || 20;
        const kMult = parseLinRegK(pm);
        const atrLen = parseLinRegAtrLen(pm);
        const useAtrBand = pm.K != null || pm.k != null
          || /BLLINK|ABLINK|ABREGK|BLREGK/i.test(String(atom.signal || ""));
        if (useAtrBand) {
          const bands = cache.linregAtr(len, kMult, atrLen);
          ind.linregUp = bands.up[idx];
          ind.linregDn = bands.down[idx];
          ind.linregMid = bands.center[idx];
        } else {
          const dev = parseFloat(pm.Dev || pm.dev || "2");
          const lr = cache.linreg(len, dev);
          ind.linregUp = lr.up[idx];
          ind.linregDn = lr.down[idx];
          ind.linregMid = lr.center[idx];
        }
      }
      if (kind === "bollinger") {
        const len = pm.L || parseInt(atom.params, 10) || 20;
        const dev = parseFloat(pm.Dev || pm.dev || "2");
        const bb = cache.bollinger(len, dev);
        ind.bollingerUp = bb.up[idx];
        ind.bollingerDn = bb.down[idx];
        ind.bollingerMid = bb.center[idx];
      }
      if (kind === "vwap") {
        ind.vwap = cache.vwap()[idx];
      }
    }
    return ind;
  }

  /** Индикаторы для графика по всем выбранным логикам (merge полей). */
  function collectChartIndicatorsForSpecs(cache, specs, idx) {
    const ind = {};
    for (const spec of specs || []) {
      if (!spec || spec.disabled) continue;
      if (spec.type === "logic_line" && spec.parsed) {
        Object.assign(ind, collectChartIndicators(cache, spec.parsed, idx));
      } else if (spec.type === "sma_spread" || spec.type === "sma_corridor") {
        const len = spec.smaLen || 100;
        ind.sma = cache.sma(len)[idx];
        if (spec.type === "sma_corridor") {
          const corridorK = Math.max(0, Number(spec.corridorAtr) || 0);
          const atrLen = Math.max(2, Number(spec.slTpAtrLen) || DEFAULT_PARAMS.slTpAtrLen);
          const a = cache.atr(atrLen)[idx];
          const s = ind.sma;
          if (s != null && a != null && a > 0) {
            const band = corridorK * a;
            ind.smaUpper = s + band;
            ind.smaLower = s - band;
          }
        }
      } else if (spec.type === "cma_spread") {
        const len = spec.cmaLen || 100;
        const pow = Number.isFinite(spec.cmaPow) ? spec.cmaPow : 1;
        ind.cma = cache.cma(len, pow)[idx];
      }
    }
    return ind;
  }

  /** Кэш индикаторов по свечам (для обогащения строк графика). */
  function createIndicatorCache(candles) { return new IndicatorCache(candles); }

  /**
   * Сигналы одной строки логики на баре i: вход long/short (Op) и выход (Cl).
   * @returns {{ longOpHit, shortOpHit, longClHit, shortClHit }}
   */
  function logicLineBarSignals(parsed, cache, i, posCtx, evalOptsBase) {
    const evalOpts = evalOptsBase || {};
    const opLongAtoms = parsed.opLongAtoms || (parsed.opSide === "long" ? parsed.opAtoms : []);
    const opShortAtoms = parsed.opShortAtoms || (parsed.opSide === "short" ? parsed.opAtoms : []);
    const clLongAtoms = parsed.clLongAtoms || (parsed.clSide === "long" ? parsed.clAtoms : []);
    const clShortAtoms = parsed.clShortAtoms || (parsed.clSide === "short" ? parsed.clAtoms : []);
    const pos = posCtx?.pos || 0;
    const longClHit = evaluateExpr(clLongAtoms, cache, i, posCtx, evalOpts)
      || (pos > 0 && evalOnFlipClose(parsed, cache, i, pos));
    const shortClHit = evaluateExpr(clShortAtoms, cache, i, posCtx, evalOpts)
      || (pos < 0 && evalOnFlipClose(parsed, cache, i, pos));
    return {
      longOpHit: evaluateExpr(opLongAtoms, cache, i, posCtx, { ...evalOpts, tradeSide: "long" }),
      shortOpHit: evaluateExpr(opShortAtoms, cache, i, posCtx, { ...evalOpts, tradeSide: "short" }),
      longClHit,
      shortClHit
    };
  }

  /**
   * Симуляция нескольких L1…L5 на одном инструменте (стек по приоритету).
   * Порядок specs[] = порядок выбора в UI (сверху вниз).
   * На каждом баре: если позиции нет — перебор логик до первого входа;
   * если позиция открыта — SL/TP и Cl только у activeIdx (логика, открывшая сделку).
   * @param {object[]} specs — элементы resolveLogicSpec с type === "logic_line"
   */
  function simulateMultiLogicStack(candles, specs, startIdx, endIdx, volConfig, options, params) {
    const opts = options || {};
    const prep = opts.preparedStack;
    const logicSpecs = prep?.logicSpecs
      || (specs || []).filter((s) => s && s.type === "logic_line" && !s.disabled);
    if (!logicSpecs.length) return simulateNoSignalRows(candles, startIdx, endIdx, options);
    if (logicSpecs.length === 1) {
      const parsed = prep?.parsedList?.[0]
        || applySlTpParams({ ...logicSpecs[0].parsed }, params || DEFAULT_PARAMS);
      return simulateLogicLine(candles, parsed, startIdx, endIdx, volConfig, {
        ...options,
        logicId: logicSpecs[0]?.logicId
      });
    }
    const p = prep?.p || { ...DEFAULT_PARAMS, ...params };
    const parsedList = prep?.parsedList
      || logicSpecs.map((s) => applySlTpParams({ ...s.parsed }, p));
    const signalCandles = opts.signalCandles || candles;
    const cache = opts.indicatorCache || new IndicatorCache(signalCandles);
    const atrByLen = prep?.atrByLen || (() => {
      const atrLenSet = new Set(parsedList.map((x) => x.slTpAtrLen || DEFAULT_PARAMS.slTpAtrLen));
      return new Map([...atrLenSet].map((len) => [len, cache.atr(len)]));
    })();
    const initial = opts.initial || {};
    let pos = initial.pos || 0;
    let cash = initial.cash || 0;
    let entryPrice = initial.entryPrice ?? null;
    let commissionPaid = initial.commission || 0;
    let activeIdx = initial.activeIdx ?? -1;
    let entryBarIdx = initial.entryBarIdx ?? null;
    let entryMid = initial.entryMid ?? null;
    let entryBeta = initial.entryBeta ?? null;
    const rows = [];
    const stackWarmup = parsedList.length
      ? Math.max(...parsedList.map((x) => logicWarmupBars(x)), 1)
      : warmupBars();
    const w = Math.max(stackWarmup, 2);
    const from = opts.skipWarmup ? Math.max(startIdx, 0) : Math.max(startIdx, w);
    const to = Math.min(endIdx, candles.length - 1);
    const barSpan = Math.max(1, to - from + 1);
    const barProgressStep = opts.yieldUi
      ? Math.max(1, Math.floor(barSpan / 24))
      : Math.max(1, Math.floor(barSpan / 48));

    const flatten = (price) => {
      if (pos === 0) return 0;
      const vol = Math.abs(pos);
      cash += pos * price;
      const comm = commissionCost(price, vol, volConfig);
      cash -= comm;
      commissionPaid += comm;
      pos = 0;
      entryPrice = null;
      activeIdx = -1;
      entryBarIdx = null;
      entryMid = null;
      entryBeta = null;
      portfolioSyncPos(opts, 0, price);
      return vol;
    };

    for (let i = from; i <= to; i++) {
      if (typeof opts.shouldCancel === "function" && opts.shouldCancel()) break;
      const posBefore = pos;
      const price = candles[i].close;
      let buy = 0;
      let sell = 0;
      let posStop = null;
      const markerMeta = {};

      if (typeof opts.onProgress === "function" && (i === to || (i - from) % barProgressStep === 0)) {
        opts.onProgress(i - from + 1, barSpan, candles[i]?.time);
      }

      if (pos !== 0 && activeIdx >= 0 && activeIdx < parsedList.length) {
        const parsed = parsedList[activeIdx];
        const activeLogicId = logicSpecs[activeIdx]?.logicId || opts.logicId || "?";
        if (positionStopsEnabled(parsed) && entryPrice != null) {
          const needAtr = (parsed.slAtr > 0 || parsed.tpAtr > 0);
          const a = needAtr ? atrByLen.get(parsed.slTpAtrLen || DEFAULT_PARAMS.slTpAtrLen)?.[i] : null;
          const stop = checkPositionSlTp(pos, entryPrice, price, parsed, a);
          if (stop) {
            posStop = stop;
            markerMeta.tradeOutLogic = activeLogicId;
            markerMeta.tradeOutSignal = posStop;
            markerMeta.tradeOutExpr = markerSlTpLabel(parsed, posStop);
            sell += flatten(price);
          }
        }
        if (pos !== 0) {
          const posCtx = buildPosCtx(pos, entryBarIdx, entryMid, entryBeta);
          const sig = logicLineExecSignals(parsed, cache, i, posCtx, opts);
          if (pos > 0 && (sig.longClHit || sig.shortOpHit)) {
            markerMeta.tradeOutLogic = activeLogicId;
            markerMeta.tradeOutSignal = logicLineExitSignal(pos, sig);
            markerMeta.tradeOutExpr = markerExitExpr(parsed, pos, sig, null);
            sell += flatten(price);
          } else if (pos < 0 && (sig.shortClHit || sig.longOpHit)) {
            markerMeta.tradeOutLogic = activeLogicId;
            markerMeta.tradeOutSignal = logicLineExitSignal(pos, sig);
            markerMeta.tradeOutExpr = markerExitExpr(parsed, pos, sig, null);
            sell += flatten(price);
          }
        }
      }

      if (pos === 0) {
        activeIdx = -1;
        entryBarIdx = null;
        entryMid = null;
        entryBeta = null;
        for (let si = 0; si < parsedList.length; si++) {
          const esig = logicLineExecSignals(parsedList[si], cache, i, buildPosCtx(0, null, null, null), opts);
          if (esig.longOpHit === esig.shortOpHit) continue;
          const lot = resolveOpenLot(price, volConfig, opts);
          if (lot <= 0) continue;
          pos = esig.longOpHit ? lot : -lot;
          cash -= pos * price;
          const comm = commissionCost(price, lot, volConfig);
          cash -= comm;
          commissionPaid += comm;
          entryPrice = price;
          if (pos > 0) buy += lot;
          else sell += lot;
          activeIdx = si;
          markerMeta.tradeInLogic = logicSpecs[si]?.logicId || opts.logicId || "?";
          markerMeta.tradeInSignal = esig.longOpHit ? "op_long" : "op_short";
          markerMeta.tradeInExpr = markerOpExpr(parsedList[si], esig.longOpHit ? "long" : "short");
          const anchor = captureEntryAnchor(cache, parsedList[si], i);
          entryBarIdx = anchor.entryBarIdx;
          entryMid = anchor.entryMid;
          entryBeta = anchor.entryBeta;
          portfolioSyncPos(opts, pos, price);
          break;
        }
      }

      const chartParsed = activeIdx >= 0 ? parsedList[activeIdx] : parsedList[0];
      const ind = collectChartIndicators(cache, chartParsed, i);
      pushRow(rows, candles[i], {
        ...ind,
        ...markerMeta,
        buy,
        sell,
        posStop,
        pos,
        cash,
        commission: commissionPaid,
        eq: cash + pos * price
      }, posBefore);
    }

    const last = rows.at(-1);
    return {
      rows,
      finresp: last?.eq ?? 0,
      cash: last?.cash ?? 0,
      pos: last?.pos ?? 0,
      commission: commissionPaid,
      buys: rows.reduce((s, r) => s + (r.buy || 0), 0),
      sells: rows.reduce((s, r) => s + (r.sell || 0), 0),
      entryPrice,
      simState: { activeIdx, entryBarIdx, entryMid, entryBeta }
    };
  }

  /** Симуляция одной L-логики на массиве свечей. */
  function simulateLogicLine(candles, parsed, startIdx, endIdx, volConfig, options) {
    const opts = options || {};
    const logicId = opts.logicId || parsed?.logicId || "logic";
    const signalCandles = opts.signalCandles || candles;
    const cache = opts.indicatorCache || new IndicatorCache(signalCandles);
    const atrLen = parsed.slTpAtrLen || DEFAULT_PARAMS.slTpAtrLen;
    const needAtrStops = (parsed.slAtr > 0 || parsed.tpAtr > 0);
    const atrSlTp = needAtrStops ? cache.atr(atrLen) : null;
    const initial = opts.initial || {};
    let pos = initial.pos || 0;
    let cash = initial.cash || 0;
    let entryPrice = initial.entryPrice ?? null;
    let entryBarIdx = initial.entryBarIdx ?? null;
    let entryMid = initial.entryMid ?? null;
    let entryBeta = initial.entryBeta ?? null;
    let commissionPaid = initial.commission || 0;
    const rows = [];
    const w = Math.max(logicWarmupBars(parsed), 2);
    const from = opts.skipWarmup ? Math.max(startIdx, 0) : Math.max(startIdx, w);
    const to = Math.min(endIdx, candles.length - 1);

    const flatten = (price) => {
      if (pos === 0) return 0;
      const vol = Math.abs(pos);
      cash += pos * price;
      const comm = commissionCost(price, vol, volConfig);
      cash -= comm;
      commissionPaid += comm;
      pos = 0;
      entryPrice = null;
      entryBarIdx = null;
      entryMid = null;
      entryBeta = null;
      portfolioSyncPos(opts, 0, price);
      return vol;
    };

    const barSpan = Math.max(1, to - from + 1);
    const barProgressStep = opts.yieldUi
      ? Math.max(1, Math.floor(barSpan / 24))
      : Math.max(1, Math.floor(barSpan / 48));

    for (let i = from; i <= to; i++) {
      if (typeof opts.shouldCancel === "function" && opts.shouldCancel()) break;
      const posBefore = pos;
      const price = candles[i].close;
      let buy = 0;
      let sell = 0;

      if (typeof opts.onProgress === "function" && (i === to || (i - from) % barProgressStep === 0)) {
        opts.onProgress(i - from + 1, barSpan, candles[i]?.time);
      }

      let posStop = null;
      const markerMeta = {};
      if (pos !== 0 && positionStopsEnabled(parsed) && entryPrice != null) {
        const a = needAtrStops ? atrSlTp[i] : null;
        const stop = checkPositionSlTp(pos, entryPrice, price, parsed, a);
        if (stop) {
          posStop = stop;
          markerMeta.tradeOutLogic = logicId;
          markerMeta.tradeOutSignal = posStop;
          markerMeta.tradeOutExpr = markerSlTpLabel(parsed, posStop);
          sell += flatten(price);
        }
      }

      const posCtx = buildPosCtx(pos, entryBarIdx, entryMid, entryBeta);
      const sig = logicLineExecSignals(parsed, cache, i, posCtx, opts);

      if (pos > 0 && (sig.longClHit || sig.shortOpHit)) {
        markerMeta.tradeOutLogic = logicId;
        markerMeta.tradeOutSignal = logicLineExitSignal(pos, sig);
        markerMeta.tradeOutExpr = markerExitExpr(parsed, pos, sig, null);
        sell += flatten(price);
      } else if (pos < 0 && (sig.shortClHit || sig.longOpHit)) {
        markerMeta.tradeOutLogic = logicId;
        markerMeta.tradeOutSignal = logicLineExitSignal(pos, sig);
        markerMeta.tradeOutExpr = markerExitExpr(parsed, pos, sig, null);
        sell += flatten(price);
      }
      if (pos === 0 && sig.longOpHit !== sig.shortOpHit) {
        const lot = resolveOpenLot(price, volConfig, opts);
        if (lot > 0) {
          pos = sig.longOpHit ? lot : -lot;
          cash -= pos * price;
          const comm = commissionCost(price, lot, volConfig);
          cash -= comm;
          commissionPaid += comm;
          entryPrice = price;
          if (pos > 0) buy += lot;
          else sell += lot;
          markerMeta.tradeInLogic = logicId;
          markerMeta.tradeInSignal = sig.longOpHit ? "op_long" : "op_short";
          markerMeta.tradeInExpr = markerOpExpr(parsed, sig.longOpHit ? "long" : "short");
          const anchor = captureEntryAnchor(cache, parsed, i);
          entryBarIdx = anchor.entryBarIdx;
          entryMid = anchor.entryMid;
          entryBeta = anchor.entryBeta;
          portfolioSyncPos(opts, pos, price);
        }
      }

      const ind = collectChartIndicators(cache, parsed, i);
      pushRow(rows, candles[i], {
        ...ind,
        ...markerMeta,
        buy,
        sell,
        posStop,
        pos,
        cash,
        commission: commissionPaid,
        eq: cash + pos * price
      }, posBefore);
    }

    const last = rows.at(-1);
    return {
      rows,
      finresp: last?.eq ?? 0,
      cash: last?.cash ?? 0,
      pos: last?.pos ?? 0,
      commission: commissionPaid,
      buys: rows.reduce((s, r) => s + (r.buy || 0), 0),
      sells: rows.reduce((s, r) => s + (r.sell || 0), 0),
      entryPrice,
      simState: { entryBarIdx, entryMid, entryBeta }
    };
  }

  /** Симуляция на свечах: `simulateSmaSpread`. */
  function simulateSmaSpread(candles, smaLen, side, startIdx, endIdx, volConfig, options) {
    const opts = options || {};
    const signalCandles = opts.signalCandles || candles;
    const slAtr = Math.max(0, Number(opts.slAtr) || 0);
    const tpAtr = Math.max(0, Number(opts.tpAtr) || 0);
    const atrLen = Math.max(2, Number(opts.slTpAtrLen) || DEFAULT_PARAMS.slTpAtrLen);
    const useStops = slAtr > 0 || tpAtr > 0;
    const cache = opts.indicatorCache || (useStops ? new IndicatorCache(signalCandles) : null);
    const atrSlTp = useStops ? cache.atr(atrLen) : null;
    const signalCloses = signalCandles.map((c) => c.close);
    const tradeCloses = candles.map((c) => c.close);
    const sma = cache ? cache.sma(smaLen) : smaSeries(signalCloses, smaLen);
    const initial = opts.initial || {};
    let cash = initial.cash || 0;
    let pos = initial.pos || 0;
    let entryPrice = initial.entryPrice ?? null;
    let commissionPaid = initial.commission || 0;
    let buys = 0;
    let sells = 0;
    const rows = [];
    const capAt = (price) => maxAbsPositionAt(price, volConfig, opts);
    const from = Math.max(0, startIdx);
    const to = Math.min(endIdx, candles.length - 1);
    const barSpan = Math.max(1, to - from + 1);
    const barProgressStep = opts.yieldUi
      ? Math.max(1, Math.floor(barSpan / 24))
      : Math.max(1, Math.floor(barSpan / 48));

    for (let i = from; i <= to; i++) {
      const candle = candles[i];
      if (!candle) continue;
      if (typeof opts.onProgress === "function" && (i === to || (i - from) % barProgressStep === 0)) {
        opts.onProgress(i - from + 1, barSpan, candles[i]?.time);
      }
      const price = tradeCloses[i];
      const signalPrice = signalCloses[i];
      const s = sma[i];
      let buy = 0;
      let sell = 0;
      let posStop = null;
      const posBefore = pos;

      if (useStops && pos !== 0 && entryPrice != null) {
        const a = atrSlTp[i];
        if (a != null && a > 0) {
          let hit = false;
          if (pos > 0) {
            if (slAtr > 0 && price <= entryPrice - slAtr * a) {
              hit = true;
              posStop = "sl";
            } else if (tpAtr > 0 && price >= entryPrice + tpAtr * a) {
              hit = true;
              posStop = "tp";
            }
          } else {
            if (slAtr > 0 && price >= entryPrice + slAtr * a) {
              hit = true;
              posStop = "sl";
            } else if (tpAtr > 0 && price <= entryPrice - tpAtr * a) {
              hit = true;
              posStop = "tp";
            }
          }
          if (hit) {
            cash += pos * price;
            const comm = commissionCost(price, Math.abs(pos), volConfig);
            cash -= comm;
            commissionPaid += comm;
            sells += Math.abs(pos);
            pos = 0;
            entryPrice = null;
            portfolioSyncPos(opts, 0, price);
          }
        }
      }

      if (s != null) {
        const d = signalPrice - s;
        const scale = calcTradeVolume(price, volConfig) / Math.max(price, 1e-9);
        if (side === "above") {
          buy = Math.max(d, 0) * scale;
          sell = Math.max(-d, 0) * scale;
        } else {
          buy = Math.max(-d, 0) * scale;
          sell = Math.max(d, 0) * scale;
        }
        if (isReverseSidesEnabled(opts)) ({ buy, sell } = swapTradeVolumes(buy, sell));
        const cap = capAt(price);
        if (pos + buy - sell > cap) buy = Math.max(0, cap - pos + sell);
        if (pos + buy - sell < -cap) sell = Math.max(0, pos + buy + cap);
        cash += price * (sell - buy);
        const comm = commissionCost(price, buy + sell, volConfig);
        cash -= comm;
        commissionPaid += comm;
        pos += buy - sell;
        buys += buy;
        sells += sell;
        portfolioSyncPos(opts, pos, price);
      }

      if (pos === 0) {
        entryPrice = null;
      } else if (posBefore === 0 || Math.sign(pos) !== Math.sign(posBefore)) {
        entryPrice = price;
      }

      pushRow(rows, candle, {
        sma: s,
        buy,
        sell,
        posStop,
        cash,
        pos,
        commission: commissionPaid,
        eq: cash + pos * (price || 0),
        ...smaTradeMarkerFields(posBefore, pos, posStop, opts.logicId)
      }, posBefore);
    }
    const last = rows.at(-1);
    return {
      rows,
      finresp: last?.eq ?? 0,
      cash: last?.cash ?? 0,
      pos: last?.pos ?? 0,
      commission: commissionPaid,
      buys,
      sells,
      entryPrice
    };
  }

  /** CMA-эталон с Vol: объём ∝ |Close−CMA|, Ab — лонг выше / шорт ниже. */
  function simulateCmaSpread(candles, cmaLen, cmaPow, side, startIdx, endIdx, volConfig, options) {
    const opts = options || {};
    const signalCandles = opts.signalCandles || candles;
    const slAtr = Math.max(0, Number(opts.slAtr) || 0);
    const tpAtr = Math.max(0, Number(opts.tpAtr) || 0);
    const atrLen = Math.max(2, Number(opts.slTpAtrLen) || DEFAULT_PARAMS.slTpAtrLen);
    const useStops = slAtr > 0 || tpAtr > 0;
    const cache = opts.indicatorCache || new IndicatorCache(signalCandles);
    const atrSlTp = useStops ? cache.atr(atrLen) : null;
    const signalCloses = signalCandles.map((c) => c.close);
    const tradeCloses = candles.map((c) => c.close);
    const pow = Number.isFinite(+cmaPow) ? +cmaPow : 1;
    const cma = cache.cma(cmaLen, pow);
    const initial = opts.initial || {};
    let cash = initial.cash || 0;
    let pos = initial.pos || 0;
    let entryPrice = initial.entryPrice ?? null;
    let commissionPaid = initial.commission || 0;
    let buys = 0;
    let sells = 0;
    const rows = [];
    const capAt = (price) => maxAbsPositionAt(price, volConfig, opts);
    const from = Math.max(0, startIdx);
    const to = Math.min(endIdx, candles.length - 1);
    const barSpan = Math.max(1, to - from + 1);
    const barProgressStep = opts.yieldUi
      ? Math.max(1, Math.floor(barSpan / 24))
      : Math.max(1, Math.floor(barSpan / 48));

    for (let i = from; i <= to; i++) {
      const candle = candles[i];
      if (!candle) continue;
      if (typeof opts.onProgress === "function" && (i === to || (i - from) % barProgressStep === 0)) {
        opts.onProgress(i - from + 1, barSpan, candles[i]?.time);
      }
      const price = tradeCloses[i];
      const signalPrice = signalCloses[i];
      const s = cma[i];
      let buy = 0;
      let sell = 0;
      let posStop = null;
      const posBefore = pos;

      if (useStops && pos !== 0 && entryPrice != null) {
        const a = atrSlTp[i];
        if (a != null && a > 0) {
          let hit = false;
          if (pos > 0) {
            if (slAtr > 0 && price <= entryPrice - slAtr * a) {
              hit = true;
              posStop = "sl";
            } else if (tpAtr > 0 && price >= entryPrice + tpAtr * a) {
              hit = true;
              posStop = "tp";
            }
          } else {
            if (slAtr > 0 && price >= entryPrice + slAtr * a) {
              hit = true;
              posStop = "sl";
            } else if (tpAtr > 0 && price <= entryPrice - tpAtr * a) {
              hit = true;
              posStop = "tp";
            }
          }
          if (hit) {
            cash += pos * price;
            const comm = commissionCost(price, Math.abs(pos), volConfig);
            cash -= comm;
            commissionPaid += comm;
            sells += Math.abs(pos);
            pos = 0;
            entryPrice = null;
            portfolioSyncPos(opts, 0, price);
          }
        }
      }

      if (s != null) {
        const d = signalPrice - s;
        const scale = calcTradeVolume(price, volConfig) / Math.max(price, 1e-9);
        if (side === "above") {
          buy = Math.max(d, 0) * scale;
          sell = Math.max(-d, 0) * scale;
        } else {
          buy = Math.max(-d, 0) * scale;
          sell = Math.max(d, 0) * scale;
        }
        if (isReverseSidesEnabled(opts)) ({ buy, sell } = swapTradeVolumes(buy, sell));
        const cap = capAt(price);
        if (pos + buy - sell > cap) buy = Math.max(0, cap - pos + sell);
        if (pos + buy - sell < -cap) sell = Math.max(0, pos + buy + cap);
        cash += price * (sell - buy);
        const comm = commissionCost(price, buy + sell, volConfig);
        cash -= comm;
        commissionPaid += comm;
        pos += buy - sell;
        buys += buy;
        sells += sell;
        portfolioSyncPos(opts, pos, price);
      }

      if (pos === 0) {
        entryPrice = null;
      } else if (posBefore === 0 || Math.sign(pos) !== Math.sign(posBefore)) {
        entryPrice = price;
      }

      pushRow(rows, candle, {
        cma: s,
        buy,
        sell,
        posStop,
        cash,
        pos,
        commission: commissionPaid,
        eq: cash + pos * (price || 0),
        ...smaTradeMarkerFields(posBefore, pos, posStop, opts.logicId)
      }, posBefore);
    }
    const last = rows.at(-1);
    return {
      rows,
      finresp: last?.eq ?? 0,
      cash: last?.cash ?? 0,
      pos: last?.pos ?? 0,
      commission: commissionPaid,
      buys,
      sells,
      entryPrice
    };
  }

  /**
   * SMA-эталон с коридором ±K×ATR вокруг SMA.
   * trend: выше верхней границы — покупка, ниже нижней — продажа (объём ∝ выход за коридор).
   * anti: наоборот. Внутри коридора — без новых сделок по сигналу.
   */
  function simulateSmaCorridor(candles, smaLen, mode, corridorAtr, startIdx, endIdx, volConfig, options) {
    const opts = options || {};
    const signalCandles = opts.signalCandles || candles;
    const slAtr = Math.max(0, Number(opts.slAtr) || 0);
    const tpAtr = Math.max(0, Number(opts.tpAtr) || 0);
    const atrLen = Math.max(2, Number(opts.slTpAtrLen) || DEFAULT_PARAMS.slTpAtrLen);
    const corridorK = Math.max(0, Number(corridorAtr) || 0);
    const useStops = slAtr > 0 || tpAtr > 0;
    const cache = opts.indicatorCache || new IndicatorCache(signalCandles);
    const atrSlTp = cache.atr(atrLen);
    const signalCloses = signalCandles.map((c) => c.close);
    const tradeCloses = candles.map((c) => c.close);
    const sma = cache.sma(smaLen);
    const initial = opts.initial || {};
    let cash = initial.cash || 0;
    let pos = initial.pos || 0;
    let entryPrice = initial.entryPrice ?? null;
    let commissionPaid = initial.commission || 0;
    let buys = 0;
    let sells = 0;
    const rows = [];
    const capAt = (price) => maxAbsPositionAt(price, volConfig, opts);
    const from = Math.max(0, startIdx);
    const to = Math.min(endIdx, candles.length - 1);
    const barSpan = Math.max(1, to - from + 1);
    const barProgressStep = opts.yieldUi
      ? Math.max(1, Math.floor(barSpan / 24))
      : Math.max(1, Math.floor(barSpan / 48));
    const isTrend = mode !== "anti";

    for (let i = from; i <= to; i++) {
      const candle = candles[i];
      if (!candle) continue;
      if (typeof opts.onProgress === "function" && (i === to || (i - from) % barProgressStep === 0)) {
        opts.onProgress(i - from + 1, barSpan, candles[i]?.time);
      }
      const price = tradeCloses[i];
      const signalPrice = signalCloses[i];
      const s = sma[i];
      const a = atrSlTp[i];
      let buy = 0;
      let sell = 0;
      let posStop = null;
      const posBefore = pos;
      let smaUpper = null;
      let smaLower = null;

      if (useStops && pos !== 0 && entryPrice != null && a != null && a > 0) {
        let hit = false;
        if (pos > 0) {
          if (slAtr > 0 && price <= entryPrice - slAtr * a) {
            hit = true;
            posStop = "sl";
          } else if (tpAtr > 0 && price >= entryPrice + tpAtr * a) {
            hit = true;
            posStop = "tp";
          }
        } else {
          if (slAtr > 0 && price >= entryPrice + slAtr * a) {
            hit = true;
            posStop = "sl";
          } else if (tpAtr > 0 && price <= entryPrice - tpAtr * a) {
            hit = true;
            posStop = "tp";
          }
        }
        if (hit) {
          cash += pos * price;
          const comm = commissionCost(price, Math.abs(pos), volConfig);
          cash -= comm;
          commissionPaid += comm;
          sells += Math.abs(pos);
          pos = 0;
          entryPrice = null;
          portfolioSyncPos(opts, 0, price);
        }
      }

      if (s != null && a != null && a > 0) {
        const band = corridorK * a;
        smaUpper = s + band;
        smaLower = s - band;
        const scale = calcTradeVolume(price, volConfig) / Math.max(price, 1e-9);
        if (signalPrice > smaUpper) {
          const excess = signalPrice - smaUpper;
          if (isTrend) buy = excess * scale;
          else sell = excess * scale;
        } else if (signalPrice < smaLower) {
          const excess = smaLower - signalPrice;
          if (isTrend) sell = excess * scale;
          else buy = excess * scale;
        }
        if (isReverseSidesEnabled(opts)) ({ buy, sell } = swapTradeVolumes(buy, sell));
        const cap = capAt(price);
        if (pos + buy - sell > cap) buy = Math.max(0, cap - pos + sell);
        if (pos + buy - sell < -cap) sell = Math.max(0, pos + buy + cap);
        cash += price * (sell - buy);
        const comm = commissionCost(price, buy + sell, volConfig);
        cash -= comm;
        commissionPaid += comm;
        pos += buy - sell;
        buys += buy;
        sells += sell;
        portfolioSyncPos(opts, pos, price);
      }

      if (pos === 0) {
        entryPrice = null;
      } else if (posBefore === 0 || Math.sign(pos) !== Math.sign(posBefore)) {
        entryPrice = price;
      }

      pushRow(rows, candle, {
        sma: s,
        smaUpper,
        smaLower,
        buy,
        sell,
        posStop,
        cash,
        pos,
        commission: commissionPaid,
        eq: cash + pos * (price || 0),
        ...smaTradeMarkerFields(posBefore, pos, posStop, opts.logicId)
      }, posBefore);
    }
    const last = rows.at(-1);
    return {
      rows,
      finresp: last?.eq ?? 0,
      cash: last?.cash ?? 0,
      pos: last?.pos ?? 0,
      commission: commissionPaid,
      buys,
      sells,
      entryPrice
    };
  }

  /** Применение настроек/результата: `applySlTpParams`. */
  function applySlTpParams(parsed, params) {
    const p = { ...DEFAULT_PARAMS, ...params };
    if (parsed.slTpMode !== "pct") {
      parsed.slAtr = Math.max(0, Number(p.SL) || 0);
      parsed.tpAtr = Math.max(0, Number(p.TP) || 0);
      parsed.slPct = 0;
      parsed.tpPct = 0;
      parsed.slTpMode = "atr";
    }
    parsed.slTpAtrLen = Math.max(2, Number(p.slTpAtrLen) || DEFAULT_PARAMS.slTpAtrLen);
    return parsed;
  }

  /** Разрешение id/метаданных: `resolveLogicLineRaw`. */
  function resolveLogicLineRaw(logicId, customLines) {
    return LOG_REG.resolveLine(logicId, customLines);
  }

  /** Разбор строки/времени/ключа: `parseAtrMultToken`. */
  function parseAtrMultToken(raw) {
    if (raw == null || raw === "") return null;
    const s = String(raw).trim();
    if (!s || s.startsWith("@")) return null;
    const n = parseFloat(s.replace(/ATR/gi, ""));
    return Number.isFinite(n) ? n : null;
  }

  /** SMA(100;Vol)(Ab|Bl) и SMA(100;Spread=1ATR)(Trend|Anti) → параметры объёмной/коридорной модели. */
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
        Number(pm.L) || ( /^\d+/.test(String(paramsRaw).trim()) ? parseInt(paramsRaw, 10) : 3)
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

  /** CMA(N;P=…;Vol)(Ab|Bl) → объёмная модель вокруг кастомной SMA. */
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
   * Одна логика каталога → spec для runOnCandles (Op/Cl или SMA с Vol / Spread).
   */
  function resolveLogicSpec(logicId, customLines, params, indicatorSelection) {
    const p = { ...DEFAULT_PARAMS, ...params };
    const rawLine = resolveLogicLineRaw(logicId, customLines);
    if (!String(rawLine).trim()) {
      return { type: "logic_line", parsed: null, line: "", logicId, disabled: true };
    }
    const line = substituteParams(rawLine, p);
    const smaModel = PARSER.parseSmaModelFromLine(line);
    if (smaModel?.model === "spread") {
      return {
        type: "sma_spread",
        smaLen: smaModel.smaLen,
        side: smaModel.side,
        line,
        logicId,
        slAtr: Math.max(0, Number(p.SL) || 0),
        tpAtr: Math.max(0, Number(p.TP) || 0),
        slTpAtrLen: Math.max(2, Number(p.slTpAtrLen) || DEFAULT_PARAMS.slTpAtrLen),
        disabled: !isIndicatorEnabled(indicatorSelection, "sma"),
        indicators: normalizeIndicatorSelection(indicatorSelection)
      };
    }
    if (smaModel?.model === "corridor") {
      const corridorRaw = smaModel.corridorAtr != null && Number.isFinite(smaModel.corridorAtr)
        ? smaModel.corridorAtr
        : Number(p.smaCorridorAtr);
      return {
        type: "sma_corridor",
        smaLen: smaModel.smaLen,
        mode: smaModel.mode,
        corridorAtr: Number.isFinite(corridorRaw) ? Math.max(0, corridorRaw) : DEFAULT_PARAMS.smaCorridorAtr,
        line,
        logicId,
        slAtr: Math.max(0, Number(p.SL) || 0),
        tpAtr: Math.max(0, Number(p.TP) || 0),
        slTpAtrLen: Math.max(2, Number(p.slTpAtrLen) || DEFAULT_PARAMS.slTpAtrLen),
        disabled: !isIndicatorEnabled(indicatorSelection, "sma") || !isIndicatorEnabled(indicatorSelection, "atr"),
        indicators: normalizeIndicatorSelection(indicatorSelection)
      };
    }
    const cmaModel = PARSER.parseCmaModelFromLine(line);
    if (cmaModel?.model === "spread") {
      return {
        type: "cma_spread",
        cmaLen: cmaModel.cmaLen,
        cmaPow: cmaModel.cmaPow,
        side: cmaModel.side,
        line,
        logicId,
        slAtr: Math.max(0, Number(p.SL) || 0),
        tpAtr: Math.max(0, Number(p.TP) || 0),
        slTpAtrLen: Math.max(2, Number(p.slTpAtrLen) || DEFAULT_PARAMS.slTpAtrLen),
        disabled: !isIndicatorEnabled(indicatorSelection, "cma"),
        indicators: normalizeIndicatorSelection(indicatorSelection)
      };
    }
    const baseParsed = PARSER.parseLogicLine(line);
    const opLongAtoms = filterAtomsByIndicators(baseParsed.opLongAtoms, indicatorSelection);
    const opShortAtoms = filterAtomsByIndicators(baseParsed.opShortAtoms, indicatorSelection);
    const clLongAtoms = filterAtomsByIndicators(baseParsed.clLongAtoms, indicatorSelection);
    const clShortAtoms = filterAtomsByIndicators(baseParsed.clShortAtoms, indicatorSelection);
    const parsed = applySlTpParams({
      ...baseParsed,
      opLongAtoms,
      opShortAtoms,
      clLongAtoms,
      clShortAtoms,
      opAtoms: [...opLongAtoms, ...opShortAtoms],
      clAtoms: [...clLongAtoms, ...clShortAtoms],
      indicators: normalizeIndicatorSelection(indicatorSelection)
    }, p);
    return { type: "logic_line", parsed, line, logicId };
  }

  /**
   * Несколько выбранных логик → один spec.
   * 2+ logic_line → { type: "multi_logic", specs, logicIds };
   * одна логика или SMA → обычный spec (sma_spread / logic_line).
   * SMA не смешивается в стек с L1…L5 — при нескольких id берётся первая допустимая одиночная.
   */
  function resolveLogicSpecStack(logicIds, customLines, params, indicatorSelection) {
    const ids = (Array.isArray(logicIds) ? logicIds : [logicIds]).map(String).filter(Boolean);
    if (!ids.length) return null;
    const specs = ids.map((id) => resolveLogicSpec(id, customLines, params, indicatorSelection)).filter(Boolean);
    if (!specs.length) return null;
    const logicSpecs = specs.filter((s) => s.type === "logic_line" && !s.disabled);
    if (specs.length === 1) return specs[0];
    if (logicSpecs.length >= 2) {
      return { type: "multi_logic", specs: logicSpecs, logicIds: logicSpecs.map((s) => s.logicId).filter(Boolean) };
    }
    return specs[0];
  }

  function summarizeLogicBarSignals(sig) {
    if (!sig) return { longOp: false, shortOp: false, longCl: false, shortCl: false };
    return {
      longOp: !!sig.longOpHit,
      shortOp: !!sig.shortOpHit,
      longCl: !!sig.longClHit,
      shortCl: !!sig.shortClHit
    };
  }

  /** Снимок Op/Cl на одном баре (live-диагностика: был ли сигнал входа/выхода). */
  function probeLogicSignalsAtBar(candles, spec, params, options) {
    const opts = options || {};
    if (!candles?.length || !spec) return { ready: false, reason: "no_data" };
    const p = { ...DEFAULT_PARAMS, ...params };
    const b = Math.min(candles.length - 1, Math.max(0, opts.barIndex ?? candles.length - 1));
    let w = warmupBars();
    if (spec.type === "logic_line" && spec.parsed) {
      w = logicWarmupBars(applySlTpParams({ ...spec.parsed }, p));
    } else if (spec.type === "multi_logic") {
      const parsedList = (spec.specs || [])
        .filter((s) => s?.type === "logic_line" && !s.disabled)
        .map((s) => applySlTpParams({ ...s.parsed }, p));
      if (parsedList.length) w = Math.max(...parsedList.map((x) => logicWarmupBars(x)), 1);
    }
    if (b < w) return { ready: false, reason: "warmup", barIndex: b, needBars: w };
    const cache = new IndicatorCache(candles);
    const pos = +opts.pos || 0;
    const posCtx = buildPosCtx(pos, opts.entryBarIdx ?? null, opts.entryMid ?? null, opts.entryBeta ?? null);

    if (spec.type === "multi_logic") {
      const hits = [];
      for (const s of spec.specs || []) {
        if (!s || s.type !== "logic_line" || s.disabled) continue;
        const parsed = applySlTpParams({ ...s.parsed }, p);
        const sig = logicLineExecSignals(parsed, cache, b, posCtx, opts);
        hits.push({ logicId: s.logicId || "?", ...summarizeLogicBarSignals(sig) });
      }
      const primary = hits.find((h) => h.longOp || h.shortOp || h.longCl || h.shortCl) || hits[0] || null;
      return { ready: true, barIndex: b, multi: true, hits, logicId: primary?.logicId, ...primary };
    }
    if (spec.type === "logic_line") {
      const parsed = applySlTpParams({ ...spec.parsed }, p);
      const sig = logicLineExecSignals(parsed, cache, b, posCtx, opts);
      return { ready: true, barIndex: b, logicId: spec.logicId || "?", ...summarizeLogicBarSignals(sig) };
    }
    if (spec.type === "sma_spread" || spec.type === "sma_corridor" || spec.type === "cma_spread") {
      const last = opts.lastRow || {};
      return {
        ready: true,
        barIndex: b,
        logicId: spec.logicId || spec.type,
        smaModel: spec.type !== "cma_spread",
        cmaModel: spec.type === "cma_spread",
        lastBuy: +last.buy || 0,
        lastSell: +last.sell || 0
      };
    }
    return { ready: false, reason: "spec_type", type: spec.type };
  }

  /**
   * Прогон spec по одному ряду свечей (один инструмент, окно startIdx…endIdx).
   * multi_logic → simulateMultiLogicStack; logic_line → simulateLogicLine; sma_spread → simulateSmaSpread.
   */
  function runOnCandles(candles, spec, startIdx, endIdx, params, volConfig, options) {
    if (!candles?.length) {
      return { rows: [], finresp: 0, cash: 0, pos: 0, commission: 0, buys: 0, sells: 0, entryPrice: null };
    }
    const prep = options?.preparedRun;
    const p = prep?.p || { ...DEFAULT_PARAMS, ...params };
    const opts = {
      ...(options || {}),
      reverse: options?.reverseSides != null ? !!options.reverseSides : options?.reverse != null ? !!options.reverse : !!(p.ReverseSides ?? p.Reverse)
    };
    if (!spec || spec.disabled) return simulateNoSignalRows(candles, startIdx, endIdx, opts);
    const vol = prep?.vol || normalizedVolConfig(volConfig);
    if (spec.type === "multi_logic") {
      return simulateMultiLogicStack(candles, spec.specs, startIdx, endIdx, vol, opts, p);
    }
    if (spec.type === "sma_spread") {
      return simulateSmaSpread(candles, spec.smaLen, spec.side, startIdx, endIdx, vol, {
        ...opts,
        logicId: spec.logicId,
        slAtr: spec.slAtr,
        tpAtr: spec.tpAtr,
        slTpAtrLen: spec.slTpAtrLen
      });
    }
    if (spec.type === "sma_corridor") {
      return simulateSmaCorridor(candles, spec.smaLen, spec.mode, spec.corridorAtr, startIdx, endIdx, vol, {
        ...opts,
        logicId: spec.logicId,
        slAtr: spec.slAtr,
        tpAtr: spec.tpAtr,
        slTpAtrLen: spec.slTpAtrLen
      });
    }
    if (spec.type === "cma_spread") {
      return simulateCmaSpread(candles, spec.cmaLen, spec.cmaPow, spec.side, startIdx, endIdx, vol, {
        ...opts,
        logicId: spec.logicId,
        slAtr: spec.slAtr,
        tpAtr: spec.tpAtr,
        slTpAtrLen: spec.slTpAtrLen
      });
    }
    const parsed = prep?.parsed || applySlTpParams({ ...spec.parsed }, p);
    return simulateLogicLine(candles, parsed, startIdx, endIdx, vol, { ...opts, logicId: spec.logicId });
  }

  /** Запуск расчёта: `runOnCandlesYielding`. */
  async function runOnCandlesYielding(candles, spec, startIdx, endIdx, params, volConfig, options) {
    const opts = options || {};
    const a = startIdx;
    const b = endIdx;
    const span = Math.max(1, b - a + 1);
    if (!candles?.length || b < a) {
      return { rows: [], finresp: 0, cash: 0, pos: 0, commission: 0, buys: 0, sells: 0, entryPrice: null };
    }

    const signalCandles = opts.signalCandles || candles;
    const indicatorCache = opts.indicatorCache || new IndicatorCache(signalCandles);
    const chunkSize = yieldChunkSize(span);
    let initial = { ...(opts.initial || {}) };
    const allRows = [];
    let buys = 0;
    let sells = 0;
    let commission = 0;
    let first = true;

    for (let ca = a; ca <= b; ca += chunkSize) {
      if (typeof opts.shouldCancel === "function" && opts.shouldCancel()) break;
      const cb = Math.min(b, ca + chunkSize - 1);
      const chunkOpts = {
        ...opts,
        signalCandles,
        indicatorCache,
        yieldUi: !!opts.yieldUi,
        initial,
        skipWarmup: !first || opts.skipWarmup,
        onProgress: typeof opts.onProgress === "function"
          ? (doneInChunk, chunkSpan, candleTime) => {
            const doneInRange = (ca - a) + Math.max(0, Math.min(chunkSpan, doneInChunk));
            opts.onProgress(doneInRange, span, candleTime);
          }
          : null
      };
      const r = runOnCandles(candles, spec, ca, cb, params, volConfig, chunkOpts);
      if (r.rows?.length) allRows.push(...r.rows);
      buys += r.buys || 0;
      sells += r.sells || 0;
      commission = r.commission ?? commission;
      const last = r.rows?.at(-1);
      if (last) {
        initial = {
          cash: last.cash,
          pos: last.pos,
          commission: last.commission,
          entryPrice: r.entryPrice ?? initial.entryPrice ?? null
        };
      }
      const doneInRange = cb - a + 1;
      if (typeof opts.onProgress === "function") {
        opts.onProgress(doneInRange, span, candles[cb]?.time);
      }
      if (opts.yieldUi) await delay(0);
      first = false;
    }

    const last = allRows.at(-1);
    return {
      rows: allRows,
      finresp: last?.eq ?? 0,
      cash: last?.cash ?? 0,
      pos: last?.pos ?? 0,
      commission,
      buys,
      sells,
      entryPrice: initial.entryPrice ?? null
    };
  }

  /** Подпрограмма `findCandleIndexByTime`. */
  function findCandleIndexByTime(candles, time) {
    if (!candles?.length || !time) return -1;
    return candles.findIndex((c) => c.time === time);
  }

  /** Подпрограмма `findCandleIndexAtOrBefore`. */
  function findCandleIndexAtOrBefore(candles, time) {
    if (!candles?.length || !time) return -1;
    let idx = -1;
    for (let i = 0; i < candles.length; i++) {
      const t = candles[i]?.time;
      if (!t) continue;
      if (t <= time) idx = i;
      else break;
    }
    return idx;
  }

  /** Подпрограмма `indicesForTimeRange`. */
  function indicesForTimeRange(candles, tStart, tEnd) {
    if (!candles?.length || !tStart || !tEnd) return null;
    let a = -1;
    let b = -1;
    for (let i = 0; i < candles.length; i++) {
      const t = candles[i]?.time;
      if (!t) continue;
      if (t < tStart) continue;
      if (t > tEnd) break;
      if (a < 0) a = i;
      b = i;
    }
    if (a < 0 || b < a) return null;
    return { a, b };
  }

  /** Индекс свечи на время t (точное совпадение или последняя ≤ t). */
  function candleIndexAtTime(candles, time) {
    if (!candles?.length || !time) return -1;
    let idx = -1;
    for (let i = 0; i < candles.length; i++) {
      const t = candles[i]?.time;
      if (!t) continue;
      if (t === time) return i;
      if (t < time) idx = i;
      else break;
    }
    return idx;
  }

  /**
   * Кэш params/vol/parsed для runPacksOnTimeGrid (тысячи вызовов runOnCandles по одному бару).
   */
  function buildGridSimulationPrep(spec, params, volConfig, indicatorCache, options) {
    const p = { ...DEFAULT_PARAMS, ...params };
    const vol = normalizedVolConfig(volConfig);
    const reverse = options?.reverseSides != null ? !!options.reverseSides : options?.reverse != null ? !!options.reverse : !!(p.ReverseSides ?? p.Reverse);
    const reverseSignals = options?.reverseSignals != null ? !!options.reverseSignals : !!p.ReverseSignals;
    const prep = { p, vol, reverse, reverseSignals };
    if (!spec || spec.disabled) return prep;
    if (spec.type === "multi_logic") {
      const logicSpecs = (spec.specs || []).filter((s) => s && s.type === "logic_line" && !s.disabled);
      const parsedList = logicSpecs.map((s) => applySlTpParams({ ...s.parsed }, p));
      let atrByLen = null;
      if (indicatorCache && parsedList.length > 1) {
        const atrLenSet = new Set(parsedList.map((x) => x.slTpAtrLen || DEFAULT_PARAMS.slTpAtrLen));
        atrByLen = new Map([...atrLenSet].map((len) => [len, indicatorCache.atr(len)]));
      }
      prep.preparedStack = { p, vol, logicSpecs, parsedList, atrByLen };
      return prep;
    }
    if (spec.type === "logic_line" && spec.parsed) {
      prep.parsed = applySlTpParams({ ...spec.parsed }, p);
    }
    return prep;
  }

  function initGridContexts(packs, workUnits, spec, params, volConfig, signalPacks, options) {
    const gridPrepBase = buildGridSimulationPrep(spec, params, volConfig, null, options);
    const ctxs = [];
    for (const wu of workUnits || []) {
      const candles = packs[wu.pi];
      if (!candles?.length) continue;
      const sec = wu.sec || candles[0]?.sec || "?";
      const signalCandles = signalPacks?.[wu.pi] || candles;
      const indicatorCache = new IndicatorCache(signalCandles);
      const gridPrep = buildGridSimulationPrep(spec, params, volConfig, indicatorCache, options);
      let preparedStack = gridPrep.preparedStack || null;
      if (preparedStack && !preparedStack.atrByLen && preparedStack.parsedList?.length > 1) {
        const atrLenSet = new Set(preparedStack.parsedList.map((x) => x.slTpAtrLen || DEFAULT_PARAMS.slTpAtrLen));
        preparedStack = {
          ...preparedStack,
          atrByLen: new Map([...atrLenSet].map((len) => [len, indicatorCache.atr(len)]))
        };
      }
      ctxs.push({
        pi: wu.pi,
        sec,
        candles,
        signalCandles,
        indicatorCache,
        range: wu.range,
        rows: [],
        initial: {},
        buys: 0,
        sells: 0,
        commission: 0,
        entryPrice: null,
        preparedRun: gridPrep,
        preparedStack
      });
    }
    // TotCandles: средняя OHLC по всем выбранным инструментам (для TotStoch и будущих tot-индикаторов).
    // Важно: массив должен быть согласован по индексам с signalCandles, т.к. evaluateAtom использует idx.
    const wantTot = (() => {
      const walkAtoms = (parsed) => {
        if (!parsed) return false;
        for (const a of [...(parsed.opAtoms || []), ...(parsed.clAtoms || [])]) {
          if (indicatorKey(a?.kind) === "totstoch") return true;
        }
        return false;
      };
      if (!spec || spec.disabled) return false;
      if (spec.type === "logic_line") return walkAtoms(spec.parsed);
      if (spec.type === "multi_logic") return (spec.specs || []).some((s) => s?.type === "logic_line" && walkAtoms(s.parsed));
      return false;
    })();
    if (wantTot && ctxs.length) {
      const maxLen = Math.max(...ctxs.map((c) => c.signalCandles?.length || 0), 0);
      const totCandles = new Array(maxLen).fill(null).map((_, i) => {
        let n = 0;
        let o = 0, h = 0, l = 0, cl = 0;
        let time = "";
        for (const c of ctxs) {
          const bar = c.signalCandles?.[i];
          if (!bar) continue;
          const oo = bar.open ?? bar.close;
          const hh = bar.high ?? bar.close;
          const ll = bar.low ?? bar.close;
          const cc = bar.close;
          if (cc == null) continue;
          if (!time && bar.time) time = bar.time;
          n += 1;
          o += +oo || 0;
          h += +hh || 0;
          l += +ll || 0;
          cl += +cc || 0;
        }
        if (!n) return null;
        return { time, open: o / n, high: h / n, low: l / n, close: cl / n, sec: "TOT" };
      });
      for (const ctx of ctxs) {
        ctx.indicatorCache = new IndicatorCache(ctx.signalCandles, { totCandles });
        // пересобрать preparedStack.atrByLen, если нужен
        const gridPrep = buildGridSimulationPrep(spec, params, volConfig, ctx.indicatorCache, options);
        ctx.preparedRun = gridPrep;
        ctx.preparedStack = gridPrep.preparedStack || ctx.preparedStack;
        if (ctx.preparedStack && !ctx.preparedStack.atrByLen && ctx.preparedStack.parsedList?.length > 1) {
          const atrLenSet = new Set(ctx.preparedStack.parsedList.map((x) => x.slTpAtrLen || DEFAULT_PARAMS.slTpAtrLen));
          ctx.preparedStack = {
            ...ctx.preparedStack,
            atrByLen: new Map([...atrLenSet].map((len) => [len, ctx.indicatorCache.atr(len)]))
          };
        }
      }
    }
    return { ctxs, gridPrepBase };
  }

  /** Шаг yield UI на сетке времени: не чаще ~96 раз за прогон. */
  function gridYieldStride(totalSteps) {
    return Math.max(1, Math.floor(Math.max(1, totalSteps) / 96));
  }

  /**
   * Синхронный проход по сетке времени: общий портфельный лимит на все инструменты.
   * На каждом баре каждый инструмент получает один шаг runOnCandles(i,i).
   */
  function runPacksOnTimeGrid(packs, workUnits, times, spec, params, volConfig, options) {
    const opts = options || {};
    const signalPacks = opts.signalPacks;
    const portfolioCap = opts.portfolioCap || createPortfolioCap(volConfig);
    const { ctxs, gridPrepBase } = initGridContexts(packs, workUnits, spec, params, volConfig, signalPacks, opts);

    const totalSteps = Math.max(1, (times?.length || 0) * ctxs.length);
    let doneSteps = 0;
    const progressStride = typeof opts.progressStride === "number"
      ? Math.max(1, opts.progressStride)
      : gridYieldStride(totalSteps);

    for (let ti = 0; ti < (times?.length || 0); ti++) {
      const t = times[ti];
      if (typeof opts.shouldCancel === "function" && opts.shouldCancel()) break;
      for (const ctx of ctxs) {
        const i = findCandleIndexAtOrBefore(ctx.candles, t);
        if (i < 0 || i < ctx.range.a || i > ctx.range.b) continue;
        const price = ctx.candles[i]?.close || 0;
        portfolioCap.setPrice(ctx.sec, price);
        portfolioCap.setPos(ctx.sec, ctx.initial.pos || 0, price);
        const runOpts = {
          sec: ctx.sec,
          portfolioCap,
          signalCandles: ctx.signalCandles,
          preparedRun: ctx.preparedRun,
          ...(ctx.preparedStack ? { preparedStack: ctx.preparedStack } : {}),
          ...(ctx.indicatorCache ? { indicatorCache: ctx.indicatorCache } : {}),
          initial: ctx.initial,
          skipWarmup: true,
          shouldCancel: opts.shouldCancel,
          reverse: gridPrepBase.reverse,
          reverseSignals: gridPrepBase.reverseSignals
        };
        const r = runOnCandles(ctx.candles, spec, i, i, params, volConfig, runOpts);
        ctx.initial = simContinuationFromResult(r);
        ctx.entryPrice = r.entryPrice ?? ctx.entryPrice;
        ctx.commission = r.commission ?? ctx.commission;
        ctx.buys += r.buys || 0;
        ctx.sells += r.sells || 0;
        if (r.rows?.length) ctx.rows.push(...r.rows);
        doneSteps += 1;
        if (typeof opts.onStep === "function" && (doneSteps % progressStride === 0 || doneSteps === totalSteps)) {
          opts.onStep({
            doneSteps,
            totalSteps,
            ti,
            t,
            sec: ctx.sec,
            candleTime: t
          });
        }
      }
    }

    return {
      portfolioCap,
      perSec: ctxs.map((ctx) => {
        const last = ctx.rows.at(-1);
        return {
          sec: ctx.sec,
          rows: ctx.rows,
          finresp: last?.eq ?? 0,
          cash: last?.cash ?? 0,
          pos: last?.pos ?? 0,
          commission: ctx.commission,
          buys: ctx.buys,
          sells: ctx.sells,
          entryPrice: ctx.entryPrice,
          ...(ctx.indicatorCache ? { indicatorCache: ctx.indicatorCache } : {}),
          ...(ctx.preparedRun ? { preparedRun: ctx.preparedRun } : {}),
          ...(ctx.preparedStack ? { preparedStack: ctx.preparedStack } : {})
        };
      })
    };
  }

  /** Асинхронный runPacksOnTimeGrid с yield для UI. */
  async function runPacksOnTimeGridAsync(packs, workUnits, times, spec, params, volConfig, options) {
    const opts = { ...(options || {}), yieldUi: true };
    const signalPacks = opts.signalPacks;
    const portfolioCap = opts.portfolioCap || createPortfolioCap(volConfig);
    const { ctxs, gridPrepBase } = initGridContexts(packs, workUnits, spec, params, volConfig, signalPacks, opts);

    const totalSteps = Math.max(1, (times?.length || 0) * ctxs.length);
    const yieldStride = gridYieldStride(totalSteps);
    let doneSteps = 0;

    for (let ti = 0; ti < (times?.length || 0); ti++) {
      const t = times[ti];
      if (typeof opts.shouldCancel === "function" && opts.shouldCancel()) break;
      for (const ctx of ctxs) {
        const i = findCandleIndexAtOrBefore(ctx.candles, t);
        if (i < 0 || i < ctx.range.a || i > ctx.range.b) continue;
        const price = ctx.candles[i]?.close || 0;
        portfolioCap.setPrice(ctx.sec, price);
        portfolioCap.setPos(ctx.sec, ctx.initial.pos || 0, price);
        const runOpts = {
          sec: ctx.sec,
          portfolioCap,
          signalCandles: ctx.signalCandles,
          preparedRun: ctx.preparedRun,
          ...(ctx.preparedStack ? { preparedStack: ctx.preparedStack } : {}),
          ...(ctx.indicatorCache ? { indicatorCache: ctx.indicatorCache } : {}),
          initial: ctx.initial,
          skipWarmup: true,
          shouldCancel: opts.shouldCancel,
          reverse: gridPrepBase.reverse,
          reverseSignals: gridPrepBase.reverseSignals
        };
        const r = runOnCandles(ctx.candles, spec, i, i, params, volConfig, runOpts);
        ctx.initial = simContinuationFromResult(r);
        ctx.entryPrice = r.entryPrice ?? ctx.entryPrice;
        ctx.commission = r.commission ?? ctx.commission;
        ctx.buys += r.buys || 0;
        ctx.sells += r.sells || 0;
        if (r.rows?.length) ctx.rows.push(...r.rows);
        doneSteps += 1;
        const reportStep = typeof opts.onStep === "function"
          && (doneSteps % yieldStride === 0 || doneSteps === totalSteps);
        if (reportStep) {
          await opts.onStep({
            doneSteps,
            totalSteps,
            ti,
            t,
            sec: ctx.sec,
            candleTime: t
          });
        } else if (opts.yieldUi && doneSteps % yieldStride === 0) {
          await delay(0);
        }
      }
    }

    return {
      portfolioCap,
      perSec: ctxs.map((ctx) => {
        const last = ctx.rows.at(-1);
        return {
          sec: ctx.sec,
          rows: ctx.rows,
          finresp: last?.eq ?? 0,
          cash: last?.cash ?? 0,
          pos: last?.pos ?? 0,
          commission: ctx.commission,
          buys: ctx.buys,
          sells: ctx.sells,
          entryPrice: ctx.entryPrice,
          ...(ctx.indicatorCache ? { indicatorCache: ctx.indicatorCache } : {}),
          ...(ctx.preparedRun ? { preparedRun: ctx.preparedRun } : {}),
          ...(ctx.preparedStack ? { preparedStack: ctx.preparedStack } : {})
        };
      })
    };
  }

  /** Подпрограмма `findRowIdxAtOrBefore`. */
  function findRowIdxAtOrBefore(rows, time) {
    if (!rows?.length || !time) return -1;
    let idx = -1;
    for (let i = 0; i < rows.length; i++) {
      if (!rows[i]?.time) continue;
      if (rows[i].time <= time) idx = i;
      else break;
    }
    return idx;
  }

  /** Equity-кривые: `equityAtTime`. */
  function equityAtTime(perSecItem, time) {
    const idx = findRowIdxAtOrBefore(perSecItem.rows, time);
    return idx >= 0 ? perSecItem.rows[idx].eq : 0;
  }

  /** Позиция инструмента на баре triggerTime (для stopper). */
  function posAtRowTime(rows, time) {
    const idx = findRowIdxAtOrBefore(rows, time);
    return idx >= 0 ? (rows[idx]?.pos ?? 0) : 0;
  }

  /**
   * Оптимизация stopper (вариант 1): equity одного инструмента на каждую свечу times[].
   * Два указателя по отсортированным rows/time — O(rows + times), без повторного линейного поиска
   * equityAtTime на каждой итерации цикла stopper × каждый инструмент.
   */
  function buildPerSecEquitySeries(rows, times) {
    if (!times?.length) return [];
    if (!rows?.length) return times.map(() => 0);
    const out = new Array(times.length);
    let rowIdx = -1;
    let lastEq = 0;
    for (let t = 0; t < times.length; t++) {
      const time = times[t];
      while (rowIdx + 1 < rows.length && rows[rowIdx + 1].time <= time) {
        rowIdx += 1;
        lastEq = rows[rowIdx].eq;
      }
      out[t] = rowIdx >= 0 ? lastEq : 0;
    }
    return out;
  }

  /** Суммарная equity портфеля и ряды по инструментам — для быстрого сканирования stopper. */
  function buildPortfolioEquitySeries(perSec, times) {
    if (!perSec?.length || !times?.length) {
      return { total: [], perInstrument: [] };
    }
    const perInstrument = perSec.map((p) => buildPerSecEquitySeries(p.rows, times));
    const total = times.map((_, t) => {
      let sum = 0;
      for (let s = 0; s < perInstrument.length; s++) sum += perInstrument[s][t] || 0;
      return sum;
    });
    return { total, perInstrument };
  }

  /** Частичное обновление equity после stopper: только затронутые инструменты с bar t. */
  function patchPortfolioEquitySeries(portfolioEq, perSec, times, fromTimeIndex, affectedIndices) {
    if (!portfolioEq?.perInstrument?.length || !affectedIndices?.length || !times?.length) return;
    for (const s of affectedIndices) {
      portfolioEq.perInstrument[s] = buildPerSecEquitySeries(perSec[s].rows, times);
    }
    const from = Math.max(0, fromTimeIndex);
    for (let ti = from; ti < times.length; ti++) {
      let sum = 0;
      for (let s = 0; s < portfolioEq.perInstrument.length; s++) {
        sum += portfolioEq.perInstrument[s][ti] || 0;
      }
      portfolioEq.total[ti] = sum;
    }
  }

  function stopperResimRunOptions(perSecItem, signalPack) {
    return {
      ...(signalPack ? { signalCandles: signalPack } : {}),
      ...(perSecItem?.indicatorCache ? { indicatorCache: perSecItem.indicatorCache } : {}),
      ...(perSecItem?.preparedRun ? { preparedRun: perSecItem.preparedRun } : {}),
      ...(perSecItem?.preparedStack ? { preparedStack: perSecItem.preparedStack } : {})
    };
  }

  /** @returns {number[]} индексы инструментов, у которых пересчитан хвост */
  function resimInstrumentsAtStopper(perSec, packs, spec, triggerTime, endTime, params, volConfig, signalPacks, progressOpts, stopperStep, stopperTotal) {
    const onProgress = progressOpts?.onProgress;
    const affected = [];
    for (let s = 0; s < perSec.length; s++) {
      const sec = perSec[s].sec || packs[s]?.[0]?.sec || "?";
      const posAtTrigger = posAtRowTime(perSec[s].rows, triggerTime);
      if (posAtTrigger === 0) continue;
      if (onProgress) {
        onProgress(stopperStep, stopperTotal, triggerTime, {
          resim: true,
          sec,
          instIndex: s,
          instTotal: perSec.length
        });
      }
      const runOptions = stopperResimRunOptions(perSec[s], signalPacks?.[s]);
      if (flattenAndResimTail(perSec[s], packs[s], spec, triggerTime, endTime, params, volConfig, runOptions)) {
        affected.push(s);
      }
    }
    return affected;
  }

  function refreshPortfolioEquityAfterStopper(portfolioEq, perSec, times, triggerTimeIndex, affected) {
    if (!affected?.length) return portfolioEq;
    if (affected.length === perSec.length) {
      return buildPortfolioEquitySeries(perSec, times);
    }
    patchPortfolioEquitySeries(portfolioEq, perSec, times, triggerTimeIndex, affected);
    return portfolioEq;
  }

  /** Построение структуры данных: `buildPortfolioEquityRows`. */
  function buildPortfolioEquityRows(perSec, times) {
    if (!perSec?.length || !times?.length) return [];
    const { total } = buildPortfolioEquitySeries(perSec, times);
    return times.map((time, i) => ({ time, eq: total[i] }));
  }

  /** Подпрограмма `portfolioEquityAtr`. */
  function portfolioEquityAtr(history, index, length) {
    if (!history?.length || index < length) return null;
    let sum = 0;
    for (let i = index - length + 1; i <= index; i++) {
      const cur = history[i];
      const prev = history[i - 1];
      if (!cur || !prev) return null;
      sum += Math.abs(cur.equity - prev.equity);
    }
    return sum / length;
  }

  /** Live / мониторинг: срабатывание портфельного SL/TP на последней точке equityHistory. */
  function checkPortfolioStopperTrigger(equityHistory, cfg, referenceEquity) {
    const stopper = { ...DEFAULT_STOPPER, ...cfg };
    if ((!stopper.useSl && !stopper.useTp) || !equityHistory?.length) return null;
    const idx = equityHistory.length - 1;
    const totalEq = equityHistory[idx].equity;
    if (!Number.isFinite(totalEq)) return null;
    let ref = referenceEquity;
    if (ref == null || !Number.isFinite(ref)) ref = equityHistory[0]?.equity;
    if (!Number.isFinite(ref)) return null;
    const atrLen = Math.max(1, stopper.atrLen || DEFAULT_STOPPER.atrLen);
    if (idx < atrLen) return null;
    const atr = portfolioEquityAtr(equityHistory, idx, atrLen);
    if (atr == null || atr <= 0) return null;
    let kind = null;
    let triggerLevel = ref;
    if (stopper.useSl && stopper.slMult > 0 && totalEq <= ref - stopper.slMult * atr) {
      kind = "sl";
      triggerLevel = ref - stopper.slMult * atr;
    } else if (stopper.useTp && stopper.tpMult > 0 && totalEq >= ref + stopper.tpMult * atr) {
      kind = "tp";
      triggerLevel = ref + stopper.tpMult * atr;
    }
    if (!kind) return null;
    return {
      kind,
      time: equityHistory[idx].time,
      equity: totalEq,
      referenceEquity: ref,
      atr,
      triggerLevel
    };
  }

  /** Подпрограмма `recomputePerSecTotals`. */
  function recomputePerSecTotals(perSecItem) {
    const last = perSecItem.rows.at(-1);
    perSecItem.finresp = last?.eq ?? 0;
    perSecItem.cash = last?.cash ?? 0;
    perSecItem.pos = last?.pos ?? 0;
    perSecItem.commission = last?.commission ?? 0;
    perSecItem.buys = perSecItem.rows.reduce((s, r) => s + (r.buy || 0), 0);
    perSecItem.sells = perSecItem.rows.reduce((s, r) => s + (r.sell || 0), 0);
  }

  /** Подпрограмма `flattenRowAtIdx`. */
  function flattenRowAtIdx(perSecItem, rowIdx, volConfig) {
    const row = { ...perSecItem.rows[rowIdx] };
    if (row.pos !== 0) {
      const price = row.close;
      row.sell = (row.sell || 0) + Math.abs(row.pos);
      row.cash += row.pos * price;
      const comm = commissionCost(price, Math.abs(row.pos), volConfig);
      row.cash -= comm;
      row.commission = (row.commission || 0) + comm;
      row.pos = 0;
      row.eq = row.cash;
    }
    return row;
  }

  /** @returns {boolean} true — хвост пересчитан; false — позиции не было, пересчёт не нужен */
  function flattenAndResimTail(perSecItem, candles, spec, triggerTime, endTime, params, volConfig, runOptions) {
    const rowIdx = findRowIdxAtOrBefore(perSecItem.rows, triggerTime);
    if (rowIdx < 0) return false;
    const existingRow = perSecItem.rows[rowIdx];
    if ((existingRow?.pos ?? 0) === 0) return false;
    const triggerRow = flattenRowAtIdx(perSecItem, rowIdx, volConfig);
    const head = perSecItem.rows.slice(0, rowIdx);
    const localEnd = findCandleIndexAtOrBefore(candles, endTime);
    if (localEnd < 0) {
      perSecItem.rows = [...head, triggerRow];
      recomputePerSecTotals(perSecItem);
      return true;
    }
    const candleIdx = findCandleIndexAtOrBefore(candles, triggerTime);
    if (candleIdx < 0 || candleIdx >= localEnd) {
      perSecItem.rows = [...head, triggerRow];
      recomputePerSecTotals(perSecItem);
      return true;
    }
    const initial = {
      pos: 0,
      cash: triggerRow.cash,
      entryPrice: null,
      commission: triggerRow.commission || 0
    };
    // Оптимизация stopper (вариант 2): indicatorCache с первого FINRESP-прохода —
    // ряды SMA/Stoch/ATR/… уже в памяти, хвост после триггера не пересчитывает индикаторы с нуля.
    const tail = runOnCandles(
      candles,
      spec,
      candleIdx + 1,
      localEnd,
      params,
      volConfig,
      { initial, skipWarmup: true, ...(runOptions || {}) }
    );
    perSecItem.rows = [...head, triggerRow, ...tail.rows];
    recomputePerSecTotals(perSecItem);
    return true;
  }

  /** Портфельный stop-loss/take-profit по equity и ATR. */
  function applyPortfolioStopper(perSec, packs, spec, times, endTime, params, volConfig, cfg, signalPacks, progressOpts) {
    const stopper = { ...DEFAULT_STOPPER, ...cfg };
    const events = [];
    const onProgress = progressOpts?.onProgress;
    const stopperTotal = Math.max(1, times?.length || 1);
    if ((!stopper.useSl && !stopper.useTp) || !perSec.length || !packs.length) {
      return { perSec, stopper: { events } };
    }

    if (!times?.length) return { perSec, stopper: { events } };

    let referenceEquity = stopper.refEquity > 0 ? stopper.refEquity : null;
    let scanFrom = 0;
    const equityHistory = [];
    let stopperStep = 0;
    // Предрасчёт equity по всем инструментам; после триггера пересобираем (rows меняются).
    let portfolioEq = buildPortfolioEquitySeries(perSec, times);

    while (scanFrom < times.length) {
      let triggered = false;

      for (let t = scanFrom; t < times.length; t++) {
        if (typeof progressOpts?.shouldCancel === "function" && progressOpts.shouldCancel()) {
          return { perSec, stopper: { events, referenceEquity, cancelled: true } };
        }
        const time = times[t];
        stopperStep = Math.min(stopperTotal, stopperStep + 1);
        if (onProgress) onProgress(stopperStep, stopperTotal, time);
        const totalEq = portfolioEq.total[t] ?? 0;

        if (referenceEquity == null) referenceEquity = totalEq;
        equityHistory.push({ equity: totalEq, time });
        const idx = equityHistory.length - 1;
        const atrLen = Math.max(1, stopper.atrLen || DEFAULT_STOPPER.atrLen);
        if (idx < atrLen) continue;

        const atr = portfolioEquityAtr(equityHistory, idx, atrLen);
        if (atr == null || atr <= 0) continue;

        let kind = null;
        let triggerLevel = referenceEquity;
        if (stopper.useSl && stopper.slMult > 0 && totalEq <= referenceEquity - stopper.slMult * atr) {
          kind = "sl";
          triggerLevel = referenceEquity - stopper.slMult * atr;
        } else if (stopper.useTp && stopper.tpMult > 0 && totalEq >= referenceEquity + stopper.tpMult * atr) {
          kind = "tp";
          triggerLevel = referenceEquity + stopper.tpMult * atr;
        }
        if (!kind) continue;

        const refAtTrigger = referenceEquity;
        const affected = resimInstrumentsAtStopper(
          perSec, packs, spec, time, endTime, params, volConfig, signalPacks,
          progressOpts, stopperStep, stopperTotal
        );
        events.push({
          kind,
          time,
          equity: totalEq,
          referenceEquity: refAtTrigger,
          atr,
          triggerLevel
        });
        portfolioEq = refreshPortfolioEquityAfterStopper(portfolioEq, perSec, times, t, affected);
        referenceEquity = portfolioEq.total[t] ?? totalEq;
        scanFrom = t + 1;
        triggered = true;
        break;
      }
      if (!triggered) break;
    }

    return { perSec, stopper: { events, referenceEquity } };
  }

  /** Асинхронный портфельный Stopper (yield между шагами — для основного потока). */
  async function applyPortfolioStopperAsync(perSec, packs, spec, times, endTime, params, volConfig, cfg, signalPacks, progressOpts) {
    const opts = progressOpts || {};
    const onProgress = opts.onProgress;
    const yieldUi = !!opts.yieldUi;
    const tick = () => (yieldUi ? delay(0) : Promise.resolve());
    const stopper = { ...DEFAULT_STOPPER, ...cfg };
    const events = [];
    const stopperTotal = Math.max(1, times?.length || 1);
    if ((!stopper.useSl && !stopper.useTp) || !perSec.length || !packs.length) {
      return { perSec, stopper: { events } };
    }
    if (!times?.length) return { perSec, stopper: { events } };

    let referenceEquity = stopper.refEquity > 0 ? stopper.refEquity : null;
    let scanFrom = 0;
    const equityHistory = [];
    let stopperStep = 0;

    if (onProgress) onProgress(0, stopperTotal, times[0], { building: true });
    await tick();
    let portfolioEq = buildPortfolioEquitySeries(perSec, times);
    await tick();

    while (scanFrom < times.length) {
      let triggered = false;

      for (let t = scanFrom; t < times.length; t++) {
        if (typeof opts.shouldCancel === "function" && opts.shouldCancel()) {
          return { perSec, stopper: { events, referenceEquity, cancelled: true } };
        }
        const time = times[t];
        stopperStep = Math.min(stopperTotal, stopperStep + 1);
        if (onProgress) onProgress(stopperStep, stopperTotal, time);
        const totalEq = portfolioEq.total[t] ?? 0;

        if (referenceEquity == null) referenceEquity = totalEq;
        equityHistory.push({ equity: totalEq, time });
        const idx = equityHistory.length - 1;
        const atrLen = Math.max(1, stopper.atrLen || DEFAULT_STOPPER.atrLen);
        if (idx < atrLen) {
          if (yieldUi && t % 48 === 0) await tick();
          continue;
        }

        const atr = portfolioEquityAtr(equityHistory, idx, atrLen);
        if (atr == null || atr <= 0) {
          if (yieldUi && t % 48 === 0) await tick();
          continue;
        }

        let kind = null;
        let triggerLevel = referenceEquity;
        if (stopper.useSl && stopper.slMult > 0 && totalEq <= referenceEquity - stopper.slMult * atr) {
          kind = "sl";
          triggerLevel = referenceEquity - stopper.slMult * atr;
        } else if (stopper.useTp && stopper.tpMult > 0 && totalEq >= referenceEquity + stopper.tpMult * atr) {
          kind = "tp";
          triggerLevel = referenceEquity + stopper.tpMult * atr;
        }
        if (!kind) {
          if (yieldUi && t % 48 === 0) await tick();
          continue;
        }

        const refAtTrigger = referenceEquity;
        const affected = resimInstrumentsAtStopper(
          perSec, packs, spec, time, endTime, params, volConfig, signalPacks,
          progressOpts, stopperStep, stopperTotal
        );
        if (yieldUi) await tick();
        events.push({
          kind,
          time,
          equity: totalEq,
          referenceEquity: refAtTrigger,
          atr,
          triggerLevel
        });
        portfolioEq = refreshPortfolioEquityAfterStopper(portfolioEq, perSec, times, t, affected);
        referenceEquity = portfolioEq.total[t] ?? totalEq;
        scanFrom = t + 1;
        triggered = true;
        await tick();
        break;
      }
      if (!triggered) break;
    }

    return { perSec, stopper: { events, referenceEquity } };
  }

  /** Текст прогресса Stopper (скан / пересчёт / сводка equity). */
  function resolveStopperProgressText(done, total, time, extra) {
    if (extra?.building) return "Stopper портфеля: сводка equity…";
    if (extra?.resim) {
      return stopperResimProgressText(extra.sec, extra.instIndex, extra.instTotal, time);
    }
    return stopperProgressText(done, total, time);
  }

  function moexFileProtocolHint() {
    if (typeof location !== "undefined" && location.protocol === "file:") {
      return " Страница открыта как file:// — браузер блокирует MOEX (CORS). "
        + "Запустите serve-calculator.ps1 в этой папке или откройте через GitHub Pages / http://localhost.";
    }
    return "";
  }

  /** Подпрограмма `moexFetchJson`. */
  async function moexFetchJson(url, context, timeoutMs = 45000) {
    const ctrl = typeof AbortController !== "undefined" ? new AbortController() : null;
    const timer = ctrl ? setTimeout(() => ctrl.abort(), timeoutMs) : null;
    try {
      const r = await fetch(url, ctrl ? { signal: ctrl.signal } : undefined);
      if (!r.ok) throw new Error(`MOEX HTTP ${r.status}${context ? ` (${context})` : ""}`);
      return r.json();
    } catch (err) {
      const msg = err?.message || String(err);
      if (err?.name === "AbortError") {
        throw new Error(`MOEX: таймаут ${Math.round(timeoutMs / 1000)} с${context ? ` (${context})` : ""}.${moexFileProtocolHint()}`);
      }
      if (/Failed to fetch|NetworkError|Load failed|Network request failed/i.test(msg)) {
        throw new Error(`MOEX недоступен (сеть/CORS): ${msg}.${moexFileProtocolHint()}`);
      }
      throw err;
    } finally {
      if (timer) clearTimeout(timer);
    }
  }

  /** Подпрограмма `candlesUrl`. */
  function candlesUrl(sec, market) {
    if (market === "futures") {
      return `https://iss.moex.com/iss/engines/futures/markets/forts/securities/${sec}/candles.json`;
    }
    return `https://iss.moex.com/iss/engines/stock/markets/shares/securities/${sec}/candles.json`;
  }

  /** Подпрограмма `fetchIssSecIds`. */
  async function fetchIssSecIds(baseUrl, columns, filterFn) {
    const ids = [];
    const seen = new Set();
    let start = 0;
    while (true) {
      const url = new URL(baseUrl);
      url.searchParams.set("iss.meta", "off");
      if (columns) url.searchParams.set("securities.columns", columns);
      url.searchParams.set("start", String(start));
      const data = await moexFetchJson(url, "securities");
      const chunk = data?.securities?.data || [];
      const cols = data?.securities?.columns || [];
      if (!chunk.length) break;
      for (const row of chunk) {
        const obj = Object.fromEntries(cols.map((c, i) => [c, row[i]]));
        if (filterFn && !filterFn(obj)) continue;
        const id = obj.SECID;
        if (id && !seen.has(id)) {
          seen.add(id);
          ids.push(id);
        }
      }
      if (chunk.length < 100) break;
      start += chunk.length;
      if (start > 20000) break;
    }
    return ids.sort();
  }

  /** Подпрограмма `listShareTickers`. */
  function listShareTickers(stockPrefixesRaw) {
    return parseTickerPrefixes(stockPrefixesRaw || DEFAULT_STOCK_TICKERS_RAW);
  }

  /** Подпрограмма `fetchShareList`. */
  async function fetchShareList(stockPrefixesRaw) {
    return listShareTickers(stockPrefixesRaw);
  }

  /** Подпрограмма `listFuturesPrefixes`. */
  function listFuturesPrefixes(futuresPrefixesRaw) {
    return parseTickerPrefixes(futuresPrefixesRaw || DEFAULT_FUTURES_PREFIXES_RAW);
  }

  /** Подпрограмма `fetchFuturesList`. */
  async function fetchFuturesList(futuresPrefixesRaw, period) {
    const prefixes = parseTickerPrefixes(futuresPrefixesRaw || DEFAULT_FUTURES_PREFIXES_RAW);
    if (!prefixes.length) return [];
    const today = new Date().toISOString().slice(0, 10);
    const from = normMoexDate(period?.from) || today;
    const till = normMoexDate(period?.till) || from;
    return fetchIssSecIds(
      "https://iss.moex.com/iss/engines/futures/markets/forts/securities.json",
      "SECID,ASSETCODE,LASTTRADEDATE,FIRSTTRADEDATE,BOARDID",
      (o) => o.BOARDID === "RFUD"
        && o.ASSETCODE
        && futuresTickerMatches(o.SECID, prefixes)
        && futuresMatchesCalcPeriod(o, from, till)
    );
  }

  /** Проверка булева условия: `isFullFuturesSecid`. */
  function isFullFuturesSecid(secid) {
    const s = String(secid || "").trim();
    if (!s) return false;
    if (isPerpetualFuture(s)) return true;
    return /-\d/.test(s) || /\d/.test(s.slice(-2));
  }

  /** Подпрограмма `expandFuturesSelection`. */
  async function expandFuturesSelection(selectedSecs, futuresPrefixesRaw, period) {
    const selected = new Set((selectedSecs || []).map((s) => String(s || "").trim()).filter(Boolean));
    if (!selected.size) return [];
    const all = await fetchFuturesList(futuresPrefixesRaw, period);
    const prefixList = listFuturesPrefixes(futuresPrefixesRaw);
    const allPrefixesSelected = prefixList.length > 0
      && prefixList.every((p) => selected.has(p))
      && selected.size === prefixList.length;
    if (allPrefixesSelected) return all;
    const out = new Set();
    for (const sec of all) {
      if (selected.has(sec)) {
        out.add(sec);
        continue;
      }
      for (const sel of selected) {
        if (isFullFuturesSecid(sel)) continue;
        if (futuresTickerMatches(sec, [sel])) {
          out.add(sec);
          break;
        }
      }
    }
    for (const sel of selected) {
      if (isFullFuturesSecid(sel)) out.add(sel);
    }
    return [...out].sort();
  }

  /** Разрешение id/метаданных: `resolveFuturesMoexSec`. */
  async function resolveFuturesMoexSec(secOrPrefix, period) {
    const key = String(parseTickerPrefixes(secOrPrefix)[0] || "").trim();
    if (!key) return null;
    if (isFullFuturesSecid(key)) return key;
    const today = new Date().toISOString().slice(0, 10);
    const from = normMoexDate(period?.from) || today;
    const till = normMoexDate(period?.till) || from;
    const keyUpper = key.toUpperCase();
    let exact = null;
    let front = null;
    let start = 0;
    while (true) {
      const url = new URL("https://iss.moex.com/iss/engines/futures/markets/forts/securities.json");
      url.searchParams.set("iss.meta", "off");
      url.searchParams.set("securities.columns", "SECID,ASSETCODE,LASTTRADEDATE,FIRSTTRADEDATE,BOARDID");
      url.searchParams.set("start", String(start));
      const data = await moexFetchJson(url, key);
      const chunk = data?.securities?.data || [];
      const cols = data?.securities?.columns || [];
      if (!chunk.length) break;
      for (const row of chunk) {
        const o = Object.fromEntries(cols.map((c, i) => [c, row[i]]));
        if (o.BOARDID !== "RFUD" || !o.ASSETCODE) continue;
        if (!futuresMatchesCalcPeriod(o, from, till)) continue;
        const secid = String(o.SECID || "");
        if (secid.toUpperCase() !== keyUpper && !futuresTickerMatches(secid, [key])) continue;
        if (secid.toUpperCase() === keyUpper) exact = o;
        if (!front || String(o.LASTTRADEDATE) < String(front.LASTTRADEDATE)) front = o;
      }
      if (chunk.length < 100) break;
      start += chunk.length;
      if (start > 20000) break;
    }
    return exact?.SECID || front?.SECID || null;
  }

  /** Разрешение id/метаданных: `resolveFuturesContract`. */
  async function resolveFuturesContract(secOrPrefix, period) {
    return resolveFuturesMoexSec(secOrPrefix, period);
  }

  const AGGREGATED_INTERVALS = {
    "5": { moexInterval: "1", minutes: 5 },
    "15": { moexInterval: "1", minutes: 15 }
  };

  /** Разрешение id/метаданных: `resolveIntervalLoad`. */
  function resolveIntervalLoad(interval) {
    const key = String(interval);
    const agg = AGGREGATED_INTERVALS[key];
    if (agg) {
      return { cacheInterval: key, moexInterval: agg.moexInterval, aggMinutes: agg.minutes };
    }
    return { cacheInterval: key, moexInterval: key, aggMinutes: 0 };
  }

  /** Агрегация: `aggregateCandles`. */
  function aggregateCandles(candles, minutes) {
    if (!candles?.length || minutes <= 1) return candles || [];
    const ms = minutes * 60 * 1000;
    const buckets = new Map();
    for (const c of candles) {
      const t = new Date(String(c.time).replace(" ", "T")).getTime();
      if (!Number.isFinite(t)) continue;
      const key = Math.floor(t / ms);
      let b = buckets.get(key);
      if (!b) {
        buckets.set(key, {
          open: c.open,
          high: c.high,
          low: c.low,
          close: c.close,
          volume: c.volume,
          time: c.time,
          sec: c.sec,
          market: c.market,
          key
        });
      } else {
        b.high = Math.max(b.high, c.high);
        b.low = Math.min(b.low, c.low);
        b.close = c.close;
        b.volume += c.volume;
        b.time = c.time;
      }
    }
    return [...buckets.values()]
      .sort((a, b) => a.key - b.key)
      .map(({ key, ...rest }) => rest);
  }

  /** Загрузка данных: `loadMoexCandles`. */
  async function loadMoexCandles(sec, from, till, interval, market = "shares") {
    const all = [];
    let start = 0;
    while (true) {
      const url = new URL(candlesUrl(sec, market));
      url.search = new URLSearchParams({ from, till, interval, start: String(start) }).toString();
      const data = await moexFetchJson(url, sec);
      const chunk = data?.candles?.data || [];
      if (!chunk.length) break;
      all.push(...chunk);
      if (chunk.length < 500) break;
      start += chunk.length;
      if (start > 20000) break;
    }
    const seen = new Set();
    return all
      .filter((r) => {
        if (seen.has(r[6])) return false;
        seen.add(r[6]);
        return true;
      })
      .map((r) => ({
        open: +r[0],
        close: +r[1],
        high: +r[2],
        low: +r[3],
        volume: +r[5],
        time: r[6],
        sec,
        market
      }));
  }

  /** Загрузка данных: `loadMoexCandlesResolved`. */
  async function loadMoexCandlesResolved(sec, from, till, interval, market = "shares") {
    const { moexInterval, aggMinutes } = resolveIntervalLoad(interval);
    const raw = await loadMoexCandles(sec, from, till, moexInterval, market);
    return aggMinutes > 1 ? aggregateCandles(raw, aggMinutes) : raw;
  }

  /** Подпрограмма `quotationToNumber`. */
  function quotationToNumber(q) {
    if (!q) return 0;
    return Number(q.units ?? 0) + Number(q.nano ?? 0) / 1e9;
  }

  /** T-Bank REST API: `tbankTimeToMs`. */
  function tbankTimeToMs(time) {
    if (!time) return NaN;
    if (typeof time === "string") return new Date(time).getTime();
    if (time.seconds != null) {
      return Number(time.seconds) * 1000 + Math.floor(Number(time.nanos || 0) / 1e6);
    }
    return NaN;
  }

  /** Форматирование для отображения: `formatCandleTimeMsk`. */
  function formatCandleTimeMsk(ms) {
    if (!Number.isFinite(ms)) return "";
    const parts = new Intl.DateTimeFormat("en-GB", {
      timeZone: "Europe/Moscow",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false
    }).formatToParts(new Date(ms));
    const g = (t) => parts.find((p) => p.type === t)?.value || "00";
    return `${g("year")}-${g("month")}-${g("day")} ${g("hour")}:${g("minute")}:${g("second")}`;
  }

  /** T-Bank REST API: `tbankIntervalForCalcTf`. */
  function tbankIntervalForCalcTf(tf) {
    const map = {
      "1": "CANDLE_INTERVAL_1_MIN",
      "5": "CANDLE_INTERVAL_5_MIN",
      "10": "CANDLE_INTERVAL_10_MIN",
      "15": "CANDLE_INTERVAL_15_MIN",
      "60": "CANDLE_INTERVAL_HOUR",
      "24": "CANDLE_INTERVAL_DAY"
    };
    return map[String(tf)] || "CANDLE_INTERVAL_HOUR";
  }

  /** T-Bank REST API: `tbankCandleChunkDays`. */
  function tbankCandleChunkDays(tf) {
    if (String(tf) === "24") return 365;
    if (String(tf) === "60") return 7;
    return 1;
  }

  /** Live-торговля: `liveTbankTailHours`. */
  function liveTbankTailHours(tf) {
    const map = { "1": 8, "5": 24, "10": 36, "15": 48, "60": 168, "24": 720 };
    return map[String(tf)] || 24;
  }

  /** Разбор строки/времени/ключа: `parseTbankHistoricCandles`. */
  function parseTbankHistoricCandles(candles, sec, market) {
    const out = [];
    for (const c of candles || []) {
      const ms = tbankTimeToMs(c.time);
      if (!Number.isFinite(ms)) continue;
      out.push({
        open: quotationToNumber(c.open),
        high: quotationToNumber(c.high),
        low: quotationToNumber(c.low),
        close: quotationToNumber(c.close),
        volume: Number(c.volume ?? 0),
        time: formatCandleTimeMsk(ms),
        sec,
        market
      });
    }
    return out.sort((a, b) => a.time.localeCompare(b.time));
  }

  const CANDLE_CACHE_VERSION = 2;
  const CANDLE_CACHE_DB_NAME = "MultiLogicFinrespCandlesDB";
  const CANDLE_CACHE_STORE = "candles";

  /** Подпрограмма `cacheNormDay`. */
  function cacheNormDay(value) {
    if (!value) return "";
    return String(value).slice(0, 10);
  }

  /** Слияние: `mergeCandleSeries`. */
  function mergeCandleSeries(existing, incoming) {
    const map = new Map();
    for (const c of existing || []) {
      if (c?.time) map.set(c.time, c);
    }
    for (const c of incoming || []) {
      if (c?.time) map.set(c.time, { ...c });
    }
    return [...map.values()].sort((a, b) => String(a.time).localeCompare(String(b.time)));
  }

  /** Подпрограмма `createCandleCache`. */
  function createCandleCache(options) {
    const dbName = options?.dbName || CANDLE_CACHE_DB_NAME;
    const storeName = options?.storeName || CANDLE_CACHE_STORE;
    let dbPromise = null;
    let cachedStats = {
      entries: 0,
      bars: 0,
      usage: null,
      quota: null,
      storage: "IndexedDB",
      dbName,
      ready: false
    };

    /** Подпрограмма `requireIndexedDb`. */
    function requireIndexedDb() {
      if (typeof indexedDB === "undefined") {
        throw new Error("IndexedDB недоступен в этом браузере");
      }
    }

    /** Подпрограмма `openDb`. */
    function openDb() {
      if (dbPromise) return dbPromise;
      requireIndexedDb();
      dbPromise = new Promise((resolve, reject) => {
        const req = indexedDB.open(dbName, CANDLE_CACHE_VERSION);
        req.onupgradeneeded = () => {
          const db = req.result;
          if (!db.objectStoreNames.contains(storeName)) {
            db.createObjectStore(storeName, { keyPath: "key" });
          }
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error || new Error("IndexedDB open failed"));
        req.onblocked = () => reject(new Error("IndexedDB заблокирован другой вкладкой"));
      }).catch((err) => {
        dbPromise = null;
        throw err;
      });
      return dbPromise;
    }

    /** Подпрограмма `txStore`. */
    function txStore(db, mode) {
      return db.transaction(storeName, mode).objectStore(storeName);
    }

    /** Подпрограмма `requestPromise`. */
    function requestPromise(req) {
      return new Promise((resolve, reject) => {
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error || new Error("IndexedDB request failed"));
      });
    }

    /** Подпрограмма `txDone`. */
    function txDone(tx) {
      return new Promise((resolve, reject) => {
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error || new Error("IndexedDB transaction failed"));
        tx.onabort = () => reject(tx.error || new Error("IndexedDB transaction aborted"));
      });
    }

    /** Подпрограмма `entryKey`. */
    function entryKey(market, sec, interval) {
      return `${market}:${String(sec || "").trim().toUpperCase()}:${String(interval)}`;
    }

    /** Подпрограмма `entryCoverage`. */
    function entryCoverage(entry) {
      if (!entry?.candles?.length) return null;
      return {
        from: cacheNormDay(entry.candles[0].time),
        till: cacheNormDay(entry.candles.at(-1).time)
      };
    }

    /** Подпрограмма `entryCovers`. */
    function entryCovers(entry, from, till) {
      const cov = entryCoverage(entry);
      if (!cov) return false;
      return cov.from <= cacheNormDay(from) && cov.till >= cacheNormDay(till);
    }

    /** Подпрограмма `filterCandlesByRange`. */
    function filterCandlesByRange(candles, from, till) {
      const f = cacheNormDay(from);
      const t = cacheNormDay(till);
      return candles.filter((c) => {
        const d = cacheNormDay(c.time);
        return d >= f && d <= t;
      });
    }

    /** Подпрограмма `clonePack`. */
    function clonePack(candles, requestedSec, market) {
      return candles.map((c) => ({ ...c, sec: requestedSec, market }));
    }

    /** Подпрограмма `estimateStorage`. */
    async function estimateStorage() {
      if (typeof navigator === "undefined" || !navigator.storage?.estimate) return;
      try {
        const est = await navigator.storage.estimate();
        cachedStats = {
          ...cachedStats,
          usage: Number.isFinite(est.usage) ? est.usage : null,
          quota: Number.isFinite(est.quota) ? est.quota : null
        };
      } catch (_) { /* estimate is optional */ }
    }

    /** Подпрограмма `recomputeStats`. */
    async function recomputeStats() {
      const db = await openDb();
      let entriesCount = 0;
      let bars = 0;
      await new Promise((resolve, reject) => {
        const req = txStore(db, "readonly").openCursor();
        req.onsuccess = () => {
          const cursor = req.result;
          if (!cursor) {
            resolve();
            return;
          }
          const entry = cursor.value;
          entriesCount += 1;
          bars += entry?.candles?.length || 0;
          cursor.continue();
        };
        req.onerror = () => reject(req.error || new Error("IndexedDB cursor failed"));
      });
      cachedStats = { ...cachedStats, entries: entriesCount, bars, ready: true };
      await estimateStorage();
    }

    /** Получение значения: `getEntry`. */
    async function getEntry(key) {
      const db = await openDb();
      return requestPromise(txStore(db, "readonly").get(key));
    }

    /** Подпрограмма `putEntry`. */
    async function putEntry(entry) {
      const db = await openDb();
      const tx = db.transaction(storeName, "readwrite");
      tx.objectStore(storeName).put(entry);
      await txDone(tx);
    }

    /** Нормализация входных данных: `normalizeEntryForExport`. */
    function normalizeEntryForExport(entry) {
      if (!entry) return null;
      const { key, ...rest } = entry;
      return rest;
    }

    return {
      async load() {
        await recomputeStats();
      },
      async get(requestedSec, market, interval, from, till, altSec) {
        const keys = [entryKey(market, requestedSec, interval)];
        if (altSec) keys.push(entryKey(market, altSec, interval));
        for (const key of keys) {
          const entry = await getEntry(key);
          if (!entry || String(entry.interval) !== String(interval)) continue;
          if (!entryCovers(entry, from, till)) continue;
          const filtered = filterCandlesByRange(entry.candles, from, till);
          if (!filtered.length) continue;
          return clonePack(filtered, requestedSec, market);
        }
        return null;
      },
      async put(requestedSec, market, interval, moexSec, candles) {
        if (!candles?.length) return;
        const key = entryKey(market, requestedSec, interval);
        const normalized = candles.map((c) => ({
          ...c,
          sec: moexSec || requestedSec,
          market
        }));
        const existing = await getEntry(key);
        const oldBars = existing?.candles?.length || 0;
        const merged = mergeCandleSeries(existing?.candles, normalized);
        await putEntry({
          key,
          requestedSec,
          moexSec: moexSec || requestedSec,
          market,
          interval: String(interval),
          candles: merged,
          updatedAt: new Date().toISOString()
        });
        cachedStats = {
          ...cachedStats,
          entries: cachedStats.entries + (existing ? 0 : 1),
          bars: cachedStats.bars - oldBars + merged.length,
          ready: true
        };
        estimateStorage();
      },
      async clear() {
        const db = await openDb();
        const tx = db.transaction(storeName, "readwrite");
        tx.objectStore(storeName).clear();
        await txDone(tx);
        cachedStats = { ...cachedStats, entries: 0, bars: 0, ready: true };
        await estimateStorage();
      },
      async exportJson() {
        const db = await openDb();
        const entries = {};
        await new Promise((resolve, reject) => {
          const req = txStore(db, "readonly").openCursor();
          req.onsuccess = () => {
            const cursor = req.result;
            if (!cursor) {
              resolve();
              return;
            }
            entries[cursor.key] = normalizeEntryForExport(cursor.value);
            cursor.continue();
          };
          req.onerror = () => reject(req.error || new Error("IndexedDB export failed"));
        });
        return JSON.stringify({
          version: CANDLE_CACHE_VERSION,
          entries,
          exportedAt: new Date().toISOString()
        });
      },
      async importJson(jsonStr, merge = true) {
        const data = typeof jsonStr === "string" ? JSON.parse(jsonStr) : jsonStr;
        if (!data?.entries || (data.version !== 1 && data.version !== CANDLE_CACHE_VERSION)) {
          throw new Error("Неверный формат файла базы цен");
        }
        if (!merge) await this.clear();
        for (const [key, entry] of Object.entries(data.entries)) {
          if (!entry?.candles?.length) continue;
          const existing = merge ? await getEntry(key) : null;
          if (existing?.candles?.length) {
            await putEntry({
              ...existing,
              ...entry,
              key,
              candles: mergeCandleSeries(existing.candles, entry.candles)
            });
          } else {
            await putEntry({ ...entry, key });
          }
        }
        await recomputeStats();
        return cachedStats.entries;
      },
      stats() {
        return { ...cachedStats };
      }
    };
  }

  /** Загрузка данных: `loadInstrumentSec`. */
  async function loadInstrumentSec(sec, from, till, interval, market, cache, options) {
    const opts = options || {};
    const requestedSec = sec;
    try {
      let moexSec = sec;
      if (market === "futures") {
        moexSec = await resolveFuturesContract(sec, { from, till });
        if (!moexSec) {
          return { ok: false, error: "нет активного контракта MOEX для префикса", requestedSec };
        }
      }
      if (cache && !opts.forceMoex) {
        const cached = await cache.get(requestedSec, market, interval, from, till, moexSec);
        if (cached?.length >= 3) {
          return { ok: true, pack: cached, requestedSec, fromCache: true };
        }
      }
      const candles = await loadMoexCandlesResolved(moexSec, from, till, interval, market);
      if (!candles.length) {
        return { ok: false, error: "нет свечей MOEX за выбранный период", requestedSec };
      }
      if (cache) await cache.put(requestedSec, market, interval, moexSec, candles);
      return { ok: true, pack: candles, requestedSec, fromCache: false };
    } catch (err) {
      return { ok: false, error: err?.message || String(err), requestedSec };
    }
  }

  /** Обновление данных с источника: `refreshLiveMoexPacks`. */
  async function refreshLiveMoexPacks(instruments, from, till, interval, existingByKey, cache, onProgress) {
    const byKey = new Map(existingByKey || []);
    const failures = [];
    const list = instruments || [];
    let done = 0;
    const queue = [...list];
    const workers = Array.from(
      { length: Math.max(1, Math.min(4, list.length > 8 ? 4 : 2)) },
      async () => {
        while (queue.length) {
          const inst = queue.shift();
          if (!inst) continue;
          const sec = inst.sec;
          const market = inst.market || "shares";
          const r = await loadInstrumentSec(sec, from, till, interval, market, cache, { forceMoex: true });
          done += 1;
          if (onProgress) onProgress(done, list.length, sec, market, { fromCache: false });
          if (r.ok) {
            const key = `${market}:${String(sec || "").trim().toUpperCase()}`;
            const prev = byKey.get(key) || [];
            const merged = mergeCandleSeries(prev, r.pack);
            byKey.set(key, merged.map((c) => ({ ...c, sec, market })));
          } else {
            failures.push({ sec: r.requestedSec || sec, market, error: r.error });
          }
        }
      }
    );
    await Promise.all(workers);
    return { byKey, failures };
  }

  /** Загрузка детальных свечей MOEX для списка инструментов. */
  async function loadManyDetailed(secs, from, till, interval, market = "shares", concurrency, onProgress, cache, shouldCancel) {
    const packs = [];
    const failures = [];
    const queue = [...secs];
    let done = 0;
    const workers = Array.from(
      { length: Math.max(1, concurrency && secs.length > 12 ? concurrency : 1) },
      async () => {
        while (queue.length) {
          if (typeof shouldCancel === "function" && shouldCancel()) break;
          const sec = queue.shift();
          if (!sec) break;
          const r = await loadInstrumentSec(sec, from, till, interval, market, cache);
          if (r.ok) packs.push(r.pack);
          else failures.push({ sec: r.requestedSec || sec, market, error: r.error });
          done += 1;
          if (onProgress) onProgress(done, secs.length, sec, { fromCache: !!r.fromCache });
        }
      }
    );
    await Promise.all(workers);
    packs.sort((a, b) => (a[0]?.sec || "").localeCompare(b[0]?.sec || ""));
    return { packs, failures };
  }

  /** Загрузка данных: `loadMany`. */
  async function loadMany(secs, from, till, interval, market = "shares") {
    const { packs } = await loadManyDetailed(secs, from, till, interval, market);
    return packs;
  }

  /** Загрузка данных: `loadManyBatched`. */
  async function loadManyBatched(secs, from, till, interval, market, concurrency, onProgress) {
    const { packs } = await loadManyDetailed(secs, from, till, interval, market, concurrency, onProgress);
    return packs;
  }

  /** Агрегация: `aggregateFinresp`. */
  function aggregateFinresp(perSecResults) {
    let finresp = 0, cash = 0, pos = 0, commission = 0, buys = 0, sells = 0;
    const bySec = {};
    for (const r of perSecResults) {
      finresp += r.finresp;
      cash += r.cash;
      pos += r.pos;
      commission += r.commission || 0;
      buys += r.buys;
      sells += r.sells;
      bySec[r.sec] = r.finresp;
    }
    return { finresp, cash, pos, commission, buys, sells, bySec };
  }

  const RANDOM_PRICE_SHIFT_MAX = 0.001;

  /** Применение настроек/результата: `applyRandomPriceShift`. */
  function applyRandomPriceShift(packs, maxPct = RANDOM_PRICE_SHIFT_MAX) {
    if (!packs?.length || maxPct <= 0) return packs;
    return packs.map((pack) =>
      pack.map((c) => {
        const r = (Math.random() * 2 - 1) * maxPct;
        const m = 1 + r;
        const open = c.open * m;
        const close = c.close * m;
        let high = c.high * m;
        let low = c.low * m;
        high = Math.max(high, open, close);
        low = Math.min(low, open, close);
        return { ...c, open, high, low, close };
      })
    );
  }

  /** Подпрограмма `delay`. */
  function delay(ms = 0) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /** Форматирование для отображения: `formatProgressTime`. */
  function formatProgressTime(time) {
    if (!time) return "";
    const s = String(time).trim();
    if (s.length >= 16) return s.slice(0, 16);
    return s;
  }

  /** Подпрограмма `finrespProgressText`. */
  function finrespProgressText(sec, doneBars, totalBars, candleTime) {
    const done = Math.max(0, Math.min(totalBars || 0, Math.round(doneBars || 0)));
    const total = Math.max(0, Math.round(totalBars || 0));
    const barsPart = total > 0 ? ` · ${done}/${total} свечей` : "";
    const t = formatProgressTime(candleTime);
    const timePart = t ? ` · ${t}` : "";
    return `Расчёт FINRESP: ${sec}${barsPart}${timePart}`;
  }

  /** Остановка периодического опроса: `stopperProgressText`. */
  function stopperProgressText(doneBars, totalBars, candleTime) {
    const done = Math.max(0, Math.min(totalBars || 0, Math.round(doneBars || 0)));
    const total = Math.max(0, Math.round(totalBars || 0));
    const barsPart = total > 0 ? ` · ${done}/${total} свечей` : "";
    const t = formatProgressTime(candleTime);
    const timePart = t ? ` · ${t}` : "";
    return `Stopper портфеля${barsPart}${timePart}`;
  }

  /** Текст прогресса при пересчёте хвоста после срабатывания Stopper. */
  function stopperResimProgressText(sec, instIndex, instTotal, candleTime) {
    const t = formatProgressTime(candleTime);
    const timePart = t ? ` · ${t}` : "";
    return `Stopper: пересчёт ${sec} (${instIndex + 1}/${instTotal})${timePart}`;
  }

  /** Подпрограмма `yieldChunkSize`. */
  function yieldChunkSize(span) {
    if (span <= 96) return span;
    return Math.max(24, Math.min(72, Math.floor(span / 14)));
  }

  const CALC_PROGRESS = { LOAD_MAX: 33, FINRESP_START: 33, FINRESP_MAX: 66, RUN_MAX: 99 };

  /** Подпрограмма `lerpCalcProgress`. */
  function lerpCalcProgress(from, to, fraction) {
    const f = Math.max(0, Math.min(1, +fraction || 0));
    return from + (to - from) * f;
  }

  /** Подпрограмма `emitFinrespPhaseProgress`. */
  function emitFinrespPhaseProgress(options, done, total, text, finrespEnd, sec, candleTime) {
    const end = finrespEnd ?? CALC_PROGRESS.FINRESP_MAX;
    const t = Math.max(1, +total || 1);
    const d = Math.max(0, Math.min(t, +done || 0));
    emitRunProgress(
      options,
      lerpCalcProgress(CALC_PROGRESS.FINRESP_START, end, d / t),
      text,
      { phase: "finresp", done: d, total: t, candleTime: candleTime || null, sec: sec || "" }
    );
  }

  /** Подпрограмма `emitStopperPhaseProgress`. */
  function emitStopperPhaseProgress(options, done, total, text, candleTime) {
    const t = Math.max(1, +total || 1);
    const d = Math.max(0, Math.min(t, +done || 0));
    emitRunProgress(
      options,
      lerpCalcProgress(CALC_PROGRESS.FINRESP_MAX, CALC_PROGRESS.RUN_MAX, d / t),
      text,
      { phase: "stopper", done: d, total: t, candleTime: candleTime || null, sec: "" }
    );
  }

  /** Подпрограмма `emitRunProgress`. */
  function emitRunProgress(options, pct, text, detail) {
    if (typeof options?.onProgress === "function") {
      options.onProgress(Math.max(0, Math.min(CALC_PROGRESS.RUN_MAX, pct)), text, detail || null);
    }
  }

  /** Подпрограмма `shouldAbortRun`. */
  function shouldAbortRun(options) {
    return typeof options?.shouldCancel === "function" && options.shouldCancel();
  }

  /** Подпрограмма `emitRunProgressAsync`. */
  async function emitRunProgressAsync(options, pct, text, detail) {
    emitRunProgress(options, pct, text, detail);
    if (options?.yieldUi) await delay(0);
  }

  /** Запуск расчёта: `runMultiPlan`. */
  function runMultiPlan(packs, startIdx, endIdx) {
    const emptyAgg = aggregateFinresp([]);
    const ref = longestPack(packs);
    if (!ref.length) {
      return {
        empty: true,
        emptyAgg,
        aRef: 0,
        bRef: 0,
        tStart: null,
        tEnd: null,
        times: [],
        workUnits: [],
        totalBars: 1
      };
    }
    const aRef = Math.max(0, Math.min(startIdx, ref.length - 1));
    const bRef = Math.max(aRef, Math.min(endIdx, ref.length - 1));
    const tStart = ref[aRef]?.time;
    const tEnd = ref[bRef]?.time;
    const times = [];
    for (let i = aRef; i <= bRef; i++) {
      const t = ref[i]?.time;
      if (t) times.push(t);
    }
    const workUnits = [];
    for (let pi = 0; pi < packs.length; pi++) {
      const candles = packs[pi];
      const range = indicesForTimeRange(candles, tStart, tEnd);
      if (!range) continue;
      workUnits.push({
        pi,
        sec: candles[0]?.sec || "?",
        bars: Math.max(1, range.b - range.a + 1),
        range
      });
    }
    return {
      empty: false,
      emptyAgg,
      aRef,
      bRef,
      tStart,
      tEnd,
      times,
      workUnits,
      totalBars: workUnits.reduce((sum, w) => sum + w.bars, 0) || 1
    };
  }

  /**
   * FINRESP по всем packs: по каждому инструменту runOnCandles, затем aggregateFinresp
   * и опционально applyPortfolioStopper (портфельный @SL/@TP по equity).
   */
  function runMulti(packs, spec, startIdx, endIdx, params, volConfig, stopperConfig, options) {
    const opts = options || {};
    const signalPacks = opts.signalPacks;
    const plan = runMultiPlan(packs, startIdx, endIdx);
    if (plan.empty) {
      return {
        perSec: [],
        skipped: [],
        agg: plan.emptyAgg,
        preStopperAgg: plan.emptyAgg,
        stopper: { events: [] },
        a: 0,
        b: 0
      };
    }
    const { aRef, bRef, tStart, tEnd, times, workUnits, totalBars } = plan;
    const cfg = stopperConfig && (stopperConfig.useSl || stopperConfig.useTp) ? stopperConfig : null;
    const stopperBars = cfg ? Math.max(1, times?.length || 1) : 0;
    const finrespEnd = cfg ? CALC_PROGRESS.FINRESP_MAX : CALC_PROGRESS.RUN_MAX;
    let doneBars = 0;
    const perSec = [];
    const activePacks = [];
    const activeSignalPacks = [];
    const skipped = [];

    emitFinrespPhaseProgress(opts, 0, totalBars, "Расчёт FINRESP: старт", finrespEnd, "", null);

    const syncTotalSteps = Math.max(1, (times?.length || 0) * workUnits.length);

    if (workUnits.length > 1) {
      const synced = runPacksOnTimeGrid(packs, workUnits, times, spec, params, volConfig, {
        signalPacks,
        buildIndicatorCache: !!cfg,
        shouldCancel: opts.shouldCancel,
        progressStride: gridYieldStride(syncTotalSteps),
        onStep: ({ doneSteps, totalSteps, sec, candleTime }) => {
          emitFinrespPhaseProgress(
            opts,
            doneSteps,
            totalSteps,
            finrespProgressText(sec, doneSteps, totalSteps, candleTime),
            finrespEnd,
            sec,
            candleTime
          );
        }
      });
      for (let pi = 0; pi < packs.length; pi++) {
        if (!workUnits.some((w) => w.pi === pi)) {
          const sec = packs[pi]?.[0]?.sec || "?";
          skipped.push({ sec, error: "нет свечей в выбранном окне" });
        }
      }
      for (const r of synced.perSec) {
        if (!r.rows?.length) {
          skipped.push({ sec: r.sec, error: "нет данных для расчёта в выбранном окне" });
          continue;
        }
        const wu = workUnits.find((w) => w.sec === r.sec);
        const pi = wu?.pi ?? -1;
        perSec.push(r);
        if (pi >= 0) {
          activePacks.push(packs[pi]);
          if (signalPacks) activeSignalPacks.push(signalPacks[pi] || packs[pi]);
        }
      }
      doneBars = syncTotalSteps;
    } else {
      const portfolioCap = createPortfolioCap(volConfig);
      for (let pi = 0; pi < packs.length; pi++) {
        if (shouldAbortRun(opts)) break;
        const candles = packs[pi];
        const sec = candles[0]?.sec || "?";
        const range = indicesForTimeRange(candles, tStart, tEnd);
        if (!range) {
          skipped.push({ sec, error: "нет свечей в выбранном окне" });
          continue;
        }
        const unit = workUnits.find((w) => w.pi === pi);
        const signalCandles = signalPacks?.[pi] || candles;
        const indicatorCache = cfg ? new IndicatorCache(signalCandles) : null;
        const preparedRun = cfg ? buildGridSimulationPrep(spec, params, vol, indicatorCache, opts) : null;
        const runOpts = {
          sec,
          portfolioCap,
          ...(signalPacks ? { signalCandles } : {}),
          ...(indicatorCache ? { indicatorCache } : {}),
          ...(preparedRun ? { preparedRun } : {}),
          ...(preparedRun?.preparedStack ? { preparedStack: preparedRun.preparedStack } : {}),
          shouldCancel: opts.shouldCancel,
          onProgress: unit
            ? (doneInInstrument, instrumentBars, candleTime) => {
              const absolute = doneBars + Math.max(0, Math.min(instrumentBars, doneInInstrument));
              emitFinrespPhaseProgress(
                opts,
                absolute,
                totalBars,
                finrespProgressText(unit.sec, absolute, totalBars, candleTime),
                finrespEnd,
                unit.sec,
                candleTime
              );
            }
            : undefined
        };
        const r = runOnCandles(candles, spec, range.a, range.b, params, volConfig, runOpts);
        if (!r.rows?.length) {
          skipped.push({ sec, error: "нет данных для расчёта в выбранном окне" });
          continue;
        }
        if (unit) {
          doneBars += unit.bars;
          emitFinrespPhaseProgress(
            opts,
            doneBars,
            totalBars,
            finrespProgressText(sec, doneBars, totalBars, candles[range.b]?.time),
            finrespEnd,
            sec,
            candles[range.b]?.time
          );
        }
        perSec.push({
          sec,
          ...r,
          ...(indicatorCache ? { indicatorCache } : {}),
          ...(preparedRun ? { preparedRun } : {}),
          ...(preparedRun?.preparedStack ? { preparedStack: preparedRun.preparedStack } : {})
        });
        activePacks.push(candles);
        if (signalPacks) activeSignalPacks.push(signalCandles);
      }
    }

    const preStopperAgg = aggregateFinresp(perSec);
    let stopper = { events: [] };
    if (!shouldAbortRun(opts) && cfg && perSec.length) {
      const applied = applyPortfolioStopper(
        perSec,
        activePacks,
        spec,
        times,
        tEnd,
        params,
        volConfig,
        cfg,
        signalPacks ? activeSignalPacks : null,
        {
          shouldCancel: opts.shouldCancel,
          onProgress: (doneInStopper, stopperTotal, candleTime, extra) => {
            const text = extra?.resim
              ? stopperResimProgressText(extra.sec, extra.instIndex, extra.instTotal, candleTime)
              : stopperProgressText(doneInStopper, stopperTotal, candleTime);
            emitStopperPhaseProgress(
              opts,
              doneInStopper,
              stopperTotal,
              text,
              candleTime
            );
          }
        }
      );
      stopper = applied.stopper;
      emitStopperPhaseProgress(
        opts,
        stopperBars,
        stopperBars,
        stopperProgressText(stopperBars, stopperBars, times.at(-1)),
        times.at(-1)
      );
    }
    if (!shouldAbortRun(opts)) {
      emitRunProgress(opts, CALC_PROGRESS.RUN_MAX, "Расчёт FINRESP: готово");
    }
    const agg = aggregateFinresp(perSec);
    return {
      perSec,
      skipped,
      agg,
      preStopperAgg,
      stopper,
      cancelled: shouldAbortRun(opts),
      a: aRef,
      b: bRef,
      tStart,
      tEnd
    };
  }

  /** Асинхронный runMulti с yield для UI/worker. */
  async function runMultiAsync(packs, spec, startIdx, endIdx, params, volConfig, stopperConfig, options) {
    const opts = { ...(options || {}), yieldUi: true };
    const deferStopper = !!opts.deferPortfolioStopper;
    const signalPacks = opts.signalPacks;
    const plan = runMultiPlan(packs, startIdx, endIdx);
    if (plan.empty) {
      return {
        perSec: [],
        skipped: [],
        agg: plan.emptyAgg,
        preStopperAgg: plan.emptyAgg,
        stopper: { events: [] },
        a: 0,
        b: 0
      };
    }
    const { aRef, bRef, tStart, tEnd, times, workUnits, totalBars } = plan;
    const cfg = stopperConfig && (stopperConfig.useSl || stopperConfig.useTp) ? stopperConfig : null;
    const stopperBars = cfg ? Math.max(1, times?.length || 1) : 0;
    const finrespEnd = cfg ? CALC_PROGRESS.FINRESP_MAX : CALC_PROGRESS.RUN_MAX;
    let doneBars = 0;
    const perSec = [];
    const activePacks = [];
    const activeSignalPacks = [];
    const skipped = [];

    await emitRunProgressAsync(opts, CALC_PROGRESS.FINRESP_START, "Расчёт FINRESP: старт", { phase: "finresp", done: 0, total: totalBars });

    const syncTotalSteps = Math.max(1, (times?.length || 0) * workUnits.length);

    if (workUnits.length > 1) {
      const synced = await runPacksOnTimeGridAsync(packs, workUnits, times, spec, params, volConfig, {
        signalPacks,
        buildIndicatorCache: !!cfg,
        shouldCancel: opts.shouldCancel,
        onStep: async ({ doneSteps, totalSteps, sec, candleTime }) => {
          emitFinrespPhaseProgress(
            opts,
            doneSteps,
            totalSteps,
            finrespProgressText(sec, doneSteps, totalSteps, candleTime),
            finrespEnd,
            sec,
            candleTime
          );
          await delay(0);
        }
      });
      for (let pi = 0; pi < packs.length; pi++) {
        if (!workUnits.some((w) => w.pi === pi)) {
          const sec = packs[pi]?.[0]?.sec || "?";
          skipped.push({ sec, error: "нет свечей в выбранном окне" });
        }
      }
      for (const r of synced.perSec) {
        if (!r.rows?.length) {
          skipped.push({ sec: r.sec, error: "нет данных для расчёта в выбранном окне" });
          continue;
        }
        const wu = workUnits.find((w) => w.sec === r.sec);
        const pi = wu?.pi ?? -1;
        perSec.push(r);
        if (pi >= 0) {
          activePacks.push(packs[pi]);
          if (signalPacks) activeSignalPacks.push(signalPacks[pi] || packs[pi]);
        }
      }
      doneBars = syncTotalSteps;
    } else {
      const portfolioCap = createPortfolioCap(volConfig);
      for (let pi = 0; pi < packs.length; pi++) {
        if (shouldAbortRun(opts)) break;
        const candles = packs[pi];
        const sec = candles[0]?.sec || "?";
        const range = indicesForTimeRange(candles, tStart, tEnd);
        if (!range) {
          skipped.push({ sec, error: "нет свечей в выбранном окне" });
          continue;
        }
        const unit = workUnits.find((w) => w.pi === pi);
        const signalCandles = signalPacks?.[pi] || candles;
        const indicatorCache = cfg ? createIndicatorCache(signalCandles) : null;
        const preparedRun = cfg ? buildGridSimulationPrep(spec, params, vol, indicatorCache, opts) : null;
        const runOpts = {
          sec,
          portfolioCap,
          ...(signalPacks ? { signalCandles } : {}),
          ...(indicatorCache ? { indicatorCache } : {}),
          ...(preparedRun ? { preparedRun } : {}),
          ...(preparedRun?.preparedStack ? { preparedStack: preparedRun.preparedStack } : {}),
          yieldUi: true,
          shouldCancel: opts.shouldCancel,
          onProgress: unit
            ? (doneInInstrument, instrumentBars, candleTime) => {
              const absolute = doneBars + Math.max(0, Math.min(instrumentBars, doneInInstrument));
              emitFinrespPhaseProgress(
                opts,
                absolute,
                totalBars,
                finrespProgressText(unit.sec, absolute, totalBars, candleTime),
                finrespEnd,
                unit.sec,
                candleTime
              );
            }
            : undefined
        };
        const r = await runOnCandlesYielding(candles, spec, range.a, range.b, params, volConfig, runOpts);
        if (!r.rows?.length) {
          skipped.push({ sec, error: "нет данных для расчёта в выбранном окне" });
          continue;
        }
        if (unit) {
          doneBars += unit.bars;
          await emitRunProgressAsync(
            opts,
            lerpCalcProgress(CALC_PROGRESS.FINRESP_START, finrespEnd, doneBars / totalBars),
            finrespProgressText(sec, doneBars, totalBars, candles[range.b]?.time),
            { phase: "finresp", done: doneBars, total: totalBars, candleTime: candles[range.b]?.time, sec }
          );
        }
        perSec.push({
          sec,
          ...r,
          ...(indicatorCache ? { indicatorCache } : {}),
          ...(preparedRun ? { preparedRun } : {}),
          ...(preparedRun?.preparedStack ? { preparedStack: preparedRun.preparedStack } : {})
        });
        activePacks.push(candles);
        if (signalPacks) activeSignalPacks.push(signalCandles);
      }
    }

    const preStopperAgg = aggregateFinresp(perSec);
    let stopper = { events: [] };
    if (!shouldAbortRun(opts) && cfg && perSec.length && !deferStopper) {
      await emitRunProgressAsync(
        opts,
        CALC_PROGRESS.FINRESP_MAX,
        "Stopper портфеля: подготовка…",
        { phase: "stopper", done: 0, total: stopperBars }
      );
      const applied = await applyPortfolioStopperAsync(
        perSec,
        activePacks,
        spec,
        times,
        tEnd,
        params,
        volConfig,
        cfg,
        signalPacks ? activeSignalPacks : null,
        {
          yieldUi: true,
          shouldCancel: opts.shouldCancel,
          onProgress: (doneInStopper, stopperTotal, candleTime, extra) => {
            const text = resolveStopperProgressText(doneInStopper, stopperTotal, candleTime, extra);
            emitStopperPhaseProgress(
              opts,
              doneInStopper,
              stopperTotal,
              text,
              candleTime
            );
          }
        }
      );
      stopper = applied.stopper;
      await emitRunProgressAsync(
        opts,
        lerpCalcProgress(CALC_PROGRESS.FINRESP_MAX, CALC_PROGRESS.RUN_MAX, 1),
        stopperProgressText(stopperBars, stopperBars, times.at(-1)),
        { phase: "stopper", done: stopperBars, total: stopperBars, candleTime: times.at(-1) }
      );
    }
    if (!shouldAbortRun(opts)) {
      await emitRunProgressAsync(opts, CALC_PROGRESS.RUN_MAX, "Расчёт FINRESP: готово");
    }
    const agg = aggregateFinresp(perSec);
    return {
      perSec,
      skipped,
      agg,
      preStopperAgg,
      stopper,
      cancelled: shouldAbortRun(opts),
      deferredStopper: !!(deferStopper && cfg && perSec.length),
      a: aRef,
      b: bRef,
      tStart,
      tEnd
    };
  }

  root.MultiLogicFinrespEngine = {
    CALC_PROGRESS,
    lerpCalcProgress,
    DEFAULT_PARAMS,
    DEFAULT_STOPPER,
    DEFAULT_VOLUME,
    DEFAULT_COMMISSION,
    normalizeCommission,
    tradeCommission,
    INDICATOR_OPTIONS,
    DEFAULT_LOGIC_LINES,
    BUILTIN_META,
    calcTradeVolume,
    portfolioGrossCapRub,
    createPortfolioCap,
    runPacksOnTimeGrid,
    runPacksOnTimeGridAsync,
    indicesForTimeRange,
    candleIndexAtTime,
    ORDER_BOOK_TREND_TOKEN,
    DEFAULT_OB_IMBALANCE,
    logicUsesObTrend,
    detectObTrendMode,
    sumOrderBookLevels,
    evaluateOrderBookTrend,
    substituteParams,
    parseLogicLine,
    normalizeIndicatorSelection,
    resolveLogicSpec,
    resolveLogicSpecStack,
    probeLogicSignalsAtBar,
    runOnCandles,
    runMulti,
    runMultiAsync,
    runMultiPlan,
    applyPortfolioStopperAsync,
    resolveStopperProgressText,
    aggregateFinresp,
    buildPortfolioEquityRows,
    portfolioEquityAtr,
    checkPortfolioStopperTrigger,
    loadMany,
    loadManyBatched,
    loadManyDetailed,
    loadInstrumentSec,
    refreshLiveMoexPacks,
    mergeCandleSeries,
    listShareTickers,
    listFuturesPrefixes,
    resolveFuturesContract,
    DEFAULT_STOCK_TICKERS_RAW,
    DEFAULT_FUTURES_PREFIXES_RAW,
    parseTickerPrefixes,
    stockTickerMatches,
    futuresTickerMatches,
    fetchShareList,
    fetchFuturesList,
    expandFuturesSelection,
    futuresMatchesCalcPeriod,
    isFullFuturesSecid,
    createCandleCache,
    CANDLE_CACHE_VERSION,
    moexFileProtocolHint,
    resolveIntervalLoad,
    aggregateCandles,
    quotationToNumber,
    tbankTimeToMs,
    formatCandleTimeMsk,
    tbankIntervalForCalcTf,
    tbankCandleChunkDays,
    liveTbankTailHours,
    parseTbankHistoricCandles,
    applyRandomPriceShift,
    RANDOM_PRICE_SHIFT_MAX,
    smaSeries,
    cmaSeries,
    tradeMarkersFromBar,
    swapLogicExecHits,
    tradeSignalHint,
    createIndicatorCache,
    collectChartIndicatorsForSpecs
  };
})(typeof window !== "undefined" ? window : globalThis);
