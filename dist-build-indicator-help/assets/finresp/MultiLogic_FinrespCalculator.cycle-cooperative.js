/*
 * Cooperative cycle steps: UI yield + observability for long loops.
 * Loaded before boot.js / live.js; API on window.MultiLogicFinrespCycleCoop.
 */
(function (root) {
  "use strict";

  let WARN_MS = 3000;
  let HUNG_MS = 8000;
  let YIELD_MS = 14;
  let TECH_REFRESH_MS = 2000;
  const RECENT_MAX = 16;

  let lastYieldPerf = 0;
  let techRefreshTimer = null;
  let onTechRefresh = null;

  const registry = {
    active: null,
    recent: [],
    slowCount: 0
  };

  function perfNow() {
    return typeof performance !== "undefined" && performance.now ? performance.now() : Date.now();
  }

  function yieldToUi() {
    return new Promise((resolve) => {
      if (typeof requestAnimationFrame === "function") {
        requestAnimationFrame(() => setTimeout(resolve, 0));
      } else {
        setTimeout(resolve, 0);
      }
    });
  }

  async function maybeYield() {
    const t = perfNow();
    if (t - lastYieldPerf < YIELD_MS) return;
    lastYieldPerf = t;
    await yieldToUi();
  }

  function scheduleTechRefresh(force) {
    if (typeof onTechRefresh !== "function") return;
    if (force) {
      if (techRefreshTimer) {
        clearTimeout(techRefreshTimer);
        techRefreshTimer = null;
      }
      onTechRefresh();
      return;
    }
    if (techRefreshTimer) return;
    techRefreshTimer = setTimeout(() => {
      techRefreshTimer = null;
      onTechRefresh();
    }, TECH_REFRESH_MS);
  }

  function formatDetail(d) {
    if (!d || typeof d !== "object") return "";
    const parts = [];
    if (d.sec) parts.push(`sec=${d.sec}`);
    if (d.i != null && d.total != null) parts.push(`${d.i}/${d.total}`);
    else if (d.i != null) parts.push(`i=${d.i}`);
    if (d.note) parts.push(`note=${d.note}`);
    if (d.phase) parts.push(`phase=${d.phase}`);
    return parts.join(" ");
  }

  function pushRecent(entry) {
    registry.recent.unshift(entry);
    if (registry.recent.length > RECENT_MAX) registry.recent.length = RECENT_MAX;
  }

  function beginCycle(id, meta) {
    const cycleId = String(id || "cycle").trim() || "cycle";
    if (registry.active) {
      const prev = registry.active;
      pushRecent({
        id: prev.id,
        phase: prev.phase,
        elapsedMs: Math.round(perfNow() - prev.startedPerf),
        iter: prev.iter,
        slow: !!prev.slow,
        ok: false,
        at: new Date().toISOString(),
        detail: { ...prev.detail, interrupted: true, reason: "nested-begin" }
      });
    }
    registry.active = {
      id: cycleId,
      meta: meta && typeof meta === "object" ? { ...meta } : {},
      startedAt: Date.now(),
      startedPerf: perfNow(),
      lastBeatPerf: perfNow(),
      lastBeatAt: Date.now(),
      iter: 0,
      phase: (meta && meta.phase) || "",
      detail: {},
      warned: false,
      slow: false
    };
    scheduleTechRefresh(true);
  }

  async function cycleBeat(partial) {
    const ac = registry.active;
    if (!ac) {
      await maybeYield();
      return;
    }
    const p = partial && typeof partial === "object" ? partial : {};
    ac.iter += 1;
    ac.lastBeatPerf = perfNow();
    ac.lastBeatAt = Date.now();
    if (p.phase != null) ac.phase = String(p.phase);
    if (p.i != null) ac.detail.i = p.i;
    if (p.total != null) ac.detail.total = p.total;
    if (p.sec != null) ac.detail.sec = p.sec;
    if (p.note != null) ac.detail.note = p.note;
    for (const k of Object.keys(p)) {
      if (k === "phase") continue;
      ac.detail[k] = p[k];
    }

    const elapsed = ac.lastBeatPerf - ac.startedPerf;
    if (elapsed >= WARN_MS) {
      if (!ac.warned) {
        ac.warned = true;
        ac.slow = true;
        registry.slowCount += 1;
        scheduleTechRefresh(true);
      } else {
        scheduleTechRefresh(false);
      }
    }

    await maybeYield();
  }

  function endCycle(result) {
    const ac = registry.active;
    if (!ac) return null;
    const elapsedMs = Math.round(perfNow() - ac.startedPerf);
    const res = result && typeof result === "object" ? result : {};
    const entry = {
      id: ac.id,
      phase: ac.phase,
      elapsedMs,
      iter: ac.iter,
      slow: !!ac.slow || elapsedMs >= WARN_MS,
      ok: res.ok !== false,
      at: new Date().toISOString(),
      detail: { ...ac.detail, ...res }
    };
    pushRecent(entry);
    registry.active = null;
    scheduleTechRefresh(true);
    return entry;
  }

  function buildTechLines() {
    const lines = [];
    const ac = registry.active;
    if (ac) {
      const elapsed = Math.round(perfNow() - ac.startedPerf);
      const sinceBeat = Math.round(perfNow() - ac.lastBeatPerf);
      let status = "ok";
      if (elapsed >= HUNG_MS && sinceBeat >= Math.min(HUNG_MS, 5000)) status = "hung?";
      else if (elapsed >= WARN_MS) status = "slow";
      lines.push(
        `activeCycle=${ac.id}`,
        `activePhase=${ac.phase || "—"}`,
        `activeElapsedMs=${elapsed}`,
        `activeSinceBeatMs=${sinceBeat}`,
        `activeIter=${ac.iter}`,
        `activeStatus=${status}`,
        `activeDetail=${formatDetail(ac.detail) || "—"}`
      );
    } else {
      lines.push("activeCycle=—");
    }
    lines.push(`cycleSlowTotal=${registry.slowCount}`);
    lines.push("recentCycles:");
    const recent = registry.recent.slice(0, 12);
    if (!recent.length) {
      lines.push("  —");
    } else {
      for (const r of recent) {
        const flag = r.slow ? "slow" : "ok";
        const ok = r.ok === false ? "fail" : flag;
        lines.push(
          `  ${r.id} ${r.elapsedMs}ms ${ok} iter=${r.iter} ${formatDetail(r.detail)}`.trim()
        );
      }
    }
    return lines;
  }

  function install(opts) {
    const o = opts || {};
    if (Number.isFinite(o.warnMs) && o.warnMs > 0) WARN_MS = o.warnMs;
    if (Number.isFinite(o.hungMs) && o.hungMs > 0) HUNG_MS = o.hungMs;
    if (Number.isFinite(o.yieldMs) && o.yieldMs > 0) YIELD_MS = o.yieldMs;
    if (Number.isFinite(o.techRefreshMs) && o.techRefreshMs > 0) TECH_REFRESH_MS = o.techRefreshMs;
    if (typeof o.onTechRefresh === "function") onTechRefresh = o.onTechRefresh;
  }

  root.MultiLogicFinrespCycleCoop = {
    install,
    beginCycle,
    cycleBeat,
    endCycle,
    buildTechLines,
    getRegistry: () => registry,
    yieldToUi,
    maybeYield
  };
})(typeof window !== "undefined" ? window : globalThis);
