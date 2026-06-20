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
  statusIsError: boolean;
  statusIsWarn: boolean;
  leverageText: string;
  portfolioText: string;
  freeCashText: string;
  commissionText: string;
  commissionColor: string;
  /** @deprecated combined; use finresultRealText + finresultModelText */
  finresultText: string;
  finresultRealText: string;
  finresultModelText: string;
  finresultRealPositive: boolean;
  finresultRealNegative: boolean;
  finresultModelPositive: boolean;
  finresultModelNegative: boolean;
  statsHintText: string;
  toggleText: string;
  toggleActive: boolean;
  toggleDisabled: boolean;
  singleStepDisabled: boolean;
  singleStepBusy: boolean;
  sellAllDisabled: boolean;
  commissionLabel: string;
  journalMetaText: string;
  journalContentHtml: string;
  journalTotalsHtml: string;
}

export const EMPTY_FINRESP_LIVE: FinrespLiveViewModel = {
  statusText: 'остановлена',
  statusIsError: false,
  statusIsWarn: false,
  leverageText: '—',
  portfolioText: '—',
  freeCashText: '—',
  commissionText: '0',
  commissionColor: '#b91c1c',
  finresultText: '—',
  finresultRealText: '—',
  finresultModelText: '—',
  finresultRealPositive: false,
  finresultRealNegative: false,
  finresultModelPositive: false,
  finresultModelNegative: false,
  statsHintText: 'Портфель = деньги (свободные RUB) + стоимость открытых позиций по текущим ценам.',
  toggleText: 'Начать торговлю',
  toggleActive: false,
  toggleDisabled: true,
  singleStepDisabled: true,
  singleStepBusy: false,
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
  logicSelectionCleared?: boolean;
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
  /** Временно выключена @@PauseOnDrawdown (live / расчёт с recovery). */
  drawdownDisabled?: boolean;
}

export interface FinrespFormCatalogViewModel {
  instrumentOptions: FinrespInstrumentOption[];
  logicOptions: FinrespLogicOption[];
  secHintText: string;
  logicHintText: string;
  logicChips: FinrespLogicChipView[];
  logicSelectionCleared: boolean;
  /** id логик, отключённых просадкой (@@PauseOnDrawdown). */
  logicDrawdownDisabledIds: string[];
  instrumentsDisabled: boolean;
}

export const EMPTY_FINRESP_FORM_CATALOG: FinrespFormCatalogViewModel = {
  instrumentOptions: [],
  logicOptions: [],
  secHintText: '',
  logicHintText: 'Каталог редактируется в блоке «Логики» ниже (под доп. параметрами).',
  logicChips: [],
  logicSelectionCleared: false,
  logicDrawdownDisabledIds: [],
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
