(function () {
  var boot = window.__mlFinresp || {};
  if (boot.bootPhase === "ok" || window.__mlFinrespVersion) return;
  var t = document.getElementById("tech-info-text");
  if (!t) return;
  if (!(/загрузка/i.test(t.textContent) || /ожидание MultiLogic_FinrespCalculator/i.test(t.textContent) || /preboot ok/i.test(t.textContent))) {
    return;
  }
  var lines = [
    "ОШИБКА: основной скрипт калькулятора не выполнился.",
    "protocol=" + location.protocol,
    "bootPhase=" + (boot.bootPhase || "—"),
    "engineFailed=" + !!boot.engineFailed,
    "chartsFailed=" + !!boot.chartsFailed,
    "liveFailed=" + !!boot.liveFailed
  ];
  if (boot.lastBootError) lines.push("lastBootError=" + boot.lastBootError);
  lines.push(
    "",
    "Частая причина: синтаксическая ошибка во встроенном <script> HTML (ломает весь калькулятор).",
    "npm test в репозитории ловит это до публикации.",
    "",
    "Проверьте:",
    "1) assets/finresp: engine.js, charts.js, live.js и папки indicators/logics",
    "2) Ctrl+Shift+R (жёсткое обновление)",
    "3) F12 → Console — красная строка с номером строки",
    "4) run-dev.bat → http://127.0.0.1:4200/finresp"
  );
  if (location.protocol === "file:") {
    lines.push("", "file://: для MOEX и стабильной загрузки модулей лучше run-dev.bat → http://127.0.0.1:4200/finresp");
  }
  t.textContent = lines.join("\n");
  var p = boot.preboot;
  if (p) p.syncLivePanelFromMode();
})();
