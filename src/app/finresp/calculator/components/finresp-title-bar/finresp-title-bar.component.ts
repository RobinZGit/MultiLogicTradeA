import { Component, ViewEncapsulation, Input } from '@angular/core';

@Component({
  selector: 'app-finresp-title-bar',
  templateUrl: './finresp-title-bar.component.html',
  encapsulation: ViewEncapsulation.None,
})
export class FinrespTitleBarComponent {
  @Input() helpUrl = '';
}
