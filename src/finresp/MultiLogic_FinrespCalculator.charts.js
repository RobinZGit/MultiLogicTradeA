/**
 * Интерактивные графики по инструментам: свечи OHLC, pan/zoom, индикаторы, входы/выходы.
 */
(function (root) {
  "use strict";

  const CHARTS_MODULE_VERSION = "2026-06-14-marker-labels-v1";

  const PRICE_KEYS = [
    "high", "low", "open", "close",
    "sma", "smaUpper", "smaLower", "cma",
    "linregUp", "linregDn", "linregMid",
    "bollingerUp", "bollingerDn", "bollingerMid",
    "vwap"
  ];

  const EQ_LINE = {
    stroke: "#111827",
    width: 2,
    dash: null,
    opacity: 0.95,
    label: "FINRESP инструмента — от первого △/▲ (eq − eq₀, eq₀ на входе)"
  };

  const IND_LINE = [
    { key: "sma", stroke: "#d97706", width: 1, dash: "5 4", opacity: 0.85, label: "SMA — скользящая средняя" },
    { key: "cma", stroke: "#c026d3", width: 1, dash: "4 3", opacity: 0.85, label: "CMA — кастомная SMA (веса n^P, Σn=1)" },
    { key: "smaUpper", stroke: "#f59e0b", width: 0.9, dash: "2 4", opacity: 0.75, label: "SMA — верх коридора (±K×ATR)" },
    { key: "smaLower", stroke: "#f59e0b", width: 0.9, dash: "2 4", opacity: 0.75, label: "SMA — низ коридора (±K×ATR)" },
    { key: "linregMid", stroke: "#7c3aed", width: 1, dash: null, opacity: 0.7, label: "LinReg — линия регрессии (центр)" },
    { key: "linregUp", stroke: "#a78bfa", width: 0.9, dash: "3 3", opacity: 0.65, label: "LinReg — верхняя полоса" },
    { key: "linregDn", stroke: "#a78bfa", width: 0.9, dash: "3 3", opacity: 0.65, label: "LinReg — нижняя полоса" },
    { key: "bollingerMid", stroke: "#0891b2", width: 0.9, dash: null, opacity: 0.65, label: "Bollinger — средняя (SMA)" },
    { key: "bollingerUp", stroke: "#67e8f9", width: 0.8, dash: "2 3", opacity: 0.7, label: "Bollinger — верхняя полоса" },
    { key: "bollingerDn", stroke: "#67e8f9", width: 0.8, dash: "2 3", opacity: 0.7, label: "Bollinger — нижняя полоса" },
    { key: "vwap", stroke: "#16a34a", width: 1, dash: "7 3", opacity: 0.7, label: "VWAP — средневзвешенная цена" }
  ];

  const LONG_MARKER = { entry: "#16a34a", exit: "#15803d" };
  const SHORT_MARKER = { entry: "#dc2626", exit: "#b91c1c" };

  const SIGNAL_HINT = {
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

  function markerColors(side) {
    return side === "short" ? SHORT_MARKER : LONG_MARKER;
  }

  function tradeMarkerTitle(kind, side, r) {
    const sideRu = side === "short" ? "short" : "long";
    const prefix = kind === "in" ? "Вход" : "Выход";
    const logic = kind === "in" ? r.tradeInLogic : r.tradeOutLogic;
    const signal = kind === "in" ? r.tradeInSignal : r.tradeOutSignal;
    const expr = kind === "in" ? r.tradeInExpr : r.tradeOutExpr;
    const parts = [`${prefix} ${sideRu}`];
    if (logic) parts.push(String(logic));
    if (expr) parts.push(String(expr));
    else if (signal) {
      const hint = SIGNAL_HINT[signal] || signal;
      if (hint) parts.push(hint);
    }
    return esc(parts.join(" · "));
  }

  function truncateMarkerText(text, maxLen) {
    const t = String(text ?? "").replace(/\s+/g, " ").trim();
    if (!t) return "";
    if (t.length <= maxLen) return t;
    return `${t.slice(0, Math.max(1, maxLen - 1))}…`;
  }

  /** Строки подписи у △/▲: логика + фрагмент Op/Cl из парсера. */
  function markerLabelLines(r, kind, maxExprLen) {
    const logic = kind === "in" ? r.tradeInLogic : r.tradeOutLogic;
    const expr = kind === "in" ? r.tradeInExpr : r.tradeOutExpr;
    const signal = kind === "in" ? r.tradeInSignal : r.tradeOutSignal;
    const lines = [];
    if (logic) lines.push(String(logic));
    if (expr) lines.push(truncateMarkerText(expr, maxExprLen));
    else if (signal) lines.push(truncateMarkerText(SIGNAL_HINT[signal] || signal, maxExprLen));
    return lines.slice(0, 2);
  }

  function markerLabelFontSize(candleW, compact) {
    const barPx = candleW || 8;
    if (barPx < 5) return 0;
    if (barPx < 9) return compact ? 6 : 7;
    return compact ? 7 : 8;
  }

  function appendMarkerLabels(parts, lines, cx, y, color, fs, anchor) {
    if (!lines.length || fs <= 0) return;
    for (let li = 0; li < lines.length; li++) {
      const ly = y + li * (fs + 2);
      parts.push(`<text x="${cx.toFixed(1)}" y="${ly.toFixed(1)}" text-anchor="${anchor}" font-size="${fs}" fill="${color}" font-weight="600" font-family="Consolas,monospace" opacity="0.95">${esc(lines[li])}</text>`);
    }
  }

  function clamp(v, lo, hi) {
    return Math.max(lo, Math.min(hi, v));
  }

  function esc(s) {
    return String(s ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/"/g, "&quot;");
  }

  function rowHasKey(rows, key) {
    for (let i = 0; i < rows.length; i++) {
      if (rows[i]?.[key] != null) return true;
    }
    return false;
  }

  function legendLineSample(spec) {
    const dash = spec.dash ? ` stroke-dasharray="${spec.dash}"` : "";
    const sw = Math.max(1.6, (spec.width || 1) * 1.5);
    return `<svg class="ml-chart-legend-swatch" width="32" height="10" aria-hidden="true"><line x1="0" y1="5" x2="32" y2="5" stroke="${spec.stroke}" stroke-width="${sw}"${dash} opacity="${spec.opacity ?? 1}"/></svg>`;
  }

  /**
   * FINRESP для линии на графике: 0 до первого △/▲; с первого входа/выхода — eq − eq₀
   * (eq₀ = eq на баре первого события, не сдвиг «для удобства»). Без сделок линии нет.
   */
  function instrumentChartEquitySeries(rows) {
    if (!rows?.length) return { values: [], everHeld: false };
    const values = new Array(rows.length);
    let everTraded = false;
    let baseEq = 0;
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      if (!everTraded && (r?.tradeIn || r?.tradeOut)) {
        baseEq = r?.eq ?? 0;
        everTraded = true;
      }
      values[i] = everTraded ? (r?.eq ?? 0) - baseEq : 0;
    }
    return { values, everHeld: everTraded };
  }

  function rowHasEquity(rows) {
    return rowHasKey(rows, "eq") && instrumentChartEquitySeries(rows).everHeld;
  }

  /** Легенда линий индикаторов под графиком (только присутствующие в данных). */
  function buildIndicatorLegend(rows) {
    const items = [];
    const active = IND_LINE.filter((spec) => rowHasKey(rows, spec.key));
    for (const spec of active) {
      items.push(`<span class="ml-chart-legend-item">${legendLineSample(spec)}<span>${esc(spec.label)}</span></span>`);
    }
    if (rowHasEquity(rows)) {
      items.push(`<span class="ml-chart-legend-item">${legendLineSample(EQ_LINE)}<span>${esc(EQ_LINE.label)}</span></span>`);
    }
    if (!items.length) return "";
    return `<div class="ml-chart-ind-legend" role="list">${items.join("")}</div>`;
  }

  /** Копирование текущего SVG-графика в буфер как PNG. */
  async function copyChartToClipboard(viewport) {
    const svg = viewport?.querySelector?.("svg.ml-chart-svg");
    if (!svg) return { ok: false, reason: "no-svg" };
    if (!navigator.clipboard?.write || typeof ClipboardItem === "undefined") {
      return { ok: false, reason: "clipboard" };
    }
    const vb = svg.viewBox.baseVal;
    const w = vb.width || 820;
    const h = vb.height || 340;
    const clone = svg.cloneNode(true);
    clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    clone.setAttribute("width", String(w));
    clone.setAttribute("height", String(h));
    const xml = new XMLSerializer().serializeToString(clone);
    const url = URL.createObjectURL(new Blob([xml], { type: "image/svg+xml;charset=utf-8" }));
    try {
      const img = await new Promise((resolve, reject) => {
        const el = new Image();
        el.onload = () => resolve(el);
        el.onerror = reject;
        el.src = url;
      });
      const scale = 2;
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(w * scale);
      canvas.height = Math.round(h * scale);
      const ctx = canvas.getContext("2d");
      if (!ctx) return { ok: false, reason: "canvas" };
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.scale(scale, scale);
      ctx.drawImage(img, 0, 0, w, h);
      const pngBlob = await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
      if (!pngBlob) return { ok: false, reason: "png" };
      await navigator.clipboard.write([new ClipboardItem({ "image/png": pngBlob })]);
      return { ok: true };
    } finally {
      URL.revokeObjectURL(url);
    }
  }

  function wireCopyButton(btn, viewport) {
    if (!btn || !viewport) return;
    const defaultLabel = btn.textContent || "Копировать график";
    btn.addEventListener("click", async (ev) => {
      ev.stopPropagation();
      btn.disabled = true;
      const result = await copyChartToClipboard(viewport);
      btn.disabled = false;
      if (result.ok) {
        btn.textContent = "Скопировано";
        btn.classList.add("ml-chart-copy-btn--ok");
        setTimeout(() => {
          btn.textContent = defaultLabel;
          btn.classList.remove("ml-chart-copy-btn--ok");
        }, 1800);
        return;
      }
      btn.textContent = result.reason === "clipboard" ? "Буфер недоступен" : "Ошибка копирования";
      btn.classList.add("ml-chart-copy-btn--err");
      setTimeout(() => {
        btn.textContent = defaultLabel;
        btn.classList.remove("ml-chart-copy-btn--err");
      }, 2200);
    });
  }

  function buildModeBands(rows, modeRegions, x, top, bottom) {
    if (!modeRegions?.length) return "";
    return modeRegions.map(({ fromIdx, toIdx, mode }) => {
      const x0 = x(fromIdx);
      const x1 = x(toIdx);
      const fill = mode === "sandbox" ? "#ecfdf5" : "#fef2f2";
      const stroke = mode === "sandbox" ? "#bbf7d0" : "#fecaca";
      const w = Math.max(2, x1 - x0 + (toIdx === rows.length - 1 ? 4 : 0));
      const title = mode === "sandbox" ? "Песочница (фейк)" : "Реальная торговля";
      return `<g opacity="0.88"><rect x="${x0.toFixed(1)}" y="${top}" width="${w.toFixed(1)}" height="${bottom - top}" fill="${fill}" stroke="${stroke}" stroke-width="0.6"/><title>${title}</title></g>`;
    }).join("");
  }

  function buildStopVLines(vLines, x, top, bottom) {
    return (vLines || []).map(({ idx, kind, scope, label }) => {
      const xi = x(idx).toFixed(1);
      if (kind === "config") {
        const tip = esc(label || "изменение параметров");
        return `<g opacity="0.9"><line x1="${xi}" y1="${top}" x2="${xi}" y2="${bottom}" stroke="#6366f1" stroke-width="1.5" stroke-dasharray="6 4"/><title>${tip}</title></g>`;
      }
      if (kind === "order-buy" || kind === "order-sell") {
        const stroke = kind === "order-buy" ? "#2563eb" : "#c2410c";
        const tip = esc(label || (kind === "order-buy" ? "Покупка" : "Продажа"));
        return `<g opacity="0.92"><line x1="${xi}" y1="${top}" x2="${xi}" y2="${bottom}" stroke="${stroke}" stroke-width="1.8" stroke-dasharray="3 3"/><title>${tip}</title></g>`;
      }
      const stroke = kind === "tp" ? "#16a34a" : "#dc2626";
      const dash = scope === "portfolio" ? "7 4" : "4 3";
      const width = scope === "portfolio" ? 2 : 1.3;
      const op = scope === "portfolio" ? 0.9 : 0.75;
      return `<line x1="${xi}" y1="${top}" x2="${xi}" y2="${bottom}" stroke="${stroke}" stroke-width="${width}" stroke-dasharray="${dash}" opacity="${op}"/>`;
    }).join("");
  }

  /** Размер △/▲ в px SVG: от ширины свечи, с полом/потолком — одинаково читаемо при zoom. */
  function tradeMarkerSize(candleW, compact) {
    const fromBar = (candleW || 8) * 1.45;
    const floor = compact ? 14 : 16;
    const cap = compact ? 20 : 24;
    return {
      triH: Math.min(cap, Math.max(floor, fromBar)),
      triW: Math.min(cap * 0.88, Math.max(floor * 0.88, fromBar * 0.88))
    };
  }

  function tradeMarkerSvg(r, i, x, y, plotTop, plotBottom, triH, triW, candleW, compact) {
    const parts = [];
    const cx = x(i);
    const yMin = plotTop + 4;
    const yMax = plotBottom - 4;
    const highY = y(r.high ?? r.close ?? 0);
    const lowY = y(r.low ?? r.close ?? 0);
    const strokeW = triH >= 18 ? 2.2 : 1.8;
    const labelFs = markerLabelFontSize(candleW, compact);
    const exprMax = candleW >= 12 ? 52 : (candleW >= 8 ? 38 : 28);

    if (r.tradeIn === "long" || r.tradeIn === "short") {
      let tipY = highY - 5;
      let baseY = tipY + triH;
      if (tipY < yMin) {
        const shift = yMin - tipY;
        tipY += shift;
        baseY += shift;
      }
      const pts = `${cx.toFixed(1)},${tipY.toFixed(1)} ${(cx - triW).toFixed(1)},${baseY.toFixed(1)} ${(cx + triW).toFixed(1)},${baseY.toFixed(1)}`;
      const colors = markerColors(r.tradeIn);
      const title = tradeMarkerTitle("in", r.tradeIn, r);
      parts.push(`<polygon points="${pts}" fill="${colors.entry}" fill-opacity="0.35" stroke="#fff" stroke-width="${(strokeW + 0.8).toFixed(1)}" opacity="1"><title>${title}</title></polygon>`);
      parts.push(`<polygon points="${pts}" fill="${colors.entry}" fill-opacity="0.35" stroke="${colors.entry}" stroke-width="${strokeW.toFixed(1)}" opacity="1"><title>${title}</title></polygon>`);
      const inLines = markerLabelLines(r, "in", exprMax);
      if (inLines.length) {
        const labelStartY = tipY - 4 - (inLines.length - 1) * (labelFs + 2);
        appendMarkerLabels(parts, inLines, cx, labelStartY, colors.entry, labelFs, "middle");
      }
    }

    if (r.tradeOut) {
      const side = r.tradeOutSide || r.tradeIn || "long";
      const colors = markerColors(side);
      const title = tradeMarkerTitle("out", side, r);
      let baseY = Math.min(yMax, lowY + 5);
      let tipY = baseY - triH;
      if (tipY < yMin) {
        tipY = yMin;
        baseY = tipY + triH;
      }
      const pts = `${cx.toFixed(1)},${tipY.toFixed(1)} ${(cx - triW).toFixed(1)},${baseY.toFixed(1)} ${(cx + triW).toFixed(1)},${baseY.toFixed(1)}`;
      parts.push(`<polygon points="${pts}" fill="${colors.exit}" stroke="#fff" stroke-width="${(strokeW + 0.8).toFixed(1)}" opacity="1"><title>${title}</title></polygon>`);
      parts.push(`<polygon points="${pts}" fill="${colors.exit}" stroke="${colors.exit}" stroke-width="${strokeW.toFixed(1)}" opacity="1"><title>${title}</title></polygon>`);
      const outLines = markerLabelLines(r, "out", exprMax);
      if (outLines.length) {
        appendMarkerLabels(parts, outLines, cx, baseY + labelFs + 5, colors.exit, labelFs, "middle");
      }
    }

    return parts.join("");
  }

  function renderChartSvg(rows, view, options) {
    const {
      finresp = 0,
      title = "График",
      secTitle = "",
      compact = false,
      decor = {},
      format = {}
    } = options || {};
    const axisPrice = format.axisPrice || ((v) => String(v));
    const axisTime = format.axisTime || ((t) => String(t ?? ""));
    const fmtFin = format.fmtFinresp || ((v) => String(v));
    const niceTicks = format.niceTicks || ((a, b) => [a, b]);

    if (!rows?.length) return "";

    const v0 = clamp(Math.floor(view.start), 0, rows.length - 1);
    const v1 = clamp(Math.ceil(view.end), v0, rows.length - 1);
    const visN = v1 - v0 + 1;

    const w = 820;
    const h = compact ? 230 : 360;
    const chartEq = instrumentChartEquitySeries(rows);
    const showEq = chartEq.everHeld;
    const left = 68;
    const right = showEq ? 62 : 28;
    const finBadgeY = 16;
    const legendY = compact ? 32 : 36;
    const top = compact ? 46 : 52;
    const bottom = 58;
    const plotW = w - left - right;
    const plotH = h - top - bottom;

    const slice = rows.slice(v0, v1 + 1);
    let vals = slice.flatMap((r) => PRICE_KEYS.map((k) => r?.[k]).filter((v) => v != null));
    if (!vals.length) return "";
    const min = Math.min(...vals);
    const max = Math.max(...vals);
    const pad = Math.max((max - min) * 0.06, 0.01);
    const lo = min - pad;
    const hi = max + pad;

    const x = (i) => left + (i - v0) * plotW / Math.max(1, visN - 1);
    const y = (v) => top + (hi - v) * plotH / (hi - lo);

    let yEq = null;
    let eqLo = 0;
    let eqHi = 0;
    let eqTicks = [];
    let eqZeroLine = "";
    if (showEq) {
      const eqSlice = slice.map((_, j) => chartEq.values[v0 + j] ?? 0);
      let eqMin = Math.min(...eqSlice);
      let eqMax = Math.max(...eqSlice);
      if (eqMin === eqMax) {
        eqMin -= Math.max(1, Math.abs(eqMin) * 0.05 + 0.5);
        eqMax += Math.max(1, Math.abs(eqMax) * 0.05 + 0.5);
      }
      const eqPad = Math.max((eqMax - eqMin) * 0.08, 0.5);
      eqLo = eqMin - eqPad;
      eqHi = eqMax + eqPad;
      yEq = (v) => top + (eqHi - v) * plotH / (eqHi - eqLo);
      eqTicks = niceTicks(eqLo, eqHi, compact ? 4 : 5);
      if (eqLo < 0 && eqHi > 0) {
        const zy = yEq(0).toFixed(1);
        eqZeroLine = `<line x1="${left}" y1="${zy}" x2="${w - right}" y2="${zy}" stroke="#cbd5e1" stroke-width="1" stroke-dasharray="4 4" opacity="0.85"/>`;
      }
    }

    const yTicks = niceTicks(lo, hi, 5);
    const xTickCount = Math.min(6, Math.max(2, Math.floor(visN / 12)));
    const xTickIdx = Array.from({ length: xTickCount }, (_, k) =>
      v0 + Math.round(k * (visN - 1) / Math.max(1, xTickCount - 1)));

    const candleW = Math.max(1.2, Math.min(14, plotW / Math.max(visN, 1) * 0.62));
    const { triH, triW } = tradeMarkerSize(candleW, compact);
    const candles = slice.map((r, j) => {
      const i = v0 + j;
      if (r?.open == null && r?.close == null) return "";
      const o = r.open ?? r.close;
      const c = r.close ?? r.open;
      const hiP = r.high ?? Math.max(o, c);
      const loP = r.low ?? Math.min(o, c);
      const cx = x(i);
      const up = c >= o;
      const bodyCol = up ? "#16a34a" : "#dc2626";
      const yHi = y(hiP);
      const yLo = y(loP);
      const yO = y(o);
      const yC = y(c);
      const bodyTop = Math.min(yO, yC);
      const bodyH = Math.max(1, Math.abs(yC - yO));
      return `<g opacity="0.92">
<line x1="${cx.toFixed(1)}" y1="${yHi.toFixed(1)}" x2="${cx.toFixed(1)}" y2="${yLo.toFixed(1)}" stroke="${bodyCol}" stroke-width="1"/>
<rect x="${(cx - candleW / 2).toFixed(1)}" y="${bodyTop.toFixed(1)}" width="${candleW.toFixed(1)}" height="${bodyH.toFixed(1)}" fill="${bodyCol}" stroke="${bodyCol}" stroke-width="0.5"/>
</g>`;
    }).join("");

    const indLines = IND_LINE.filter((spec) => rowHasKey(slice, spec.key)).map((spec) => {
      const pts = slice.map((r, j) => {
        const v = r?.[spec.key];
        if (v == null) return null;
        return `${x(v0 + j).toFixed(1)},${y(v).toFixed(1)}`;
      }).filter(Boolean).join(" ");
      if (!pts) return "";
      const dash = spec.dash ? ` stroke-dasharray="${spec.dash}"` : "";
      return `<polyline fill="none" stroke="${spec.stroke}" stroke-width="${spec.width}"${dash} opacity="${spec.opacity}" points="${pts}"/>`;
    }).join("");

    let eqLine = "";
    if (showEq && yEq) {
      const eqPts = slice.map((_, j) => {
        const eqVal = chartEq.values[v0 + j] ?? 0;
        return `${x(v0 + j).toFixed(1)},${yEq(eqVal).toFixed(1)}`;
      }).join(" ");
      eqLine = `<polyline fill="none" stroke="${EQ_LINE.stroke}" stroke-width="${EQ_LINE.width}" opacity="${EQ_LINE.opacity}" points="${eqPts}"><title>${esc(EQ_LINE.label)}</title></polyline>`;
    }

    const plotBottom = h - bottom;
    const markers = slice.map((r, j) => tradeMarkerSvg(r, v0 + j, x, y, top, plotBottom, triH, triW, candleW, compact)).join("");

    const stopLines = decor.vLines?.length ? decor.vLines : [];
    const stopLinesSvg = buildStopVLines(stopLines, x, top, h - bottom);
    const modeBands = buildModeBands(rows, decor.modeRegions, x, top, h - bottom);

    const gridH = yTicks.map((v) =>
      `<line x1="${left}" y1="${y(v).toFixed(1)}" x2="${w - right}" y2="${y(v).toFixed(1)}" stroke="#e8edf4" stroke-width="1"/>`).join("");
    const gridV = xTickIdx.map((i) =>
      `<line x1="${x(i).toFixed(1)}" y1="${top}" x2="${x(i).toFixed(1)}" y2="${h - bottom}" stroke="#e8edf4" stroke-width="1"/>`).join("");
    const yLabels = yTicks.map((v) =>
      `<text x="${left - 8}" y="${(y(v) + 3.5).toFixed(1)}" text-anchor="end" font-size="10" fill="#64748b" font-family="Consolas,monospace">${axisPrice(v)}</text>`).join("");
    const eqLabels = showEq && yEq
      ? eqTicks.map((v) =>
        `<text x="${w - right + 8}" y="${(yEq(v) + 3.5).toFixed(1)}" text-anchor="start" font-size="9" fill="#374151" font-family="Consolas,monospace">${fmtFin(v)}</text>`).join("")
      : "";
    const xLabels = xTickIdx.map((i) =>
      `<text x="${x(i).toFixed(1)}" y="${h - 10}" text-anchor="middle" font-size="9" fill="#64748b" font-family="Consolas,monospace">${axisTime(rows[i]?.time)}</text>`).join("");

    const stopLegend = stopLines.length ? " · SL/TP поз. — тонкая · портф. — жирная" : "";
    const modeLegend = decor.modeRegions?.length
      ? " · зелёная область — песочница · розовая — реальная торговля"
      : "";
    const zoomHint = visN < rows.length
      ? ` · видно ${visN} из ${rows.length} баров`
      : "";
    const tickerSvg = secTitle
      ? `<text x="${left + 4}" y="${finBadgeY + 1}" font-size="${compact ? 13 : 16}" font-weight="700" fill="#111827" font-family="Consolas,monospace">${esc(secTitle)}</text>`
      : "";
    const rightAxis = showEq
      ? `<line x1="${w - right}" y1="${top}" x2="${w - right}" y2="${h - bottom}" stroke="#94a3b8" stroke-width="1.2"/>
<text x="${w - right + 8}" y="${top - 10}" text-anchor="start" font-size="10" fill="#475569" font-weight="600">FINRESP, ₽</text>`
      : "";

    const chartFin = showEq ? (chartEq.values[v1] ?? 0) : null;
    const color = chartFin != null && chartFin < 0 ? "#b91c1c" : "#047857";
    let finBadgeSvg = "";
    if (chartFin != null) {
      const finLabel = `FINRESP ${fmtFin(chartFin)} ₽`;
      const finFont = compact ? 11 : 13;
      const estW = Math.max(72, finLabel.length * (finFont * 0.58));
      const boxX = w - 4 - estW - 8;
      finBadgeSvg = `<rect x="${boxX.toFixed(1)}" y="5" width="${(estW + 10).toFixed(1)}" height="20" rx="4" fill="#ffffff" stroke="${color}" stroke-width="1.1" opacity="0.98"/>
<text x="${w - 8}" y="${finBadgeY}" text-anchor="end" fill="${color}" font-size="${finFont}" font-weight="700" font-family="Consolas,monospace">${esc(finLabel)}</text>`;
    }

    return `<svg viewBox="0 0 ${w} ${h}" role="img" aria-label="${esc(title)}" class="ml-chart-svg">
<rect width="${w}" height="${h}" fill="#fff"/>
${modeBands}
${gridH}${gridV}
${eqZeroLine}
${stopLinesSvg}
<line x1="${left}" y1="${top}" x2="${left}" y2="${h - bottom}" stroke="#94a3b8" stroke-width="1.2"/>
<line x1="${left}" y1="${h - bottom}" x2="${w - right}" y2="${h - bottom}" stroke="#94a3b8" stroke-width="1.2"/>
${rightAxis}
${yLabels}${eqLabels}${xLabels}
<text x="${left - 10}" y="${top - 8}" text-anchor="end" font-size="10" fill="#475569" font-weight="600">Цена, ₽</text>
<text x="${(left + w - right) / 2}" y="${h - 1}" text-anchor="middle" font-size="10" fill="#475569" font-weight="600">Время</text>
${tickerSvg}
${indLines}
${candles}
${eqLine}
${markers}
<text x="${left + 4}" y="${legendY}" font-size="9" fill="#64748b">△↓ вход · ▲ выход · −/+ масштаб · ←/→ сдвиг · колёсико/pinch · drag/свайп · dblclick/2×tap — сброс${stopLegend}${modeLegend}${zoomHint}</text>
${finBadgeSvg}
</svg>`;
  }

  /** Кнопки −/+ (масштаб) и ←/→ (сдвиг) для планшета. */
  function buildChartNavToolbar() {
    const nav = document.createElement("div");
    nav.className = "ml-chart-nav";
    const groups = [
      {
        label: "Масштаб",
        buttons: [
          { act: "zoom-out", label: "−", title: "Сжать — меньше баров на экране" },
          { act: "zoom-in", label: "+", title: "Растянуть — больше деталей по времени" }
        ]
      },
      {
        label: "Сдвиг",
        buttons: [
          { act: "pan-left", label: "←", title: "Влево — раньше по времени" },
          { act: "pan-right", label: "→", title: "Вправо — позже по времени" }
        ]
      }
    ];
    for (const g of groups) {
      const grp = document.createElement("div");
      grp.className = "ml-chart-nav-group";
      const lbl = document.createElement("span");
      lbl.className = "ml-chart-nav-label";
      lbl.textContent = g.label;
      grp.appendChild(lbl);
      for (const b of g.buttons) {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "ml-chart-nav-btn";
        btn.dataset.chartAct = b.act;
        btn.textContent = b.label;
        btn.title = b.title;
        btn.setAttribute("aria-label", b.title);
        grp.appendChild(btn);
      }
      nav.appendChild(grp);
    }
    return nav;
  }

  /**
   * @param {HTMLElement} host
   * @param {object} options rows, finresp, title, compact, decor, format
   */
  function mount(host, options) {
    if (!host) return null;
    const rows = options?.rows || [];
    if (!rows.length) {
      host.innerHTML = "";
      return null;
    }

    const minBars = 6;
    let view = { start: 0, end: rows.length - 1 };
    let drag = null;
    let touch = null;
    let lastTapAt = 0;
    let interactRaf = 0;
    let pendingView = null;

    host.innerHTML = "";
    const wrap = document.createElement("div");
    wrap.className = "ml-instrument-chart";

    let copyBtn = null;
    if (options?.secTitle) {
      const header = document.createElement("div");
      header.className = "chart-mini-header";
      const titleEl = document.createElement("p");
      titleEl.className = "chart-sec-title";
      titleEl.textContent = options.secTitle;
      copyBtn = document.createElement("button");
      copyBtn.type = "button";
      copyBtn.className = "ml-chart-copy-btn";
      copyBtn.textContent = "Копировать график";
      copyBtn.title = "Скопировать видимый график в буфер обмена (PNG)";
      const actions = document.createElement("div");
      actions.className = "chart-mini-header-actions";
      actions.appendChild(buildChartNavToolbar());
      actions.appendChild(copyBtn);
      header.appendChild(titleEl);
      header.appendChild(actions);
      wrap.appendChild(header);
    }

    const chartNav = wrap.querySelector(".ml-chart-nav");

    const viewport = document.createElement("div");
    viewport.className = "ml-chart-viewport";
    viewport.title = "Колёсико или pinch — масштаб; drag или свайп одним пальцем — сдвиг; двойной клик или двойной tap — сброс";

    const legendHost = document.createElement("div");
    legendHost.className = "ml-chart-legend-host";

    function normalizeView() {
      view.start = clamp(view.start, 0, rows.length - 1);
      view.end = clamp(view.end, view.start, rows.length - 1);
      if (view.end - view.start + 1 < minBars) {
        view.end = Math.min(rows.length - 1, view.start + minBars - 1);
      }
    }

    function touchDistance(t0, t1) {
      const dx = t0.clientX - t1.clientX;
      const dy = t0.clientY - t1.clientY;
      return Math.hypot(dx, dy);
    }

    function touchMidFrac(touches, rect) {
      const x = (touches[0].clientX + touches[1].clientX) / 2;
      return clamp((x - rect.left) / Math.max(rect.width, 1), 0, 1);
    }

    function clampPanRange(ns, ne) {
      if (ns < 0) {
        ne -= ns;
        ns = 0;
      }
      if (ne > rows.length - 1) {
        ns -= ne - (rows.length - 1);
        ne = rows.length - 1;
      }
      ns = clamp(ns, 0, rows.length - 1);
      ne = clamp(ne, ns, rows.length - 1);
      if (ne - ns + 1 < minBars) ne = Math.min(rows.length - 1, ns + minBars - 1);
      return { start: ns, end: ne };
    }

    function panViewFromGesture(state, clientX) {
      const rect = viewport.getBoundingClientRect();
      const span = state.end0 - state.start0;
      const barsPerPx = span / Math.max(rect.width, 1);
      const delta = Math.round(-(clientX - state.x0) * barsPerPx);
      return clampPanRange(state.start0 + delta, state.end0 + delta);
    }

    function pinchViewFromTouches(touchState, touches, rect) {
      const dist = touchDistance(touches[0], touches[1]);
      const ratio = dist / Math.max(touchState.lastDist || touchState.dist0, 1);
      touchState.lastDist = dist;
      const span = view.end - view.start;
      let newSpan = Math.round(span / ratio);
      newSpan = clamp(newSpan, minBars - 1, rows.length - 1);
      const frac = touchMidFrac(touches, rect);
      const anchor = view.start + span * frac;
      let ns = Math.round(anchor - newSpan * frac);
      const ne = ns + newSpan;
      return clampPanRange(ns, ne);
    }

    function scheduleViewRender(next) {
      pendingView = next;
      if (interactRaf) return;
      interactRaf = requestAnimationFrame(() => {
        interactRaf = 0;
        if (!pendingView) return;
        if (pendingView.start === view.start && pendingView.end === view.end) {
          pendingView = null;
          return;
        }
        view.start = pendingView.start;
        view.end = pendingView.end;
        pendingView = null;
        renderChartOnly();
      });
    }

    function flushPendingView() {
      if (interactRaf) {
        cancelAnimationFrame(interactRaf);
        interactRaf = 0;
      }
      if (!pendingView) return;
      view.start = pendingView.start;
      view.end = pendingView.end;
      pendingView = null;
      renderChartOnly();
    }

    function renderChartOnly() {
      normalizeView();
      viewport.innerHTML = renderChartSvg(rows, view, options);
    }

    function render() {
      renderChartOnly();
      legendHost.innerHTML = buildIndicatorLegend(rows);
    }

    if (copyBtn) wireCopyButton(copyBtn, viewport);

    function applyViewRange(ns, ne) {
      const next = clampPanRange(ns, ne);
      view.start = next.start;
      view.end = next.end;
      renderChartOnly();
    }

    function panByBars(delta) {
      const next = clampPanRange(view.start + delta, view.end + delta);
      view.start = next.start;
      view.end = next.end;
      renderChartOnly();
    }

    function zoomAround(frac, factor) {
      const span = view.end - view.start;
      let newSpan = Math.round(span * factor);
      newSpan = clamp(newSpan, minBars - 1, rows.length - 1);
      const anchor = view.start + span * frac;
      let ns = Math.round(anchor - newSpan * frac);
      let ne = ns + newSpan;
      if (ns < 0) {
        ne -= ns;
        ns = 0;
      }
      if (ne > rows.length - 1) {
        ns -= ne - (rows.length - 1);
        ne = rows.length - 1;
      }
      applyViewRange(ns, ne);
    }

    function panStepBars() {
      const span = view.end - view.start;
      return Math.max(1, Math.round(span * 0.12));
    }

    if (chartNav) {
      chartNav.addEventListener("click", (ev) => {
        const btn = ev.target.closest("[data-chart-act]");
        if (!btn) return;
        ev.preventDefault();
        const step = panStepBars();
        switch (btn.dataset.chartAct) {
          case "zoom-in":
            zoomAround(0.5, 0.82);
            break;
          case "zoom-out":
            zoomAround(0.5, 1.22);
            break;
          case "pan-left":
            panByBars(-step);
            break;
          case "pan-right":
            panByBars(step);
            break;
          default:
            break;
        }
      });
    }

    viewport.addEventListener("wheel", (ev) => {
      ev.preventDefault();
      const rect = viewport.getBoundingClientRect();
      const frac = clamp((ev.clientX - rect.left) / Math.max(rect.width, 1), 0, 1);
      const factor = ev.deltaY < 0 ? 0.82 : 1.22;
      zoomAround(frac, factor);
    }, { passive: false });

    viewport.addEventListener("mousedown", (ev) => {
      if (ev.button !== 0) return;
      flushPendingView();
      drag = { x0: ev.clientX, start0: view.start, end0: view.end };
      viewport.classList.add("ml-chart-dragging");
      ev.preventDefault();
    });

    const onMove = (ev) => {
      if (!drag) return;
      scheduleViewRender(panViewFromGesture(drag, ev.clientX));
    };

    const onUp = () => {
      if (!drag) return;
      drag = null;
      viewport.classList.remove("ml-chart-dragging");
      flushPendingView();
    };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);

    viewport.addEventListener("dblclick", () => {
      view = { start: 0, end: rows.length - 1 };
      render();
    });

    const onTouchStart = (ev) => {
      pendingView = null;
      if (ev.touches.length === 1) {
        flushPendingView();
        touch = {
          mode: "pan",
          x0: ev.touches[0].clientX,
          start0: view.start,
          end0: view.end
        };
        drag = null;
        viewport.classList.add("ml-chart-dragging");
      } else if (ev.touches.length >= 2) {
        flushPendingView();
        const rect = viewport.getBoundingClientRect();
        const dist0 = touchDistance(ev.touches[0], ev.touches[1]);
        touch = {
          mode: "pinch",
          dist0,
          lastDist: dist0,
          midFrac0: touchMidFrac(ev.touches, rect),
          start0: view.start,
          span0: view.end - view.start
        };
        drag = null;
        viewport.classList.add("ml-chart-dragging");
      }
      ev.preventDefault();
    };

    const onTouchMove = (ev) => {
      if (!touch) return;
      ev.preventDefault();
      const rect = viewport.getBoundingClientRect();
      if (touch.mode === "pan" && ev.touches.length === 1) {
        scheduleViewRender(panViewFromGesture(touch, ev.touches[0].clientX));
      } else if (touch.mode === "pinch" && ev.touches.length >= 2) {
        scheduleViewRender(pinchViewFromTouches(touch, ev.touches, rect));
      }
    };

    const onTouchEnd = (ev) => {
      if (ev.touches.length === 0) {
        const now = Date.now();
        const wasPan = touch?.mode === "pan";
        if (wasPan && ev.changedTouches.length === 1 && now - lastTapAt < 350) {
          pendingView = null;
          if (interactRaf) {
            cancelAnimationFrame(interactRaf);
            interactRaf = 0;
          }
          view = { start: 0, end: rows.length - 1 };
          renderChartOnly();
        } else {
          flushPendingView();
        }
        lastTapAt = now;
        touch = null;
        viewport.classList.remove("ml-chart-dragging");
      } else if (ev.touches.length === 1 && touch?.mode === "pinch") {
        flushPendingView();
        touch = {
          mode: "pan",
          x0: ev.touches[0].clientX,
          start0: view.start,
          end0: view.end
        };
      }
    };

    viewport.addEventListener("touchstart", onTouchStart, { passive: false });
    viewport.addEventListener("touchmove", onTouchMove, { passive: false });
    viewport.addEventListener("touchend", onTouchEnd, { passive: false });
    viewport.addEventListener("touchcancel", onTouchEnd, { passive: false });

    wrap.appendChild(viewport);
    wrap.appendChild(legendHost);
    host.appendChild(wrap);
    render();

    return {
      resetView() {
        view = { start: 0, end: rows.length - 1 };
        render();
      },
      panByBars,
      zoomIn() {
        zoomAround(0.5, 0.82);
      },
      zoomOut() {
        zoomAround(0.5, 1.22);
      },
      panLeft() {
        panByBars(-panStepBars());
      },
      panRight() {
        panByBars(panStepBars());
      },
      copyToClipboard() {
        return copyChartToClipboard(viewport);
      },
      destroy() {
        window.removeEventListener("mousemove", onMove);
        window.removeEventListener("mouseup", onUp);
        viewport.removeEventListener("touchstart", onTouchStart);
        viewport.removeEventListener("touchmove", onTouchMove);
        viewport.removeEventListener("touchend", onTouchEnd);
        viewport.removeEventListener("touchcancel", onTouchEnd);
        if (interactRaf) cancelAnimationFrame(interactRaf);
        host.innerHTML = "";
      }
    };
  }

  /** Сводка по строкам графика (маркеры, pos, eq) — для тех. информации. */
  function summarizeChartRows(rows) {
    if (!rows?.length) {
      return {
        rows: 0, tradeIn: 0, tradeOut: 0, posStop: 0, posStopMarked: 0,
        posNonZero: 0, posCross: 0, crossNoMarker: 0, maxAbsPos: 0,
        everHeld: false, eqLast: 0, samples: []
      };
    }
    let tradeIn = 0;
    let tradeOut = 0;
    let posStop = 0;
    let posStopMarked = 0;
    let posNonZero = 0;
    let posCross = 0;
    let crossNoMarker = 0;
    let maxAbsPos = 0;
    let prevPos = 0;
    const samples = [];
    const chartEq = instrumentChartEquitySeries(rows);
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      const pos = r?.pos ?? 0;
      if (r?.tradeIn) tradeIn += 1;
      if (r?.tradeOut) tradeOut += 1;
      if (r?.posStop) {
        posStop += 1;
        if (r.tradeIn || r.tradeOut) posStopMarked += 1;
      }
      if (pos !== 0) posNonZero += 1;
      maxAbsPos = Math.max(maxAbsPos, Math.abs(pos));
      if ((prevPos === 0 && pos !== 0) || (prevPos !== 0 && pos === 0)
        || (prevPos !== 0 && pos !== 0 && Math.sign(prevPos) !== Math.sign(pos))) {
        posCross += 1;
        if (!r?.tradeIn && !r?.tradeOut) crossNoMarker += 1;
      }
      if ((r?.tradeIn || r?.tradeOut) && samples.length < 6) {
        samples.push({
          i,
          time: r.time,
          tradeIn: r.tradeIn || "",
          tradeOut: r.tradeOut || "",
          pos,
          posStop: r.posStop || "",
          eq: r.eq,
          buy: r.buy,
          sell: r.sell
        });
      }
      prevPos = pos;
    }
    return {
      rows: rows.length,
      tradeIn,
      tradeOut,
      posStop,
      posStopMarked,
      posNonZero,
      posCross,
      crossNoMarker,
      maxAbsPos,
      everHeld: chartEq.everHeld,
      eqLast: chartEq.values[rows.length - 1] ?? 0,
      samples
    };
  }

  root.MLInstrumentChart = {
    mount,
    renderChartSvg,
    buildIndicatorLegend,
    copyChartToClipboard,
    summarizeChartRows,
    version: CHARTS_MODULE_VERSION
  };
})(typeof globalThis !== "undefined" ? globalThis : typeof window !== "undefined" ? window : this);
