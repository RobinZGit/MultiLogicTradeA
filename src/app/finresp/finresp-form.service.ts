import { Injectable, OnDestroy } from '@angular/core';
import { FormBuilder, FormControl } from '@angular/forms';
import { Subscription } from 'rxjs';
import { FinrespBridgeInstrument, FinrespBridgeService } from './finresp-bridge.service';
import {
  FinrespFormValues,
  FinrespInstrumentOption,
  FinrespLogicChipView,
  FinrespWindowViewModel,
} from './models/finresp-ui.models';

declare global {
  interface Window {
    __mlOnAccountModeUserChange?: () => void | Promise<void>;
    __mlSyncAccountMode?: () => void;
  }
}

@Injectable()
export class FinrespFormService implements OnDestroy {
  readonly accountMode = new FormControl('paper', { nonNullable: true });

  readonly form = this.fb.group({
    timeframe: this.fb.control('60', { nonNullable: true }),
    month: this.fb.control('', { nonNullable: true }),
    from: this.fb.control('', { nonNullable: true }),
    till: this.fb.control('', { nonNullable: true }),
    instrumentIds: this.fb.control<string[]>([], { nonNullable: true }),
    logicIds: this.fb.control<string[]>([], { nonNullable: true }),
  });

  readonly windowForm = this.fb.group({
    start: this.fb.control(0, { nonNullable: true }),
    end: this.fb.control(0, { nonNullable: true }),
  });

  private instrumentMarket = new Map<string, 'shares' | 'futures'>();
  private logicSelectionCleared = false;
  private syncingWindow = false;
  private subs: Subscription[] = [];

  constructor(
    private readonly fb: FormBuilder,
    private readonly bridge: FinrespBridgeService,
  ) {
    this.bridge.registerFormSync(() => this.syncFromDom());
    this.bridge.registerBootReady(() => this.onBridgeBootReady());
    this.bridge.registerApplyFormSnapshot((snapshot) => this.applySnapshot(snapshot));
    this.bridge.registerPrepareForConfigPersist(() => this.prepareForConfigPersist());
    this.bridge.registerFormSnapshot(() => this.snapshot());
    this.bridge.registerInstruments(() => this.selectedInstruments());
    this.bridge.registerLogicIds(() => this.selectedLogicIds());
    this.bridge.registerApplyInstruments((ids) => this.applyInstrumentIds(ids));
    this.bridge.registerApplyLogics((ids, cleared) => this.applyLogicIds(ids, cleared));
    this.bridge.registerLogicChipsRefresh(() => this.refreshLogicChips());
    this.bridge.registerWindowSync((view) => this.syncWindowFromBridge(view));

    this.subs.push(
      this.form.valueChanges.subscribe(() => this.pushScalarsToDom()),
      this.accountMode.valueChanges.subscribe(() => {
        const domAlreadyMatched = !this.pushAccountModeToDom();
        if (domAlreadyMatched) {
          this.notifyLegacyAccountModeChange();
        }
      }),
      this.form.controls.instrumentIds.valueChanges.subscribe(() => {
        this.pushInstrumentsToDom();
        this.refreshLogicChips();
        window.__mlFinresp?.persistInstrumentSelection?.();
      }),
      this.form.controls.logicIds.valueChanges.subscribe(() => {
        this.pushLogicsToDom();
        this.refreshLogicChips();
        window.__mlFinresp?.persistLogicSelection?.();
      }),
      this.windowForm.controls.start.valueChanges.subscribe(() => this.onWindowControlChange('start')),
      this.windowForm.controls.end.valueChanges.subscribe(() => this.onWindowControlChange('end')),
    );
  }

  ngOnDestroy(): void {
    for (const sub of this.subs) {
      sub.unsubscribe();
    }
  }

  bindLegacyDomListeners(): void {
    const sec = document.getElementById('calc-sec');
    const logic = document.getElementById('calc-logic');
    sec?.addEventListener('change', () => this.syncInstrumentsFromDom());
    logic?.addEventListener('change', () => this.syncLogicsFromDom());
  }

  setInstrumentOptions(options: FinrespInstrumentOption[]): void {
    this.instrumentMarket.clear();
    for (const opt of options) {
      this.instrumentMarket.set(opt.id, opt.market);
    }
  }

  applyInstrumentIds(ids: string[]): void {
    this.form.controls.instrumentIds.setValue([...ids], { emitEvent: true });
  }

  applyLogicIds(ids: string[], cleared = false): void {
    this.logicSelectionCleared = cleared;
    this.form.controls.logicIds.setValue([...ids], { emitEvent: true });
    this.refreshLogicChips();
  }

  setLogicSelectionCleared(cleared: boolean): void {
    this.logicSelectionCleared = cleared;
    this.refreshLogicChips();
  }

  /** Восстановление полей Angular-формы из localStorage (вызывается из boot.js после рендера). */
  applySnapshot(snapshot: Partial<FinrespFormValues>): void {
    const patch: Partial<{
      timeframe: string;
      month: string;
      from: string;
      till: string;
      instrumentIds: string[];
      logicIds: string[];
    }> = {};
    if (snapshot.timeframe != null) patch.timeframe = snapshot.timeframe;
    if (snapshot.month != null) patch.month = snapshot.month;
    if (snapshot.from != null) patch.from = snapshot.from;
    if (snapshot.till != null) patch.till = snapshot.till;
    if (snapshot.instrumentIds != null) patch.instrumentIds = [...snapshot.instrumentIds];
    if (snapshot.logicSelectionCleared != null) {
      this.logicSelectionCleared = !!snapshot.logicSelectionCleared;
    }
    if (snapshot.logicIds != null) {
      patch.logicIds = [...snapshot.logicIds];
      if (snapshot.logicSelectionCleared == null) {
        this.logicSelectionCleared = snapshot.logicIds.length === 0;
      }
    }

    if (snapshot.accountMode != null) {
      this.accountMode.setValue(this.normalizeAccountMode(snapshot.accountMode), { emitEvent: false });
    }
    if (Object.keys(patch).length) {
      this.form.patchValue(patch, { emitEvent: false });
    }
  }

  private onBridgeBootReady(): void {
    this.syncFromDom();
    this.pushScalarsToDom();
    this.pushAccountModeToDom();
    this.pushInstrumentsToDom();
    this.pushLogicsToDom();
    this.refreshLogicChips();
    window.__mlFinrespBridge?.refreshLogicChips?.();
  }

  /** Перед записью config: Angular → скрытые DOM-зеркала, без затирания из пустого select. */
  prepareForConfigPersist(): FinrespFormValues {
    this.pushScalarsToDom();
    this.pushAccountModeToDom();
    this.pushInstrumentsToDom();
    this.pushLogicsToDom();
    return this.snapshot();
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
      this.accountMode.setValue(this.normalizeAccountMode(mode.value || 'paper'), { emitEvent: false });
    }

    this.syncWindowFromDom();
    this.refreshLogicChips();
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
      logicSelectionCleared: this.logicSelectionCleared,
    };
  }

  selectedInstruments(): FinrespBridgeInstrument[] {
    return this.form.controls.instrumentIds.value
      .filter(Boolean)
      .map((sec) => ({
        sec,
        market: this.instrumentMarket.get(sec) ?? 'shares',
      }));
  }

  selectedLogicIds(): string[] {
    const ids = this.form.controls.logicIds.value.filter(Boolean);
    if (ids.length) {
      return ids;
    }
    if (this.logicSelectionCleared) {
      return [];
    }
    return ['RND'];
  }

  private syncWindowFromBridge(view: FinrespWindowViewModel): void {
    this.syncingWindow = true;
    this.windowForm.patchValue(
      { start: view.start, end: view.end },
      { emitEvent: false },
    );
    this.syncingWindow = false;
  }

  private syncWindowFromDom(): void {
    const startEl = document.getElementById('calc-start') as HTMLInputElement | null;
    const endEl = document.getElementById('calc-end') as HTMLInputElement | null;
    if (!startEl || !endEl) {
      return;
    }
    this.syncingWindow = true;
    this.windowForm.patchValue(
      {
        start: Number(startEl.value) || 0,
        end: Number(endEl.value) || 0,
      },
      { emitEvent: false },
    );
    this.syncingWindow = false;
  }

  private onWindowControlChange(which: 'start' | 'end'): void {
    if (this.syncingWindow) {
      return;
    }
    const start = this.windowForm.controls.start.value;
    const end = this.windowForm.controls.end.value;
    this.setHiddenRange('calc-start', start);
    this.setHiddenRange('calc-end', end);
    this.bridge.notifyWindowInput(which, start, end);
  }

  private refreshLogicChips(): void {
    const catalog = this.bridge.formCatalog$.value;
    const ids = this.form.controls.logicIds.value;
    const disabledSet = new Set(catalog.logicDrawdownDisabledIds || []);
    const chips: FinrespLogicChipView[] = ids.map((id, index) => {
      const opt = catalog.logicOptions.find((o) => o.id === id);
      const drawdownDisabled = disabledSet.has(id);
      return {
        id,
        name: opt?.name ?? id,
        color: opt?.color ?? '#64748b',
        order: index + 1,
        obProfile: opt?.obProfile ?? null,
        requiresOrderBook: opt?.requiresOrderBook ?? false,
        drawdownDisabled,
      };
    });
    this.bridge.formCatalog$.next({
      ...catalog,
      logicChips: chips,
      logicSelectionCleared: this.logicSelectionCleared,
    });
  }

  private pushScalarsToDom(): void {
    const v = this.form.getRawValue();
    this.setValue('calc-tf', v.timeframe);
    this.setValue('calc-month', v.month);
    this.setValue('calc-from', v.from);
    this.setValue('calc-till', v.till);
    this.pushInstrumentsToDom();
    this.pushLogicsToDom();
  }

  private normalizeAccountMode(mode: string): 'paper' | 'live' {
    return mode === 'live' ? 'live' : 'paper';
  }

  /** @returns true если значение в DOM было обновлено (change уйдёт в preboot). */
  private pushAccountModeToDom(): boolean {
    const modeEl = document.getElementById('account-mode') as HTMLSelectElement | null;
    if (!modeEl) {
      return false;
    }
    const next = this.accountMode.value;
    if (modeEl.value === next) {
      return false;
    }
    modeEl.value = next;
    modeEl.dispatchEvent(new Event('input', { bubbles: true }));
    modeEl.dispatchEvent(new Event('change', { bubbles: true }));
    return true;
  }

  /** Angular FormControl не всегда даёт нативный change — дергаем legacy boot/live. */
  private notifyLegacyAccountModeChange(): void {
    window.__mlFinresp?.preboot?.syncLivePanelFromMode?.();
    const handler = window.__mlOnAccountModeUserChange;
    if (typeof handler === 'function') {
      void Promise.resolve(handler()).catch((err: unknown) => {
        console.error('account-mode change', err);
      });
      return;
    }
    try {
      window.__mlSyncAccountMode?.();
    } catch {
      /* preboot-only path */
    }
  }

  private pushInstrumentsToDom(): void {
    this.setMultiSelect('calc-sec', this.form.controls.instrumentIds.value);
  }

  private pushLogicsToDom(): void {
    this.setMultiSelect('calc-logic', this.form.controls.logicIds.value);
  }

  private syncInstrumentsFromDom(): void {
    this.form.controls.instrumentIds.setValue(this.readMultiSelect('calc-sec'), { emitEvent: true });
  }

  private syncLogicsFromDom(): void {
    this.form.controls.logicIds.setValue(this.readMultiSelect('calc-logic'), { emitEvent: true });
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
    let changed = false;
    for (const opt of Array.from(el.options)) {
      const next = set.has(opt.value);
      if (opt.selected !== next) {
        opt.selected = next;
        changed = true;
      }
    }
    if (changed) {
      el.dispatchEvent(new Event('change', { bubbles: true }));
    }
  }

  private setHiddenRange(id: string, value: number): void {
    const el = document.getElementById(id) as HTMLInputElement | null;
    if (!el) {
      return;
    }
    const next = String(value);
    if (el.value !== next) {
      el.value = next;
      el.dispatchEvent(new Event('input', { bubbles: true }));
    }
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
