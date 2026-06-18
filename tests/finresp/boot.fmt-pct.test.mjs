import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const bootPath = join(__dirname, "..", "..", "src", "finresp", "MultiLogic_FinrespCalculator.boot.js");
const bootSrc = readFileSync(bootPath, "utf8");

function evalBootHelpers() {
  const ctx = {
    ANN_PCT_DISPLAY_MAX: 9999.99,
    fmt(v, d = 2) {
      return Number.isFinite(v)
        ? v.toLocaleString("ru-RU", { minimumFractionDigits: d, maximumFractionDigits: d })
        : "—";
    }
  };
  const fmtPctBody = bootSrc.match(/const fmtPct = \(v\) => \{[\s\S]*?\n  \};/);
  assert.ok(fmtPctBody, "fmtPct function present");
  const compoundBody = bootSrc.match(/function annualCompoundPct\(finresp, deposit, days\) \{[\s\S]*?\n  \}/);
  assert.ok(compoundBody, "annualCompoundPct function present");
  // eslint-disable-next-line no-new-func
  const fn = new Function(
    "ANN_PCT_DISPLAY_MAX",
    "fmt",
    `${fmtPctBody[0]}\n${compoundBody[0]}\nreturn { fmtPct, annualCompoundPct };`
  );
  return fn(ctx.ANN_PCT_DISPLAY_MAX, ctx.fmt);
}

describe("boot fmtPct / annualCompoundPct", () => {
  const { fmtPct, annualCompoundPct } = evalBootHelpers();

  it("caps huge positive % at 9999.99", () => {
    assert.equal(fmtPct(418747378838303700e24), ">9 999,99 %");
    assert.equal(fmtPct(10000), ">9 999,99 %");
    assert.equal(fmtPct(8557.52), "8 557,52 %");
  });

  it("caps huge negative %", () => {
    assert.equal(fmtPct(-12000), "<-9 999,99 %");
  });

  it("returns em dash for non-finite", () => {
    assert.equal(fmtPct(Infinity), "—");
    assert.equal(fmtPct(null), "—");
  });

  it("annualCompoundPct returns null when period is too short (pow would overflow)", () => {
    const pct = annualCompoundPct(190.48, 6393, 0.127);
    assert.equal(pct, null);
  });

  it("annualCompoundPct is finite for normal backtest window", () => {
    const pct = annualCompoundPct(5000, 100000, 30);
    assert.ok(Number.isFinite(pct));
    assert.ok(pct > 0);
  });
});
