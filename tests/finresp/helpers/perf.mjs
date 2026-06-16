import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const BASELINE_PATH = join(dirname(fileURLToPath(import.meta.url)), "..", "fixtures", "perf-baseline.json");

/** Множитель к жёстким порогам (медленный CI: PERF_FACTOR=3). */
export function perfFactor() {
  const raw = Number(process.env.PERF_FACTOR);
  return Number.isFinite(raw) && raw > 0 ? raw : 2.5;
}

/** Множитель к эталону из perf-baseline.json (PERF_REGRESS_FACTOR переопределяет PERF_FACTOR). */
export function regressFactor() {
  const regress = Number(process.env.PERF_REGRESS_FACTOR);
  if (Number.isFinite(regress) && regress > 0) return regress;
  return perfFactor();
}

export function perfLimit(baseMs) {
  return Math.ceil(baseMs * perfFactor());
}

let _baselineCache = null;

export function loadPerfBaseline() {
  if (!_baselineCache) {
    _baselineCache = JSON.parse(readFileSync(BASELINE_PATH, "utf8"));
  }
  return _baselineCache;
}

export function savePerfBaseline(doc) {
  writeFileSync(BASELINE_PATH, `${JSON.stringify(doc, null, 2)}\n`, "utf8");
  _baselineCache = doc;
}

/** Замер синхронной функции, возвращает ms. */
export function benchSync(fn) {
  const t0 = performance.now();
  fn();
  return performance.now() - t0;
}

/**
 * @param {number} ms
 * @param {number} limitMs
 * @param {string} label
 */
export function assertUnder(ms, limitMs, label) {
  if (ms > limitMs) {
    throw new Error(`${label}: ${ms.toFixed(0)} ms > limit ${limitMs} ms (factor ${perfFactor()})`);
  }
}

/**
 * Сравнение с эталоном из perf-baseline.json.
 * PERF_UPDATE_BASELINE=1 — перезаписать эталон измеренным значением (округление вверх).
 *
 * @param {number} ms
 * @param {string} caseId
 * @param {string} [label]
 */
export function assertBaseline(ms, caseId, label) {
  const doc = loadPerfBaseline();
  const entry = doc.cases?.[caseId];
  if (!entry) throw new Error(`perf baseline missing case: ${caseId}`);
  const name = label || entry.label || caseId;

  if (process.env.PERF_UPDATE_BASELINE === "1") {
    entry.ms = Math.ceil(ms);
    savePerfBaseline(doc);
    return;
  }

  const limit = Math.ceil(entry.ms * regressFactor());
  if (ms > limit) {
    throw new Error(
      `${name}: ${ms.toFixed(0)} ms > baseline ${entry.ms} ms × ${regressFactor()} = ${limit} ms`
    );
  }
}
