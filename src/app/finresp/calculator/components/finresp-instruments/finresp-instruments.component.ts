import { ChangeDetectorRef, Component, OnDestroy, OnInit, ViewEncapsulation } from '@angular/core';
import { Subscription } from 'rxjs';
import { FinrespBridgeService } from '../../../finresp-bridge.service';
import { FinrespFormService } from '../../../finresp-form.service';
import {
  EMPTY_FINRESP_FORM_CATALOG,
  FinrespFormCatalogViewModel,
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
    private readonly cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.sub = this.bridge.formCatalog$.subscribe((value) => {
      this.catalog = value;
      this.formService.setInstrumentOptions(value.instrumentOptions);
      this.cdr.markForCheck();
    });
    this.idsSub = this.formService.form.controls.instrumentIds.valueChanges.subscribe(() => {
      this.cdr.markForCheck();
    });
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
    this.idsSub?.unsubscribe();
  }

  selectedIds(): string[] {
    return this.formService.form.controls.instrumentIds.value;
  }

  isSelected(id: string): boolean {
    return this.selectedIds().includes(id);
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
}
