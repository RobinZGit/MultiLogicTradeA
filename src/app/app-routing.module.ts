import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

const routes: Routes = [
  { path: '', redirectTo: 'finresp', pathMatch: 'full' },
  { path: 'finresp', loadChildren: () => import('./finresp/finresp.module').then(m => m.FinrespModule) },
  { path: '**', redirectTo: 'finresp' }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
