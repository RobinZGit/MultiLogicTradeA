import { AfterViewInit, Component, ViewEncapsulation } from '@angular/core';
import { FinrespFormService } from '../../../finresp-form.service';

@Component({
  selector: 'app-finresp-calc-form',
  templateUrl: './finresp-calc-form.component.html',
  encapsulation: ViewEncapsulation.None,
})
export class FinrespCalcFormComponent implements AfterViewInit {
  readonly form = this.formService.form;

  constructor(private readonly formService: FinrespFormService) {}

  ngAfterViewInit(): void {
    this.formService.bindLegacyDomListeners();
  }
}
