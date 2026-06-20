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
  private syncingDates = false;
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
    this.bridge.registerApplyDateFields((from, till, month) =>
      this.applyDateFields(from, till, month),
    );
    this.bridge.registerWindowSync((view) => this.syncWindowFromBridge(view));

    this.subs.push(
      this.form.controls.timeframe.valueChanges.subscribe(() => this.onTimeframeChange()),
      this.form.controls.month.valueChanges.subscribe((month) => this.onUserMonthChange(month)),
      this.form.controls.from.valueChanges.subscribe(() => this.onUserFromTillChange('from')),
      this.form.controls.till.valueChanges.subscribe(() => this.onUserFromTillChange('till')),
      this.accountMode.valueChanges.subscribe(() => {
        const domAlreadyMatched = !this.pushAccountModeToDom();
        if (domAlreadyMatched) {
          this.notifyLegacyAccountModeChange();
        }
      }),
      this.form.controls.instrumentIds.valueChanges.subscribe(() => {
        this.pushInstrumentsToDom();
        window.__mlFinresp?.persistInstrumentSelection?.();
        this.bridge.notifyInstrumentApplied();
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
    const logic = document.getElementById('calc-logic');
    logic?.addEventListener('change', () => this.syncLogicsFromDom());
  }

  setInstrumentOptions(options: FinrespInstrumentOption[]): void {
    this.instrumentMarket.clear();
    for (const opt of options) {
      this.instrumentMarket.set(opt.id, opt.market);
    }
  }

  applyInstrumentIds(ids: string[]): void {
    const cur = this.form.controls.instrumentIds.value;
    if (this.sameIdList(cur, ids)) {
      return;
    }
    this.form.controls.instrumentIds.setValue([...ids], { emitEvent: true });
  }

  applyLogicIds(ids: string[], cleared = false): void {
    const cur = this.form.controls.logicIds.value;
    const same =
      this.logicSelectionCleared === cleared && this.sameIdList(cur, ids);
    this.logicSelectionCleared = cleared;
    if (same) {
      this.refreshLogicChips();
      return;
    }
    this.form.controls.logicIds.setValue([...ids], { emitEvent: true });
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
    this.pushScalarsToDom();
    this.pushAccountModeToDom();
    this.pushInstrumentsToDom();
    this.pushLogicsToDom();
    this.refreshLogicChips();
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
    return ['UT'];
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
    if (
      catalog.logicSelectionCleared === this.logicSelectionCleared &&
      this.logicChipsEqual(catalog.logicChips, chips)
    ) {
      return;
    }
    this.bridge.formCatalog$.next({
      ...catalog,
      logicChips: chips,
      logicSelectionCleared: this.logicSelectionCleared,
    });
  }

  private logicChipsEqual(a: FinrespLogicChipView[], b: FinrespLogicChipView[]): boolean {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      const x = a[i];
      const y = b[i];
      if (
        x.id !== y.id ||
        x.name !== y.name ||
        x.color !== y.color ||
        x.order !== y.order ||
        x.obProfile !== y.obProfile ||
        x.requiresOrderBook !== y.requiresOrderBook ||
        x.drawdownDisabled !== y.drawdownDisabled
      ) {
        return false;
      }
    }
    return true;
  }

  private pushScalarsToDom(): void {
    const v = this.form.getRawValue();
    this.setDomValueSilent('calc-tf', v.timeframe);
    this.setDomValueSilent('calc-month', v.month);
    this.setDomValueSilent('calc-from', v.from);
    this.setDomValueSilent('calc-till', v.till);
    this.pushInstrumentsToDom();
    this.pushLogicsToDom();
  }

  applyDateFields(from: string, till: string, month?: string): void {
    this.syncingDates = true;
    const patch: { from: string; till: string; month?: string } = { from, till };
    if (month !== undefined) {
      patch.month = month;
    }
    this.form.patchValue(patch, { emitEvent: false });
    this.setDomValueSilent('calc-from', from);
    this.setDomValueSilent('calc-till', till);
    if (month !== undefined) {
      this.setDomValueSilent('calc-month', month);
    }
    this.syncingDates = false;
  }

  private onTimeframeChange(): void {
    const tf = this.form.controls.timeframe.value;
    const el = document.getElementById('calc-tf') as HTMLSelectElement | null;
    if (el && el.value !== tf) {
      el.value = tf;
    }
    const stopEl = document.getElementById('calc-stop-tf') as HTMLSelectElement | null;
    if (stopEl) {
      stopEl.value = tf;
    }
    el?.dispatchEvent(new Event('change', { bubbles: true }));
  }

  private onUserMonthChange(month: string): void {
    if (this.syncingDates || !month) {
      return;
    }
    const apply = window.__mlFinresp?.applyMonthSelectionFromValue;
    if (!apply) {
      return;
    }
    apply(month);
    window.__mlFinresp?.onUserDateFieldsChanged?.();
  }

  private onUserFromTillChange(anchor: 'from' | 'till'): void {
    if (this.syncingDates) {
      return;
    }
    this.setDomValueSilent('calc-from', this.form.controls.from.value);
    this.setDomValueSilent('calc-till', this.form.controls.till.value);
    window.__mlFinresp?.enforceUserDateRange?.(anchor);
    window.__mlFinresp?.onUserDateFieldsChanged?.();
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
    const ids = this.form.controls.instrumentIds.value;
    this.setMultiSelect('calc-sec', ids, { emitChange: false });
    this.syncInstrumentVisibleSelect(ids);
  }

  private syncInstrumentVisibleSelect(ids: string[]): void {
    const el = document.getElementById('calc-sec-visible') as HTMLSelectElement | null;
    if (!el) {
      return;
    }
    const set = new Set(ids);
    for (const opt of Array.from(el.options)) {
      opt.selected = set.has(opt.value);
    }
  }

  private pushLogicsToDom(): void {
    const ids = this.form.controls.logicIds.value;
    this.setMultiSelect('calc-logic', ids);
    const pickerOpen = document
      .getElementById('calc-logic-picker')
      ?.classList.contains('calc-logic-picker--open');
    if (!pickerOpen) {
      this.setMultiSelect('calc-logic-visible', ids);
    }
  }

  private syncLogicsFromDom(): void {
    const next = this.readMultiSelect('calc-logic');
    const cur = this.form.controls.logicIds.value;
    if (this.sameIdList(cur, next)) {
      return;
    }
    this.form.controls.logicIds.setValue(next, { emitEvent: true });
  }

  private sameIdList(a: string[], b: string[]): boolean {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (a[i] !== b[i]) return false;
    }
    return true;
  }

  private readMultiSelect(id: string): string[] {
    const el = document.getElementById(id) as HTMLSelectElement | null;
    if (!el) {
      return [];
    }
    return Array.from(el.selectedOptions).map((o) => o.value);
  }

  private setMultiSelect(id: string, values: string[], opts?: { emitChange?: boolean }): void {
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
    if (changed && opts?.emitChange !== false) {
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

  private setDomValueSilent(id: string, value: string): void {
    const el = document.getElementById(id) as HTMLInputElement | HTMLSelectElement | null;
    if (!el) {
      return;
    }
    if (el.value !== value) {
      el.value = value;
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
