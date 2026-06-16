/**
 * One-time / repeatable split of MultiLogic_FinrespCalculator.html into Angular pieces.
 * Source of truth after split: src/finresp/*.js + src/app/finresp/calculator/*
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const finrespDir = path.join(root, "src", "finresp");
const htmlPath = path.join(finrespDir, "MultiLogic_FinrespCalculator.html");
const componentDir = path.join(root, "src", "app", "finresp", "calculator");

if (!fs.existsSync(htmlPath)) {
  console.error("Missing:", htmlPath);
  process.exit(1);
}

const html = fs.readFileSync(htmlPath, "utf8");

const styleMatch = html.match(/<style>([\s\S]*?)<\/style>/);
if (!styleMatch) {
  console.error("No <style> block found");
  process.exit(1);
}

const bodyMatch = html.match(/<body>([\s\S]*?)<script id="ml-finresp-preboot">/);
if (!bodyMatch) {
  console.error("No <body> … preboot boundary found");
  process.exit(1);
}

function extractScript(id) {
  const re = new RegExp(
    `<script id="${id}">([\\s\\S]*?)</script>`,
    "m"
  );
  const m = html.match(re);
  if (!m) {
    console.error(`Script #${id} not found`);
    process.exit(1);
  }
  return m[1].trim();
}

const preboot = extractScript("ml-finresp-preboot");
const fallback = extractScript("ml-finresp-fallback");

const bootMatch = html.match(
  /<script>\s*\/\*[\s\S]*?UI и оркестрация калькулятора FINRESP[\s\S]*?<\/script>\s*(?=<script id="ml-finresp-fallback">)/
);
if (!bootMatch) {
  console.error("Main boot <script> block not found");
  process.exit(1);
}
const bootInner = bootMatch[0]
  .replace(/^<script>\s*/, "")
  .replace(/<\/script>\s*$/, "")
  .trim();

fs.mkdirSync(componentDir, { recursive: true });

const css = styleMatch[1].trim();
const template = bodyMatch[1].trim();

fs.writeFileSync(path.join(componentDir, "finresp-calculator.component.css"), css + "\n");
fs.writeFileSync(path.join(componentDir, "finresp-calculator.component.html"), template + "\n");
fs.writeFileSync(path.join(finrespDir, "MultiLogic_FinrespCalculator.preboot.js"), preboot + "\n");
fs.writeFileSync(path.join(finrespDir, "MultiLogic_FinrespCalculator.boot.js"), bootInner + "\n");
fs.writeFileSync(path.join(finrespDir, "MultiLogic_FinrespCalculator.fallback.js"), fallback + "\n");

console.log("Wrote:");
console.log("  finresp-calculator.component.css");
console.log("  finresp-calculator.component.html");
console.log("  MultiLogic_FinrespCalculator.preboot.js");
console.log("  MultiLogic_FinrespCalculator.boot.js");
console.log("  MultiLogic_FinrespCalculator.fallback.js");
