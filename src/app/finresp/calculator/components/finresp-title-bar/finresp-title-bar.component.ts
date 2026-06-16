import { Component, Input, ViewEncapsulation } from '@angular/core';
import { FinrespFormService } from '../../../finresp-form.service';

@Component({
  selector: 'app-finresp-title-bar',
  templateUrl: './finresp-title-bar.component.html',
  encapsulation: ViewEncapsulation.None,
})
export class FinrespTitleBarComponent {
  @Input() helpUrl = '';

  readonly accountMode = this.formService.accountMode;

  constructor(private readonly formService: FinrespFormService) {}
}
