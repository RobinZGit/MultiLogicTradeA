import { Component, OnDestroy, OnInit, ViewEncapsulation } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { Subscription } from 'rxjs';
import { FinrespLiveService } from '../../../finresp-live.service';
import {
  EMPTY_FINRESP_LIVE,
  FinrespLiveViewModel,
} from '../../../models/finresp-ui.models';

@Component({
  selector: 'app-finresp-live-journal',
  templateUrl: './finresp-live-journal.component.html',
  encapsulation: ViewEncapsulation.None,
})
export class FinrespLiveJournalComponent implements OnInit, OnDestroy {
  live: FinrespLiveViewModel = { ...EMPTY_FINRESP_LIVE };
  journalContentSafe: SafeHtml = '';
  journalTotalsSafe: SafeHtml = '';

  private sub?: Subscription;

  constructor(
    private readonly liveService: FinrespLiveService,
    private readonly sanitizer: DomSanitizer,
  ) {}

  ngOnInit(): void {
    this.sub = this.liveService.live$.subscribe((value) => {
      this.live = value;
      this.journalContentSafe = this.sanitizer.bypassSecurityTrustHtml(
        value.journalContentHtml || '',
      );
      this.journalTotalsSafe = this.sanitizer.bypassSecurityTrustHtml(
        value.journalTotalsHtml || '',
      );
    });
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }
}
