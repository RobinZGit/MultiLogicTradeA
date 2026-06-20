import { Component, OnInit, ViewEncapsulation } from '@angular/core';
import {
  FINRESP_BOOTSTRAP_SCRIPTS,
  FINRESP_ENGINE_SCRIPTS,
} from '../finresp-engine-scripts';
import { FinrespBridgeService } from '../finresp-bridge.service';
import { FinrespScriptLoaderService } from '../finresp-script-loader.service';

@Component({
  selector: 'app-finresp-calculator',
  templateUrl: './finresp-calculator.component.html',
  encapsulation: ViewEncapsulation.None,
})
export class FinrespCalculatorComponent implements OnInit {
  readonly helpUrl: string;
  private bootStarted = false;

  constructor(
    private readonly scripts: FinrespScriptLoaderService,
    private readonly bridge: FinrespBridgeService,
  ) {
    this.bridge.installOnWindow();
    this.helpUrl = this.scripts.resolve('MultiLogic_FinrespCalculator_Help.html');
  }

  ngOnInit(): void {
    if (this.bootStarted) {
      return;
    }
    this.bootStarted = true;
    window.__mlFinrespAssetBase = this.scripts.assetBase;
    void this.bootstrap();
  }

  private async bootstrap(): Promise<void> {
    const allScripts = [...FINRESP_ENGINE_SCRIPTS, ...FINRESP_BOOTSTRAP_SCRIPTS];
    const total = allScripts.length;
    let done = 0;
    const boot = (text: string) => {
      window.__mlFinresp?.setBootStatus?.(text);
    };
    boot('Загрузка модулей FINRESP…');
    try {
      for (const rel of FINRESP_ENGINE_SCRIPTS) {
        await this.scripts.loadScript(rel);
        done += 1;
        boot(`Загрузка модулей FINRESP (${done}/${total})…`);
      }
      for (const rel of FINRESP_BOOTSTRAP_SCRIPTS) {
        await this.scripts.loadScript(rel);
        done += 1;
        boot(`Загрузка модулей FINRESP (${done}/${total})…`);
      }
      boot('Инициализация калькулятора…');
    } catch (err) {
      window.__mlFinresp?.clearBootStatus?.();
      console.error('FINRESP bootstrap failed', err);
      const pre = window.__mlFinresp?.preboot;
      if (pre?.setTechPre && err instanceof Error) {
        pre.setTechPre(`Ошибка загрузки скриптов FINRESP:\n${err.message}\n\nПроверьте run-dev.bat и Ctrl+F5.`);
      }
    }
  }
}
