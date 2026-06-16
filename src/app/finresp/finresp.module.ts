import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { RouterModule, Routes } from '@angular/router';
import { FinrespCalculatorComponent } from './calculator/finresp-calculator.component';
import { FINRESP_UI_COMPONENTS } from './calculator/finresp-calculator.imports';
import { FinrespBridgeService } from './finresp-bridge.service';
import { FinrespFormService } from './finresp-form.service';
import { FinrespLiveService } from './finresp-live.service';
import { FinrespScriptLoaderService } from './finresp-script-loader.service';

const routes: Routes = [
  { path: '', component: FinrespCalculatorComponent },
];

@NgModule({
  declarations: [FinrespCalculatorComponent, ...FINRESP_UI_COMPONENTS],
  imports: [CommonModule, ReactiveFormsModule, RouterModule.forChild(routes)],
  providers: [
    FinrespScriptLoaderService,
    FinrespBridgeService,
    FinrespFormService,
    FinrespLiveService,
  ],
})
export class FinrespModule {}
