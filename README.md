# MultiLogicTradeA

Независимое Angular-приложение с калькулятором **FINRESP**. Исходный движок и UI перенесены в этот репозиторий; ссылок на репозиторий `MultiLogicTrade` в коде нет.

Старый проект (`MultiLogicTrade`) остаётся опубликованным отдельно — этот репозиторий развивается параллельно.

## Быстрый старт

```bat
run-dev.bat
```

Откроется http://127.0.0.1:4200/finresp — калькулятор встроен в Angular (не отдельная HTML-страница из assets).

Продакшен-сборка и локальный просмотр:

```bat
run-prod.bat
```

## Структура

| Путь | Назначение |
|------|------------|
| `src/app/finresp/` | Angular-модуль: компоненты UI, `FinrespBridgeService` (мост с boot.js/live.js), ReactiveForms |
| `src/finresp/` | Движок FINRESP (indicators, logics, engine, live, worker) — копируется в `assets/finresp` при сборке |
| `scripts/split-finresp-html.mjs` | Разбор монолитного HTML на шаблон + boot/preboot/fallback (при обновлении движка) |

## GitHub Pages

Push в `main` → CI собирает с `--base-href /MultiLogicTradeA/` и публикует на Pages.

| `scripts/check-finresp-*.mjs` | Smoke-проверка калькулятора в headless Chromium |
| `tests/finresp/` | Node-тесты движка (перенесены из MultiLogicTrade) |

## Тесты и проверки

```bash
npm run test:finresp          # движок + синтаксис boot.js
npm run check:finresp:local   # http://127.0.0.1:4200/finresp (нужен ng serve)
npm run check:finresp:pages   # GitHub Pages
```

## Обновление движка

Код в `src/finresp/` — **собственная копия** в этом репозитории. При переносе правок из другого источника:

1. Скопировать изменённые файлы в `src/finresp/`
2. Если менялся `MultiLogic_FinrespCalculator.html` — положить его в `src/finresp/` и выполнить `node scripts/split-finresp-html.mjs`
3. При добавлении новых `.js` — дописать путь в `src/app/finresp/finresp-engine-scripts.ts` и в `MultiLogic_FinrespCalculator.worker.js`
