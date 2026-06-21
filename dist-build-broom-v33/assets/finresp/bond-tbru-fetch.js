/*
 * Загрузка и разбор состава TBRU с porti.ru (через локальный proxy или напрямую).
 */
(function (root) {
  "use strict";

  const PORTI_URL = "https://porti.ru/etf/holders/MOEX:TBRU";
  const LOCAL_PROXY = "http://127.0.0.1:4201/finresp-tbru-holdings";
  const DEFAULT_MAX_ATTEMPTS_PER_BAR = 3;
  const ISIN_RE = /\b(SU|RU)[0-9A-Z]{10,12}\b/g;
  const WEIGHT_RE = /\|\s*#\d+\s*\|\s*([\d.]+)\s*\|/g;
  let fetchCache = null;
  let fetchCacheAt = 0;
  /** barKey → { attempts, exhausted } */
  const barAttempts = new Map();

  function tfStepMs(calcTf) {
    const map = {
      "1": 60000,
      "5": 300000,
      "10": 600000,
      "15": 900000,
      "60": 3600000,
      "24": 86400000
    };
    return map[String(calcTf)] || 3600000;
  }

  function liveBarKey(calcTf) {
    const tfMs = tfStepMs(calcTf || "60");
    return String(Math.floor(Date.now() / tfMs) * tfMs);
  }

  function attemptGate(barKey, maxAttempts) {
    if (barKey == null || barKey === "") {
      return {
        allow: true,
        exhausted: false,
        attempts: 0,
        record() {}
      };
    }
    const max = Math.max(1, +maxAttempts || DEFAULT_MAX_ATTEMPTS_PER_BAR);
    let st = barAttempts.get(barKey);
    if (!st) {
      st = { attempts: 0, exhausted: false };
      barAttempts.set(barKey, st);
    }
    if (barAttempts.size > 24) {
      const drop = barAttempts.keys().next().value;
      barAttempts.delete(drop);
    }
    if (st.exhausted || st.attempts >= max) {
      st.exhausted = true;
      return { allow: false, exhausted: true, attempts: st.attempts, max };
    }
    return {
      allow: true,
      exhausted: false,
      attempts: st.attempts,
      max,
      record(success) {
        if (success) {
          st.attempts = 0;
          st.exhausted = false;
          return;
        }
        st.attempts += 1;
        if (st.attempts >= max) st.exhausted = true;
      }
    };
  }

  function getBarAttemptState(barKey) {
    return barAttempts.get(String(barKey)) || { attempts: 0, exhausted: false };
  }

  function resetBarAttempts(barKey) {
    if (barKey != null) barAttempts.delete(String(barKey));
    else barAttempts.clear();
  }

  /** Разбор HTML/Markdown porti.ru → [{ sec, weight }, …] в порядке фонда. */
  function parsePortiHoldingsHtml(html) {
    const text = String(html || "");
    const isins = [];
    const seen = new Set();
    let m;
    while ((m = ISIN_RE.exec(text)) !== null) {
      const u = m[0].toUpperCase();
      if (!seen.has(u)) {
        seen.add(u);
        isins.push(u);
      }
    }
    const weights = [];
    while ((m = WEIGHT_RE.exec(text)) !== null) {
      const w = +m[1];
      if (Number.isFinite(w) && w >= 0) weights.push(w);
    }
    if (!isins.length || !weights.length) {
      throw new Error("porti.ru: не найдены ISIN или доли в ответе");
    }
    const n = Math.min(isins.length, weights.length);
    const out = [];
    for (let i = 0; i < n; i++) out.push({ sec: isins[i], weight: weights[i] });
    return out;
  }

  function dataApi() {
    return root.MultiLogicFinrespBondTbru;
  }

  /** Применить пары к каталогу (сохранить nominal/coupon из прошлого среза). */
  function applyHoldingsPairs(pairs) {
    const api = dataApi();
    if (!api?.applyHoldings || !pairs?.length) return false;
    api.applyHoldings(pairs);
    return true;
  }

  /**
   * Загрузить состав с porti.ru.
   * barKey — идентификатор бара TF (live) или дня (расчёт); не более maxAttemptsPerBar неудач на barKey.
   * @returns {Promise<Array|null>} holdings после apply или null (остаётся последний / встроенный срез).
   */
  async function fetchPortiHoldings(opts) {
    const o = opts || {};
    const barKey = o.barKey != null ? String(o.barKey) : null;
    const gate = attemptGate(barKey, o.maxAttemptsPerBar);
    if (!gate.allow) {
      return fetchCache || dataApi()?.holdings || null;
    }
    const minInterval = Math.max(0, +o.minIntervalMs || 0);
    if (fetchCache && minInterval > 0 && (Date.now() - fetchCacheAt) < minInterval) {
      gate.record(true);
      return fetchCache;
    }
    const urls = [];
    if (o.proxy !== false) urls.push(o.proxyUrl || LOCAL_PROXY);
    urls.push(PORTI_URL);
    for (const url of urls) {
      try {
        const res = await fetch(url, { cache: "no-store" });
        if (!res.ok) continue;
        const ct = String(res.headers.get("content-type") || "");
        if (ct.includes("application/json")) {
          const j = await res.json();
          const pairs = j?.holdings || j?.pairs;
          if (pairs?.length && applyHoldingsPairs(pairs)) {
            fetchCache = dataApi()?.holdings || pairs;
            fetchCacheAt = Date.now();
            gate.record(true);
            return fetchCache;
          }
          continue;
        }
        const html = await res.text();
        const pairs = parsePortiHoldingsHtml(html);
        if (applyHoldingsPairs(pairs)) {
          fetchCache = dataApi()?.holdings || null;
          fetchCacheAt = Date.now();
          gate.record(true);
          return fetchCache;
        }
      } catch (_) { /* try next url */ }
    }
    gate.record(false);
    return fetchCache || dataApi()?.holdings || null;
  }

  root.MultiLogicFinrespBondTbruFetch = {
    PORTI_URL,
    LOCAL_PROXY,
    DEFAULT_MAX_ATTEMPTS_PER_BAR,
    tfStepMs,
    liveBarKey,
    attemptGate,
    getBarAttemptState,
    resetBarAttempts,
    parsePortiHoldingsHtml,
    fetchPortiHoldings,
    applyHoldingsPairs
  };
})(typeof window !== "undefined" ? window : globalThis);
