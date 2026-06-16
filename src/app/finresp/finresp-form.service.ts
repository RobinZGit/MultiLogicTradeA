import { Injectable } from '@angular/core';
import { FormBuilder, FormControl } from '@angular/forms';
import { FinrespBridgeService } from './finresp-bridge.service';
import { FinrespFormValues } from './models/finresp-ui.models';

@Injectable()
export class FinrespFormService {
  readonly accountMode = new FormControl('paper', { nonNullable: true });

  readonly form = this.fb.group({
    timeframe: this.fb.control('60', { nonNullable: true }),
    month: this.fb.control('', { nonNullable: true }),
    from: this.fb.control('', { nonNullable: true }),
    till: this.fb.control('', { nonNullable: true }),
    instrumentIds: this.fb.control<string[]>([], { nonNullable: true }),
    logicIds: this.fb.control<string[]>([], { nonNullable: true }),
  });

  constructor(
    private readonly fb: FormBuilder,
    private readonly bridge: FinrespBridgeService,
  ) {
    this.bridge.registerFormSync(() => this.syncFromDom());
    this.bridge.registerBootReady(() => this.syncFromDom());

    this.form.valueChanges.subscribe(() => this.pushToDom());
    this.accountMode.valueChanges.subscribe(() => this.pushAccountModeToDom());
  }

  bindLegacyDomListeners(): void {
    const sec = document.getElementById('calc-sec');
    const logic = document.getElementById('calc-logic');
    sec?.addEventListener('change', () => this.syncInstrumentsFromDom());
    logic?.addEventListener('change', () => this.syncLogicsFromDom());
  }

  syncFromDom(): void {
    const tf = document.getElementById('calc-tf') as HTMLSelectElement | null;
    const month = document.getElementById('calc-month') as HTMLInputElement | null;
    const from = document.getElementById('calc-from') as HTMLInputElement | null;
    const till = document.getElementById('calc-till') as HTMLInputElement | null;
    const mode = document.getElementById('account-mode') as HTMLSelectElement | null;

    this.form.patchValue(
      {
        timeframe: tf?.value ?? '60',
        month: month?.value ?? '',
        from: from?.value ?? '',
        till: till?.value ?? '',
        instrumentIds: this.readMultiSelect('calc-sec'),
        logicIds: this.readMultiSelect('calc-logic'),
      },
      { emitEvent: false },
    );

    if (mode) {
      this.accountMode.setValue(mode.value || 'paper', { emitEvent: false });
    }
  }

  snapshot(): FinrespFormValues {
    return {
      timeframe: this.form.controls.timeframe.value,
      month: this.form.controls.month.value,
      from: this.form.controls.from.value,
      till: this.form.controls.till.value,
      accountMode: this.accountMode.value,
      instrumentIds: [...this.form.controls.instrumentIds.value],
      logicIds: [...this.form.controls.logicIds.value],
    };
  }

  private pushToDom(): void {
    const v = this.form.getRawValue();
    this.setValue('calc-tf', v.timeframe);
    this.setValue('calc-month', v.month);
    this.setValue('calc-from', v.from);
    this.setValue('calc-till', v.till);
    this.setMultiSelect('calc-sec', v.instrumentIds);
    this.setMultiSelect('calc-logic', v.logicIds);
  }

  private pushAccountModeToDom(): void {
    this.setValue('account-mode', this.accountMode.value);
    const modeEl = document.getElementById('account-mode');
    modeEl?.dispatchEvent(new Event('change', { bubbles: true }));
  }

  private syncInstrumentsFromDom(): void {
    this.form.controls.instrumentIds.setValue(this.readMultiSelect('calc-sec'), { emitEvent: false });
  }

  private syncLogicsFromDom(): void {
    this.form.controls.logicIds.setValue(this.readMultiSelect('calc-logic'), { emitEvent: false });
  }

  private readMultiSelect(id: string): string[] {
    const el = document.getElementById(id) as HTMLSelectElement | null;
    if (!el) {
      return [];
    }
    return Array.from(el.selectedOptions).map((o) => o.value);
  }

  private setMultiSelect(id: string, values: string[]): void {
    const el = document.getElementById(id) as HTMLSelectElement | null;
    if (!el) {
      return;
    }
    const set = new Set(values);
    for (const opt of Array.from(el.options)) {
      opt.selected = set.has(opt.value);
    }
    el.dispatchEvent(new Event('change', { bubbles: true }));
  }

  private setValue(id: string, value: string): void {
    const el = document.getElementById(id) as HTMLInputElement | HTMLSelectElement | null;
    if (!el) {
      return;
    }
    if (el.value !== value) {
      el.value = value;
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    }
  }
}
