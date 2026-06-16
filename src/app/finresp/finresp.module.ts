import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { FinrespCalculatorComponent } from './calculator/finresp-calculator.component';
import { FinrespScriptLoaderService } from './finresp-script-loader.service';

const routes: Routes = [
  { path: '', component: FinrespCalculatorComponent },
];

@NgModule({
  declarations: [FinrespCalculatorComponent],
  imports: [CommonModule, RouterModule.forChild(routes)],
  providers: [FinrespScriptLoaderService],
})
export class FinrespModule {}
