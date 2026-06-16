/**
 * Split finresp-calculator.component.html into child component templates.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const src = path.join(root, 'src', 'app', 'finresp', 'calculator');
const htmlPath = path.join(src, 'finresp-calculator.component.html');
const lines = fs.readFileSync(htmlPath, 'utf8').split(/\r?\n/);

const sections = [
  { name: 'finresp-progress-banner', start: 1, end: 11 },
  { name: 'finresp-header', start: 12, end: 16 },
  { name: 'finresp-title-bar', start: 19, end: 36 },
  { name: 'finresp-live-panel', start: 38, end: 173 },
  { name: 'finresp-calc-form', start: 175, end: 451 },
  { name: 'finresp-results', start: 452, end: 479 },
  { name: 'finresp-settings', start: 481, end: 512 },
  { name: 'finresp-footer', start: 516, end: 516 },
  { name: 'finresp-tbank-modal', start: 517, end: 526 },
];

const componentsDir = path.join(src, 'components');
fs.mkdirSync(componentsDir, { recursive: true });

for (const { name, start, end } of sections) {
  const chunk = lines.slice(start - 1, end).join('\n').trim() + '\n';
  const dir = path.join(componentsDir, name);
  fs.mkdirSync(dir, { recursive: true });

  const className = name.split('-').map((p, i) =>
    i === 0 ? p : p.charAt(0).toUpperCase() + p.slice(1)
  ).join('').replace(/^finresp/, 'Finresp');

  const selector = `app-${name}`;
  const needsHelpUrl = name === 'finresp-header' || name === 'finresp-title-bar';

  const ts = `import { Component, ViewEncapsulation${needsHelpUrl ? ', Input' : ''} } from '@angular/core';

@Component({
  selector: '${selector}',
  templateUrl: './${name}.component.html',
  encapsulation: ViewEncapsulation.None,
})
export class ${className}Component {
${needsHelpUrl ? "  @Input() helpUrl = '';\n" : ''}}
`;

  fs.writeFileSync(path.join(dir, `${name}.component.html`), chunk);
  fs.writeFileSync(path.join(dir, `${name}.component.ts`), ts);
}

const parentHtml = `<app-finresp-progress-banner></app-finresp-progress-banner>
<app-finresp-header [helpUrl]="helpUrl"></app-finresp-header>
<div class="help-layout">
<main class="help-main">
<app-finresp-title-bar [helpUrl]="helpUrl"></app-finresp-title-bar>
<app-finresp-live-panel></app-finresp-live-panel>
<app-finresp-calc-form></app-finresp-calc-form>
<app-finresp-results></app-finresp-results>
<app-finresp-settings></app-finresp-settings>
</main>
</div>
<app-finresp-footer></app-finresp-footer>
<app-finresp-tbank-modal></app-finresp-tbank-modal>
`;

fs.writeFileSync(htmlPath, parentHtml);

const exports = sections.map(({ name }) => {
  const className = name.split('-').map((p, i) =>
    i === 0 ? p : p.charAt(0).toUpperCase() + p.slice(1)
  ).join('').replace(/^finresp/, 'Finresp');
  return `import { ${className}Component } from './components/${name}/${name}.component';`;
}).join('\n');

const declarations = sections.map(({ name }) => {
  const className = name.split('-').map((p, i) =>
    i === 0 ? p : p.charAt(0).toUpperCase() + p.slice(1)
  ).join('').replace(/^finresp/, 'Finresp');
  return `    ${className}Component,`;
}).join('\n');

fs.writeFileSync(path.join(src, 'finresp-calculator.imports.ts'), `${exports}\n\nexport const FINRESP_UI_COMPONENTS = [\n${sections.map(({ name }) => {
  const className = name.split('-').map((p, i) =>
    i === 0 ? p : p.charAt(0).toUpperCase() + p.slice(1)
  ).join('').replace(/^finresp/, 'Finresp');
  return `  ${className}Component,`;
}).join('\n')}\n] as const;\n`);

console.log('Split into', sections.length, 'components');
