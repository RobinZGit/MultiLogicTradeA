/**
 * MultiLogic — отрисовка протокола истории сделок (FIFO-пакеты, ссылки на покупки).
 * Подключается из MultiLogic_TradeHistoryProtocol.html; данные — sessionStorage или #ml-protocol-data.
 */
(function (root) {
  "use strict";

  const STORAGE_KEY = "multilogic.trade-protocol.v1";

  function fmt(n, dec) {
    const d = dec == null ? 2 : dec;
    const x = +n;
    if (!Number.isFinite(x)) return "—";
    return x.toLocaleString("ru-RU", { minimumFractionDigits: d, maximumFractionDigits: d });
  }

  function fmtSignedRub(n, dec) {
    const x = +n;
    if (!Number.isFinite(x)) return "—";
    return `${x >= 0 ? "+" : ""}${fmt(x, dec == null ? 2 : dec)} ₽`;
  }

  function esc(s) {
    return String(s ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function fmtWhen(iso) {
    if (!iso) return "—";
    const d = new Date(iso);
    return Number.isFinite(d.getTime()) ? d.toLocaleString("ru-RU") : esc(iso);
  }

  function loadPayload() {
    const el = document.getElementById("ml-protocol-data");
    if (el?.textContent?.trim()) {
      try { return JSON.parse(el.textContent); } catch (_) { /* fall through */ }
    }
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    } catch (_) { /* ignore */ }
    return null;
  }

  function tradeLink(tradeId, label) {
    if (!tradeId) return "—";
    const text = label || tradeId;
    return `<a class="trade-link" href="#trade-${esc(tradeId)}">${esc(text)}</a>`;
  }

  function renderPortfolioSummary(ps, meta) {
    if (!ps) return "";
    const t = ps.closeTotalsFifo || {};
    const hc = ps.howCalculated || {};
    return `<section class="proto-section" id="summary">
<h2>Сводка портфеля (верхний блок live)</h2>
<table class="proto-table">
<tr><th>Портфель всего</th><td>${fmtRub(ps.portfolioValueRub)}</td><td class="proto-hint">${esc(hc.portfolio || "")}</td></tr>
<tr><th>Деньги, свободно</th><td>${fmtRub(ps.freeCashRub)}</td><td class="proto-hint">${esc(hc.freeCash || "")}</td></tr>
<tr><th>Позиции (MTM)</th><td>${fmtRub(ps.positionsMtmRub)}</td><td class="proto-hint">Стоимость открытых позиций по текущим ценам</td></tr>
<tr><th>Комиссии уплачено</th><td class="neg">−${fmt(ps.commissionPaidRub)} ₽</td><td class="proto-hint">Сумма комиссий сессии</td></tr>
<tr><th>FINRESP Σ (модель)</th><td>${fmtSignedRub(ps.modelFinrespRub)}</td><td class="proto-hint">${esc(hc.modelFinresp || "")}</td></tr>
<tr><th>Портфель Δ</th><td>${fmtSignedRub(ps.portfolioDeltaRub)}</td><td class="proto-hint">${esc(hc.portfolioDelta || "")} Baseline: ${fmtRub(ps.sessionPortfolioBaselineRub)}</td></tr>
<tr><th>Σ закрытий FIFO</th><td class="fin">${fmtSignedRub(t.sumFin)}</td><td class="proto-hint">${esc(hc.closeFinresp || "")}</td></tr>
</table>
<p class="proto-formula">Σ закрытий = прод ${fmt(t.sumSale)} − покуп ${fmt(t.sumPurchase)} − buy ${fmt(t.sumBuyFee)} − sell ${fmt(t.sumSellFee)} · портфель Δ ${fmtSignedRub(t.portfolioDelta)}</p>
</section>`;
  }

  function fmtRub(n) {
    return Number.isFinite(+n) ? `${fmt(n)} ₽` : "—";
  }

  function renderCloseEvents(closeEvents) {
    if (!closeEvents?.length) {
      return `<section class="proto-section" id="closes"><h2>Закрытия (FIFO-пакеты)</h2><p class="proto-empty">Закрытий пока нет.</p></section>`;
    }
    const blocks = closeEvents.map((ev) => {
      const packets = (ev.fifoPackets || []).map((p) => `<tr>
<td>${tradeLink(p.openTradeId)}</td>
<td>${esc(p.openSide)}</td>
<td>${p.pieces}</td>
<td>${fmt(p.openPrice)}</td>
<td>${fmt(p.closePrice)}</td>
<td>${fmtRub(p.purchaseSum)}</td>
<td>${fmtRub(p.saleSum)}</td>
<td class="neg">−${fmt(p.buyFeeAllocatedRub)} ₽</td>
</tr>`).join("");
      return `<article class="close-card" id="close-${esc(ev.closeTradeId)}">
<h3>Закрытие ${tradeLink(ev.closeTradeId)} · ${esc(ev.ticker)} · ${esc(ev.closeKind)}</h3>
<p class="close-meta">${fmtWhen(ev.when)} · сторона ${esc(ev.closeSide)} · цена ${fmt(ev.closePrice)} · FINRESPΔ <strong class="fin">${fmtSignedRub(ev.finrespDelta)}</strong></p>
<p class="close-meta">Продажи ${fmtRub(ev.saleSumRub)} − покупки ${fmtRub(ev.purchaseSumRub)} − buy ${fmtRub(ev.feeBuyRub)} − sell ${fmtRub(ev.feeSellRub)}</p>
<table class="proto-table proto-table-compact">
<thead><tr><th>Открытие (tradeId)</th><th>Leg</th><th>Шт</th><th>Цена откр.</th><th>Цена закр.</th><th>Покупка ₽</th><th>Продажа ₽</th><th>Buy fee</th></tr></thead>
<tbody>${packets || "<tr><td colspan=\"8\">Нет FIFO-матчей</td></tr>"}</tbody>
</table>
</article>`;
    }).join("");
    return `<section class="proto-section" id="closes"><h2>Закрытия (FIFO-пакеты)</h2>${blocks}</section>`;
  }

  function renderOpenLots(openLots) {
    if (!openLots?.length) {
      return `<section class="proto-section" id="open-lots"><h2>Открытые пакеты (ещё не закрыты)</h2><p class="proto-empty">Все позиции закрыты или нет открытых legs.</p></section>`;
    }
    const rows = openLots.map((lot) => {
      const trades = (lot.openTrades || []).map((t) => `<tr>
<td>${tradeLink(t.openTradeId)}</td>
<td>${t.legId ?? "—"}</td>
<td>${t.piecesRemaining}</td>
<td>${fmt(t.openPrice)}</td>
<td class="neg">${Number.isFinite(t.openFeeRub) ? `−${fmt(t.openFeeRub)} ₽` : "—"}</td>
<td>${fmtWhen(t.openedAt)}</td>
</tr>`).join("");
      return `<article class="open-lot-card">
<h3>${esc(lot.ticker)} · ${esc(lot.side)} · остаток ${lot.remainingPieces} шт</h3>
<table class="proto-table proto-table-compact">
<thead><tr><th>tradeId</th><th>legId</th><th>Остаток шт</th><th>Цена</th><th>Fee</th><th>Открыто</th></tr></thead>
<tbody>${trades}</tbody>
</table>
</article>`;
    }).join("");
    return `<section class="proto-section" id="open-lots"><h2>Открытые пакеты (ещё не закрыты)</h2>${rows}</section>`;
  }

  function renderTrades(trades) {
    if (!trades?.length) {
      return `<section class="proto-section" id="trades"><h2>Журнал сделок</h2><p class="proto-empty">Сделок нет.</p></section>`;
    }
    const rows = trades.map((t) => {
      const cls = t.fake ? "row-fake" : "row-real";
      return `<tr class="${cls}" id="trade-${esc(t.tradeId)}">
<td><code>${esc(t.tradeId)}</code></td>
<td>${fmtWhen(t.when)}</td>
<td>${esc(t.ticker)}</td>
<td>${t.isBuy ? "★ buy" : "☆ sell"}</td>
<td>${esc(t.tradeRole || "—")}</td>
<td>${fmt(t.price)}</td>
<td>${t.lotsExecuted ?? "—"}</td>
<td class="fin">${Number.isFinite(t.finrespDelta) ? fmtSignedRub(t.finrespDelta) : "—"}</td>
<td class="neg">${Number.isFinite(t.feeBuyRub) ? `−${fmt(t.feeBuyRub)} ₽` : "—"}</td>
<td class="neg">${Number.isFinite(t.feeSellRub) ? `−${fmt(t.feeSellRub)} ₽` : "—"}</td>
<td>${esc(t.tradeSourceLabel || "—")}</td>
<td>${t.fake ? "фейк" : "реал"}</td>
</tr>`;
    }).join("");
    return `<section class="proto-section" id="trades">
<h2>Журнал сделок</h2>
<div class="proto-scroll"><table class="proto-table">
<thead><tr><th>tradeId</th><th>Время</th><th>Тикер</th><th>Сторона</th><th>Роль</th><th>Цена</th><th>Лоты</th><th>FINRESPΔ</th><th>Buy fee</th><th>Sell fee</th><th>Источник</th><th>Режим</th></tr></thead>
<tbody>${rows}</tbody>
</table></div>
</section>`;
  }

  function boot() {
    const mount = document.getElementById("protocol-root");
    if (!mount) return;
    const payload = loadPayload();
    if (!payload) {
      mount.innerHTML = `<div class="proto-empty-state">
<p><strong>Нет данных протокола.</strong></p>
<p>Откройте калькулятор в режиме live и нажмите <strong>«Сохранить протокол»</strong> в блоке «История сделок».</p>
<p><a href="MultiLogic_FinrespCalculator.html">← Калькулятор</a></p>
</div>`;
      return;
    }
    const modeLabel = payload.mode === "sandbox" ? "песочница (фейк)" : "реал (брокер)";
    mount.innerHTML = `
<header class="proto-hdr">
<h1>Протокол истории сделок</h1>
<p class="proto-sub">Экспорт: ${fmtWhen(payload.exportedAt)} · режим: ${esc(modeLabel)} · версия: ${esc(payload.pageVersion || "—")}</p>
<p class="proto-sub">Формат: ${esc(payload.format || "—")} · сделок: ${payload.trades?.length ?? 0} · закрытий: ${payload.closeEvents?.length ?? 0}</p>
<nav class="proto-toc">
<a href="#summary">Сводка</a> · <a href="#closes">Закрытия FIFO</a> · <a href="#open-lots">Открытые пакеты</a> · <a href="#trades">Журнал</a>
</nav>
</header>
<main class="proto-main">
${renderPortfolioSummary(payload.portfolioSummary, payload.session)}
${renderCloseEvents(payload.closeEvents)}
${renderOpenLots(payload.openLots)}
${renderTrades(payload.trades)}
</main>
<footer class="proto-ftr"><a href="MultiLogic_FinrespCalculator.html">← Калькулятор</a></footer>`;
  }

  root.MLTradeProtocol = { boot, STORAGE_KEY, loadPayload };
})(typeof window !== "undefined" ? window : globalThis);
