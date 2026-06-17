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
  protocolDownloadEnabled: boolean;
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
  protocolDownloadEnabled: false,
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
  journalMetaText: string;
  journalContentHtml: string;
  journalTotalsHtml: string;
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
  journalMetaText:
    'Журнал сессии: фейк — симуляция; реал — операции брокера. ★/☆ · FINRESPΔ · колонка «Источник» — логика робота, ручная заявка, закрытие позиции и т.п.',
  journalContentHtml:
    '<p class="live-trading-orders-empty">Разверните блок в режиме live.</p>',
  journalTotalsHtml: '',
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

export interface FinrespInstrumentOption {
  id: string;
  market: 'shares' | 'futures';
}

export interface FinrespLogicOption {
  id: string;
  name: string;
  color: string;
  obProfile?: 'mixed' | 'only' | null;
  requiresOrderBook?: boolean;
}

export interface FinrespLogicChipView {
  id: string;
  name: string;
  color: string;
  order: number;
  obProfile?: 'mixed' | 'only' | null;
  requiresOrderBook?: boolean;
}

export interface FinrespFormCatalogViewModel {
  instrumentOptions: FinrespInstrumentOption[];
  logicOptions: FinrespLogicOption[];
  secHintText: string;
  logicHintText: string;
  logicChips: FinrespLogicChipView[];
  logicSelectionCleared: boolean;
  instrumentsDisabled: boolean;
}

export const EMPTY_FINRESP_FORM_CATALOG: FinrespFormCatalogViewModel = {
  instrumentOptions: [],
  logicOptions: [],
  secHintText: '',
  logicHintText: 'Каталог редактируется в блоке «Логики» ниже (под доп. параметрами).',
  logicChips: [],
  logicSelectionCleared: false,
  instrumentsDisabled: true,
};

export interface FinrespWindowViewModel {
  start: number;
  end: number;
  min: number;
  max: number;
  disabled: boolean;
  startLabel: string;
  endLabel: string;
}

export const EMPTY_FINRESP_WINDOW: FinrespWindowViewModel = {
  start: 0,
  end: 0,
  min: 0,
  max: 0,
  disabled: true,
  startLabel: '—',
  endLabel: '—',
};

export interface FinrespChartsViewModel {
  instrumentHtml: string;
  equityHtml: string;
  instrumentVisible: boolean;
  equityVisible: boolean;
}

export const EMPTY_FINRESP_CHARTS: FinrespChartsViewModel = {
  instrumentHtml: '',
  equityHtml: '',
  instrumentVisible: false,
  equityVisible: false,
};
