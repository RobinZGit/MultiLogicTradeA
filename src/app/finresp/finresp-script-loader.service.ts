import { Injectable } from '@angular/core';

@Injectable()
export class FinrespScriptLoaderService {
  readonly assetBase: string;

  constructor() {
    const baseHref = document.querySelector('base')?.getAttribute('href') || '/';
    const base = baseHref.endsWith('/') ? baseHref : `${baseHref}/`;
    this.assetBase = `${base}assets/finresp/`;
  }

  resolve(relativePath: string): string {
    return `${this.assetBase}${relativePath}`;
  }

  loadScript(relativePath: string): Promise<void> {
    const src = this.resolve(relativePath);
    const marker = `data-ml-finresp="${relativePath}"`;
    if (document.querySelector(`script[${marker}]`)) {
      return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
      const el = document.createElement('script');
      el.src = src;
      el.setAttribute('data-ml-finresp', relativePath);
      el.async = false;
      el.onload = () => resolve();
      el.onerror = () => reject(new Error(`FINRESP: failed to load ${relativePath}`));
      document.body.appendChild(el);
    });
  }
}
