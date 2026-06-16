# FinrespCalculator

Калькулятор FINRESP и торговля T-Bank (реальная + песочница) для MultiLogic.

## Состав

| Файл | Назначение |
|------|------------|
| `MultiLogic_FinrespCalculator.html` | Калькулятор (UI) |
| `MultiLogic_FinrespCalculator.engine.js` | Движок расчёта и MOEX |
| `MultiLogic_FinrespCalculator.live.js` | Live-торговля (реал + песочница, T-Bank API) |
| `MultiLogic_FinrespCalculator.worker.js` | Web Worker для расчёта FINRESP |
| `MultiLogic_FinrespCalculator_Help.html` | Справка по форме |
| `serve-calculator.ps1` | Локальный HTTP-сервер |
| `price-cache/` | Резервные копии базы цен (JSON) |

## Запуск

Из корня репозитория: `..\serve-calculator.ps1`  
Или из этой папки: `.\serve-calculator.ps1` → http://127.0.0.1:8765/MultiLogic_FinrespCalculator.html

GitHub Pages: https://robinzgit.github.io/MultiLogicTrade/FinrespCalculator/MultiLogic_FinrespCalculator.html
