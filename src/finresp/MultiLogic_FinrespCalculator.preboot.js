(function () {
  "use strict";
  window.__mlFinresp = window.__mlFinresp || {};
  /** Установка значения: `setTechPre`. */
  function setTechPre(text) {
    var el = document.getElementById("tech-info-text");
    if (el) el.textContent = text;
  }
  /** Синхронизация UI/state: `syncLivePanelFromMode`. */
  function syncLivePanelFromMode() {
    var panel = document.getElementById("live-trading-panel");
    var mode = document.getElementById("account-mode");
    if (!panel || !mode) return;
    var isLive = mode.value === "live";
    panel.hidden = !isLive;
    var sandbox = document.getElementById("live-sandbox-mode");
    panel.classList.toggle("live-trading-panel--sandbox", isLive && !!(sandbox && sandbox.checked));
    mode.classList.toggle("account-mode-select--live", isLive);
    var lbl = document.querySelector("label.account-mode");
    if (lbl) lbl.classList.toggle("account-mode--live", isLive);
  }
  /** Обработчик смены кошелька (paper / T-Bank / live). */
  function onAccountModeChange() {
    syncLivePanelFromMode();
    if (typeof window.__mlOnAccountModeUserChange === "function") {
      window.__mlOnAccountModeUserChange().catch(function (e) {
        setTechPre("account-mode change error:\n" + (e && e.message ? e.message : e));
      });
    } else if (typeof window.__mlSyncAccountMode === "function") {
      try { window.__mlSyncAccountMode(); } catch (e) {
        setTechPre("preboot + syncAccountModeUi error:\n" + (e && e.message ? e.message : e));
      }
    }
  }
  /** Галочка песочницы: только стили панели; логику переключает live.js (`onLiveSandboxToggle`). */
  function onSandboxModeChange() {
    syncLivePanelFromMode();
  }
  window.__mlFinresp.preboot = { setTechPre, syncLivePanelFromMode };
  setTechPre(
    "preboot ok · protocol=" + location.protocol + "\n"
    + "ожидание MultiLogic_FinrespCalculator.engine.js и live.js…\n"
    + "url=" + location.href
  );
  syncLivePanelFromMode();
  var modeEl = document.getElementById("account-mode");
  if (modeEl) modeEl.addEventListener("change", onAccountModeChange);
  var sbEl = document.getElementById("live-sandbox-mode");
  if (sbEl) sbEl.addEventListener("change", onSandboxModeChange);
})();
