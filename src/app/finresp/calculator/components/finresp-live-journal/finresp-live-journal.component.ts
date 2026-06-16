import { Component, ViewEncapsulation } from '@angular/core';

/** Журнал сделок: meta и таблица — только live.js (без live$ / innerHTML в Angular). */
@Component({
  selector: 'app-finresp-live-journal',
  templateUrl: './finresp-live-journal.component.html',
  encapsulation: ViewEncapsulation.None,
})
export class FinrespLiveJournalComponent {}
