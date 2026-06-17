import { FinrespProgressBannerComponent } from './components/finresp-progress-banner/finresp-progress-banner.component';
import { FinrespHeaderComponent } from './components/finresp-header/finresp-header.component';
import { FinrespTitleBarComponent } from './components/finresp-title-bar/finresp-title-bar.component';
import { FinrespLivePanelComponent } from './components/finresp-live-panel/finresp-live-panel.component';
import { FinrespNotifyPanelComponent } from './components/finresp-notify-panel/finresp-notify-panel.component';
import { FinrespLiveJournalComponent } from './components/finresp-live-journal/finresp-live-journal.component';
import { FinrespInstrumentsComponent } from './components/finresp-instruments/finresp-instruments.component';
import { FinrespLogicsComponent } from './components/finresp-logics/finresp-logics.component';
import { FinrespChartsComponent } from './components/finresp-charts/finresp-charts.component';
import { FinrespCalcFormComponent } from './components/finresp-calc-form/finresp-calc-form.component';
import { FinrespResultsComponent } from './components/finresp-results/finresp-results.component';
import { FinrespSettingsComponent } from './components/finresp-settings/finresp-settings.component';
import { FinrespFooterComponent } from './components/finresp-footer/finresp-footer.component';
import { FinrespTbankModalComponent } from './components/finresp-tbank-modal/finresp-tbank-modal.component';

export const FINRESP_UI_COMPONENTS = [
  FinrespProgressBannerComponent,
  FinrespHeaderComponent,
  FinrespTitleBarComponent,
  FinrespLivePanelComponent,
  FinrespNotifyPanelComponent,
  FinrespLiveJournalComponent,
  FinrespInstrumentsComponent,
  FinrespLogicsComponent,
  FinrespChartsComponent,
  FinrespCalcFormComponent,
  FinrespResultsComponent,
  FinrespSettingsComponent,
  FinrespFooterComponent,
  FinrespTbankModalComponent,
] as const;
