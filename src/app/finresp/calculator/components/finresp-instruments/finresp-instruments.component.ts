import { Component, OnDestroy, OnInit, ViewEncapsulation } from '@angular/core';
import { Subscription } from 'rxjs';
import { FinrespBridgeService } from '../../../finresp-bridge.service';
import { FinrespFormService } from '../../../finresp-form.service';
import {
  EMPTY_FINRESP_FORM_CATALOG,
  FinrespFormCatalogViewModel,
  FinrespInstrumentOption,
} from '../../../models/finresp-ui.models';

@Component({
  selector: 'app-finresp-instruments',
  templateUrl: './finresp-instruments.component.html',
  encapsulation: ViewEncapsulation.None,
})
export class FinrespInstrumentsComponent implements OnInit, OnDestroy {
  catalog: FinrespFormCatalogViewModel = { ...EMPTY_FINRESP_FORM_CATALOG };

  private sub?: Subscription;
  private idsSub?: Subscription;

  constructor(
    private readonly bridge: FinrespBridgeService,
    private readonly formService: FinrespFormService,
  ) {}

  ngOnInit(): void {
    this.sub = this.bridge.formCatalog$.subscribe((value) => {
      const optionsChanged = value.instrumentOptions !== this.catalog.instrumentOptions;
      this.catalog = value;
      if (optionsChanged) {
        this.formService.setInstrumentOptions(value.instrumentOptions);
        queueMicrotask(() => this.syncVisibleSelect(this.selectedIds()));
      }
      this.syncMarketCheckboxes();
    });
    this.idsSub = this.formService.form.controls.instrumentIds.valueChanges.subscribe(() => {
      this.syncVisibleSelect(this.selectedIds());
      this.syncMarketCheckboxes();
    });
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
    this.idsSub?.unsubscribe();
  }

  private syncMarketCheckboxes(): void {
    const ids = new Set(this.selectedIds());
    this.applyMarketCheckbox('calc-sec-all-shares', 'shares', ids);
    this.applyMarketCheckbox('calc-sec-all-futures', 'futures', ids);
  }

  private applyMarketCheckbox(
    elId: string,
    market: 'shares' | 'futures',
    selected: Set<string>,
  ): void {
    const el = document.getElementById(elId) as HTMLInputElement | null;
    if (!el) return;
    const opts = this.catalog.instrumentOptions.filter((o) => o.market === market);
    if (!opts.length) {
      el.checked = false;
      el.indeterminate = false;
      return;
    }
    const n = opts.filter((o) => selected.has(o.id)).length;
    el.indeterminate = n > 0 && n < opts.length;
    el.checked = n > 0 && n === opts.length;
  }

  selectedIds(): string[] {
    return this.formService.form.controls.instrumentIds.value;
  }

  trackInstrumentOption(_index: number, opt: FinrespInstrumentOption): string {
    return opt.id;
  }

  onVisibleChange(event: Event): void {
    const el = event.target as HTMLSelectElement;
    const ids = Array.from(el.selectedOptions).map((o) => o.value).filter(Boolean);
    this.formService.applyInstrumentIds(ids);
  }

  toggleAll(market: 'shares' | 'futures', event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    const current = new Set(this.selectedIds());
    for (const opt of this.catalog.instrumentOptions) {
      if (opt.market !== market) {
        continue;
      }
      if (checked) {
        current.add(opt.id);
      } else {
        current.delete(opt.id);
      }
    }
    this.formService.applyInstrumentIds([...current]);
  }

  /** Нативный multiple-select: без [selected] в шаблоне — иначе Angular сбрасывает клики. */
  private syncVisibleSelect(ids: string[]): void {
    const el = document.getElementById('calc-sec-visible') as HTMLSelectElement | null;
    if (!el) return;
    const set = new Set(ids);
    for (const opt of Array.from(el.options)) {
      opt.selected = set.has(opt.value);
    }
  }
}
