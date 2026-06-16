export interface FinrespResultsViewModel {
  finrespText: string;
  finrespColor: string;
  grossText: string;
  grossColor: string;
  commissionText: string;
  commissionColor: string;
  annSimpleText: string;
  annSimpleColor: string;
  annCompoundText: string;
  annCompoundColor: string;
  statusText: string;
  annHintText: string;
  protocolHintText: string;
  candleCount: string;
  position: string;
  cash: string;
  bySecText: string;
}

export const EMPTY_FINRESP_RESULTS: FinrespResultsViewModel = {
  finrespText: '—',
  finrespColor: '',
  grossText: '—',
  grossColor: '',
  commissionText: '0',
  commissionColor: '#b91c1c',
  annSimpleText: '—',
  annSimpleColor: '',
  annCompoundText: '—',
  annCompoundColor: '',
  statusText: 'Выберите бумаги и логику, нажмите «Рассчитать».',
  annHintText: '',
  protocolHintText: 'Протокол появится после «Рассчитать».',
  candleCount: '—',
  position: '—',
  cash: '—',
  bySecText: '—',
};

export interface FinrespLiveViewModel {
  statusText: string;
  leverageText: string;
  portfolioText: string;
  freeCashText: string;
  commissionText: string;
  commissionColor: string;
  finresultText: string;
  statsHintText: string;
  toggleText: string;
  toggleActive: boolean;
  toggleDisabled: boolean;
  sellAllDisabled: boolean;
  commissionLabel: string;
}

export const EMPTY_FINRESP_LIVE: FinrespLiveViewModel = {
  statusText: 'остановлена',
  leverageText: '—',
  portfolioText: '—',
  freeCashText: '—',
  commissionText: '0',
  commissionColor: '#b91c1c',
  finresultText: '—',
  statsHintText: 'Портфель = деньги (свободные RUB) + стоимость открытых позиций по текущим ценам.',
  toggleText: 'Начать торговлю',
  toggleActive: false,
  toggleDisabled: true,
  sellAllDisabled: true,
  commissionLabel: 'Комиссии уплачено (реально), ₽',
};

export interface FinrespFormValues {
  timeframe: string;
  month: string;
  from: string;
  till: string;
  accountMode: string;
  instrumentIds: string[];
  logicIds: string[];
}
