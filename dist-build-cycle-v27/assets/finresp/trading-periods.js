/*
 * Неторговые периоды по дням недели (MSK). Используется в engine и live.
 */
(function (root) {
  "use strict";

  const DAY_KEYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
  const DAY_LABELS = {
    mon: "Понедельник",
    tue: "Вторник",
    wed: "Среда",
    thu: "Четверг",
    fri: "Пятница",
    sat: "Суббота",
    sun: "Воскресенье"
  };
  /** JS Date.getDay(): 0=вс … 6=сб */
  const JS_DAY_TO_KEY = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

  /** Фондовый рынок MOEX (ММВБ): перерывы между утренней, основной и вечерней сессиями. */
  const MOEX_WEEKDAY_NON_TRADING = [
    { from: "00:00", to: "06:50" },
    { from: "09:50", to: "10:00" },
    { from: "18:50", to: "19:05" },
    { from: "23:50", to: "24:00" }
  ];
  /** ДСВД (суббота/воскресенье): торги 09:50–19:00 MSK. */
  const MOEX_WEEKEND_NON_TRADING = [
    { from: "00:00", to: "09:50" },
    { from: "19:00", to: "24:00" }
  ];

  function clonePeriods(list) {
    return (list || []).map((p) => ({ from: String(p.from), to: String(p.to) }));
  }

  function defaultMoexConfig() {
    const days = {};
    for (const k of ["mon", "tue", "wed", "thu", "fri"]) {
      days[k] = { enabled: true, periods: clonePeriods(MOEX_WEEKDAY_NON_TRADING) };
    }
    for (const k of ["sat", "sun"]) {
      days[k] = { enabled: true, periods: clonePeriods(MOEX_WEEKEND_NON_TRADING) };
    }
    return { version: 1, days };
  }

  function parseHm(text) {
    const s = String(text || "").trim();
    if (s === "24:00") return 24 * 60;
    const m = s.match(/^(\d{1,2}):(\d{2})$/);
    if (!m) return NaN;
    const h = +m[1];
    const min = +m[2];
    if (!Number.isFinite(h) || !Number.isFinite(min) || h < 0 || h > 23 || min < 0 || min > 59) return NaN;
    return h * 60 + min;
  }

  function normalizePeriod(period) {
    const from = parseHm(period?.from);
    let to = parseHm(period?.to);
    if (period?.to === "24:00") to = 24 * 60;
    if (!Number.isFinite(from) || !Number.isFinite(to) || from >= to) return null;
    return { from, to };
  }

  function enrichConfig(cfg) {
    let anyEnabled = false;
    for (const key of DAY_KEYS) {
      const day = cfg.days[key] || { enabled: false, periods: [] };
      day.periods = Array.isArray(day.periods) ? day.periods : [];
      day.normalized = day.periods.map(normalizePeriod).filter(Boolean);
      if (day.enabled && day.normalized.length) anyEnabled = true;
      cfg.days[key] = day;
    }
    cfg.anyEnabled = anyEnabled;
    return cfg;
  }

  function normalizeConfig(raw) {
    const base = defaultMoexConfig();
    if (!raw || typeof raw !== "object" || !raw.days) return enrichConfig(base);
    const days = {};
    for (const key of DAY_KEYS) {
      const src = raw.days[key] || base.days[key];
      const periods = Array.isArray(src.periods)
        ? src.periods.map((p) => ({
          from: String(p?.from || "").trim(),
          to: String(p?.to || "").trim()
        })).filter((p) => p.from && p.to)
        : clonePeriods(base.days[key].periods);
      days[key] = { enabled: !!src.enabled, periods };
    }
    return enrichConfig({ version: 1, days });
  }

  function pad2(n) {
    return String(n).padStart(2, "0");
  }

  function weekdayKeyMsk(y, mo, d) {
    const iso = `${y}-${pad2(mo)}-${pad2(d)}T12:00:00+03:00`;
    const wd = new Date(iso).getUTCDay();
    return JS_DAY_TO_KEY[wd];
  }

  function parseMskDateTime(timeStr) {
    const s = String(timeStr || "").trim();
    const m = s.match(/^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2})(?::(\d{2}))?)?/);
    if (!m) return null;
    const y = +m[1];
    const mo = +m[2];
    const d = +m[3];
    const hh = m[4] != null ? +m[4] : 0;
    const mm = m[5] != null ? +m[5] : 0;
    return {
      key: weekdayKeyMsk(y, mo, d),
      minutes: hh * 60 + mm
    };
  }

  function mskNowTimeString() {
    const parts = new Intl.DateTimeFormat("en-GB", {
      timeZone: "Europe/Moscow",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false
    }).formatToParts(new Date());
    const g = (t) => parts.find((p) => p.type === t)?.value || "00";
    return `${g("year")}-${g("month")}-${g("day")} ${g("hour")}:${g("minute")}:${g("second")}`;
  }

  /**
   * true — сейчас неторговый период (сделки блокируются).
   * @param {string} timeStr — YYYY-MM-DD HH:mm:ss (MSK, как у свечей MOEX)
   * @param {object} config — normalizeConfig(...)
   * @param {{ calcTf?: string|number }} [options]
   */
  function isNonTradingMsk(timeStr, config, options) {
    const cfg = config?.anyEnabled != null ? config : normalizeConfig(config);
    if (!cfg.anyEnabled) return false;
    const tf = String(options?.calcTf ?? "");
    if (tf === "24") return false;
    const dt = parseMskDateTime(timeStr);
    if (!dt) return false;
    const day = cfg.days[dt.key];
    if (!day?.enabled || !day.normalized?.length) return false;
    for (const p of day.normalized) {
      if (dt.minutes >= p.from && dt.minutes < p.to) return true;
    }
    return false;
  }

  function isLiveNonTradingNow(config) {
    return isNonTradingMsk(mskNowTimeString(), config, {});
  }

  root.MultiLogicFinrespTradingPeriods = {
    DAY_KEYS,
    DAY_LABELS,
    MOEX_WEEKDAY_NON_TRADING,
    MOEX_WEEKEND_NON_TRADING,
    defaultMoexConfig,
    normalizeConfig,
    parseHm,
    isNonTradingMsk,
    isLiveNonTradingNow,
    mskNowTimeString
  };
})(typeof globalThis !== "undefined" ? globalThis : typeof self !== "undefined" ? self : this);
