import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { FinrespCalculatorComponent } from './calculator/finresp-calculator.component';
import { FINRESP_UI_COMPONENTS } from './calculator/finresp-calculator.imports';
import { FinrespScriptLoaderService } from './finresp-script-loader.service';

const routes: Routes = [
  { path: '', component: FinrespCalculatorComponent },
];

@NgModule({
  declarations: [FinrespCalculatorComponent, ...FINRESP_UI_COMPONENTS],
  imports: [CommonModule, RouterModule.forChild(routes)],
  providers: [FinrespScriptLoaderService],
})
export class FinrespModule {}
