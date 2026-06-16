import { Component, OnDestroy, OnInit, ViewEncapsulation } from '@angular/core';
import { Subscription } from 'rxjs';
import { FinrespBridgeService } from '../../../finresp-bridge.service';
import { FinrespFormService } from '../../../finresp-form.service';
import {
  EMPTY_FINRESP_CHARTS,
  EMPTY_FINRESP_WINDOW,
  FinrespChartsViewModel,
  FinrespWindowViewModel,
} from '../../../models/finresp-ui.models';

@Component({
  selector: 'app-finresp-charts',
  templateUrl: './finresp-charts.component.html',
  encapsulation: ViewEncapsulation.None,
})
export class FinrespChartsComponent implements OnInit, OnDestroy {
  window: FinrespWindowViewModel = { ...EMPTY_FINRESP_WINDOW };
  charts: FinrespChartsViewModel = { ...EMPTY_FINRESP_CHARTS };

  readonly windowForm = this.formService.windowForm;

  private subs: Subscription[] = [];

  constructor(
    private readonly bridge: FinrespBridgeService,
    private readonly formService: FinrespFormService,
  ) {}

  ngOnInit(): void {
    this.subs.push(
      this.bridge.window$.subscribe((value) => {
        this.window = value;
      }),
      this.bridge.charts$.subscribe((value) => {
        this.charts = value;
      }),
    );
  }

  ngOnDestroy(): void {
    for (const sub of this.subs) {
      sub.unsubscribe();
    }
  }

  onStartInput(): void {
    this.formService.windowForm.controls.start.updateValueAndValidity({ emitEvent: true });
  }

  onEndInput(): void {
    this.formService.windowForm.controls.end.updateValueAndValidity({ emitEvent: true });
  }
}
