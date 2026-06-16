import { Component, ViewEncapsulation, Input } from '@angular/core';

@Component({
  selector: 'app-finresp-header',
  templateUrl: './finresp-header.component.html',
  encapsulation: ViewEncapsulation.None,
})
export class FinrespHeaderComponent {
  @Input() helpUrl = '';
}
