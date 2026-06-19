import { Component, OnDestroy, OnInit, ViewEncapsulation } from '@angular/core';
import { Subscription } from 'rxjs';
import { FinrespBridgeService } from '../../../finresp-bridge.service';
import { FinrespFormService } from '../../../finresp-form.service';
import {
  EMPTY_FINRESP_FORM_CATALOG,
  FinrespFormCatalogViewModel,
  FinrespLogicOption,
} from '../../../models/finresp-ui.models';

@Component({
  selector: 'app-finresp-logics',
  templateUrl: './finresp-logics.component.html',
  encapsulation: ViewEncapsulation.None,
})
export class FinrespLogicsComponent implements OnInit, OnDestroy {
  readonly logicIds = this.formService.form.controls.logicIds;

  catalog: FinrespFormCatalogViewModel = { ...EMPTY_FINRESP_FORM_CATALOG };
  pickerOpen = false;
  draftIds: string[] = [];
  drawdownDisabledSet = new Set<string>();

  private sub?: Subscription;

  constructor(
    private readonly bridge: FinrespBridgeService,
    private readonly formService: FinrespFormService,
  ) {}

  ngOnInit(): void {
    this.syncDrawdownSet(this.catalog.logicDrawdownDisabledIds);
    this.bridge.registerCloseLogicPicker(() => {
      if (this.pickerOpen) this.closePicker(false);
    });
    this.sub = this.bridge.formCatalog$.subscribe((value) => {
      const optionsChanged = value.logicOptions !== this.catalog.logicOptions;
      const drawdownChanged =
        value.logicDrawdownDisabledIds !== this.catalog.logicDrawdownDisabledIds;
      this.catalog = value;
      if (drawdownChanged) {
        this.syncDrawdownSet(value.logicDrawdownDisabledIds);
      }
      if (!this.pickerOpen && value.logicChips !== this.catalog.logicChips) {
        this.draftIds = [...this.logicIds.value];
      }
      if (this.pickerOpen && (optionsChanged || drawdownChanged)) {
        queueMicrotask(() => this.syncVisibleSelect(this.draftIds));
      }
    });
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  openPicker(event?: Event): void {
    event?.stopPropagation();
    event?.preventDefault();
    if (this.pickerOpen) {
      return;
    }
    this.draftIds = [...this.logicIds.value];
    this.pickerOpen = true;
    const picker = document.getElementById('calc-logic-picker');
    const panel = document.getElementById('calc-logic-picker-panel');
    const collapsed = document.getElementById('calc-logic-picker-collapsed');
    picker?.classList.add('calc-logic-picker--open');
    if (panel) panel.hidden = false;
    collapsed?.setAttribute('aria-expanded', 'true');
    queueMicrotask(() => {
      this.syncVisibleSelect(this.draftIds);
      const visible = document.getElementById('calc-logic-visible') as HTMLSelectElement | null;
      visible?.focus();
    });
  }

  closePicker(apply: boolean): void {
    if (apply) {
      const cleared = this.draftIds.length === 0;
      this.formService.applyLogicIds(this.draftIds, cleared);
      this.bridge.notifyLogicApplied();
    }
    this.pickerOpen = false;
    const picker = document.getElementById('calc-logic-picker');
    const panel = document.getElementById('calc-logic-picker-panel');
    const collapsed = document.getElementById('calc-logic-picker-collapsed');
    picker?.classList.remove('calc-logic-picker--open');
    if (panel) panel.hidden = true;
    collapsed?.setAttribute('aria-expanded', 'false');
  }

  onDraftChange(event: Event): void {
    const el = event.target as HTMLSelectElement;
    this.draftIds = Array.from(el.selectedOptions).map((o) => o.value);
  }

  trackLogicOption(_index: number, opt: FinrespLogicOption): string {
    return opt.id;
  }

  isDrawdownDisabled(id: string): boolean {
    return this.drawdownDisabledSet.has(id);
  }

  /** Нативный multiple-select: без [selected] в шаблоне — иначе Angular сбрасывает клики. */
  private syncVisibleSelect(ids: string[]): void {
    const el = document.getElementById('calc-logic-visible') as HTMLSelectElement | null;
    if (!el) return;
    const set = new Set(ids);
    for (const opt of Array.from(el.options)) {
      opt.selected = set.has(opt.value);
    }
  }

  private syncDrawdownSet(ids: string[] | undefined): void {
    this.drawdownDisabledSet = new Set(ids || []);
  }

  onCollapsedKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      this.openPicker(event);
    }
    if (event.key === 'Escape' && this.pickerOpen) {
      this.closePicker(false);
    }
  }

  removeChip(event: MouseEvent, id: string): void {
    event.preventDefault();
    event.stopPropagation();
    const removeId = String(id || '').trim();
    if (!removeId) return;
    const prev = [...this.logicIds.value];
    const next = prev.filter((x) => x !== removeId);
    if (next.length === prev.length) return;
    const cleared = next.length === 0;
    this.formService.applyLogicIds(next, cleared);
    this.bridge.notifyLogicApplied();
  }
}
