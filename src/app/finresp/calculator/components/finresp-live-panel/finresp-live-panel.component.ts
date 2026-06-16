import { Component, OnDestroy, OnInit, ViewEncapsulation } from '@angular/core';
import { Subscription } from 'rxjs';
import { FinrespLiveService } from '../../../finresp-live.service';
import {
  EMPTY_FINRESP_LIVE,
  FinrespLiveViewModel,
} from '../../../models/finresp-ui.models';

@Component({
  selector: 'app-finresp-live-panel',
  templateUrl: './finresp-live-panel.component.html',
  encapsulation: ViewEncapsulation.None,
})
export class FinrespLivePanelComponent implements OnInit, OnDestroy {
  live: FinrespLiveViewModel = { ...EMPTY_FINRESP_LIVE };

  private sub?: Subscription;

  constructor(private readonly liveService: FinrespLiveService) {}

  ngOnInit(): void {
    this.sub = this.liveService.live$.subscribe((value) => {
      this.live = value;
    });
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }
}
