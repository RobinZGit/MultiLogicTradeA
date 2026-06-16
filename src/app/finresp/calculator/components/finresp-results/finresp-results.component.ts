import { Component, Input, OnDestroy, OnInit, ViewEncapsulation } from '@angular/core';
import { Subscription } from 'rxjs';
import { FinrespBridgeService } from '../../../finresp-bridge.service';
import {
  EMPTY_FINRESP_RESULTS,
  FinrespResultsViewModel,
} from '../../../models/finresp-ui.models';

@Component({
  selector: 'app-finresp-results',
  templateUrl: './finresp-results.component.html',
  encapsulation: ViewEncapsulation.None,
})
export class FinrespResultsComponent implements OnInit, OnDestroy {
  @Input() results: FinrespResultsViewModel = { ...EMPTY_FINRESP_RESULTS };

  private sub?: Subscription;

  constructor(private readonly bridge: FinrespBridgeService) {}

  ngOnInit(): void {
    this.sub = this.bridge.results$.subscribe((value) => {
      this.results = value;
    });
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }
}
