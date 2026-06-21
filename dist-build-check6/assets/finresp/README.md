# FINRESP — движок в MultiLogicTradeA

Исходники калькулятора FINRESP для Angular-приложения **MultiLogicTradeA**.

При сборке (`ng build` / `ng serve`) содержимое этой папки копируется в `dist/.../assets/finresp/`.

## Запуск

Из корня репозитория: `run-dev.bat` → http://127.0.0.1:4200/finresp

## Ключевые файлы

| Файл | Назначение |
|------|------------|
| `MultiLogic_FinrespCalculator.engine.js` | Расчёт FINRESP |
| `MultiLogic_FinrespCalculator.charts.js` | Графики |
| `MultiLogic_FinrespCalculator.live.js` | Live-торговля T-Bank |
| `MultiLogic_FinrespCalculator.worker.js` | Web Worker для тяжёлых расчётов |
| `MultiLogic_FinrespCalculator.boot.js` | UI и оркестрация (извлечён из HTML) |
| `MultiLogic_FinrespCalculator.preboot.js` | Ранний preboot до загрузки движка |
| `indicators/`, `logics/`, `connectors/` | Реестры и реализации |
| `price-cache/` | Резервные копии базы цен (JSON) |

Шаблон формы калькулятора: `src/app/finresp/calculator/finresp-calculator.component.html`.

## Обновление из монолитного HTML

Если появился новый `MultiLogic_FinrespCalculator.html`:

```bash
node scripts/split-finresp-html.mjs
```

Скрипт обновит component HTML/CSS и boot/preboot/fallback в этой папке.
