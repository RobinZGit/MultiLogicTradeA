import { Component, OnDestroy, OnInit, ViewEncapsulation } from '@angular/core';
import { Subscription } from 'rxjs';
import { FinrespBridgeService } from '../../../finresp-bridge.service';
import { FinrespFormService } from '../../../finresp-form.service';
import {
  EMPTY_FINRESP_FORM_CATALOG,
  FinrespFormCatalogViewModel,
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

  private sub?: Subscription;

  constructor(
    private readonly bridge: FinrespBridgeService,
    private readonly formService: FinrespFormService,
  ) {}

  ngOnInit(): void {
    this.sub = this.bridge.formCatalog$.subscribe((value) => {
      this.catalog = value;
    });
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  openPicker(): void {
    this.draftIds = [...this.logicIds.value];
    this.pickerOpen = true;
    const picker = document.getElementById('calc-logic-picker');
    const panel = document.getElementById('calc-logic-picker-panel');
    const collapsed = document.getElementById('calc-logic-picker-collapsed');
    picker?.classList.add('calc-logic-picker--open');
    if (panel) panel.hidden = false;
    collapsed?.setAttribute('aria-expanded', 'true');
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

  onCollapsedKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      this.openPicker();
    }
    if (event.key === 'Escape' && this.pickerOpen) {
      this.closePicker(false);
    }
  }
}
