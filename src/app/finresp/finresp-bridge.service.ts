import { Injectable, NgZone } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import {
  EMPTY_FINRESP_CHARTS,
  EMPTY_FINRESP_FORM_CATALOG,
  EMPTY_FINRESP_LIVE,
  EMPTY_FINRESP_RESULTS,
  EMPTY_FINRESP_WINDOW,
  FinrespChartsViewModel,
  FinrespFormCatalogViewModel,
  FinrespFormValues,
  FinrespLiveViewModel,
  FinrespResultsViewModel,
  FinrespWindowViewModel,
} from './models/finresp-ui.models';

export interface FinrespBridgeInstrument {
  sec: string;
  market: 'shares' | 'futures';
}

export interface FinrespBridgeApi {
  setResults: (view: Partial<FinrespResultsViewModel>) => void;
  setLive: (view: Partial<FinrespLiveViewModel>) => void;
  setStatus: (text: string) => void;
  setFormCatalog: (view: Partial<FinrespFormCatalogViewModel>) => void;
  setWindow: (view: Partial<FinrespWindowViewModel>) => void;
  setCharts: (view: Partial<FinrespChartsViewModel>) => void;
  getFormSnapshot: () => FinrespFormValues;
  getSelectedInstruments: () => FinrespBridgeInstrument[];
  getSelectedLogicIds: () => string[];
  applyInstrumentSelection: (ids: string[]) => void;
  applyLogicSelection: (ids: string[], cleared?: boolean) => void;
  applyFormSnapshot: (snapshot: Partial<FinrespFormValues>) => void;
  applyDateFields: (from: string, till: string, month?: string) => void;
  prepareForConfigPersist: () => FinrespFormValues;
  registerWindowHandler: (
    handler: (which: 'start' | 'end', start: number, end: number) => void,
  ) => void;
  registerLogicAppliedHandler: (handler: () => void) => void;
  registerInstrumentAppliedHandler: (handler: () => void) => void;
  registerLogicChipsRefresh: (handler: () => void) => void;
  refreshLogicChips: () => void;
  syncFormFromDom: () => void;
  onBootReady: () => void;
}

import './finresp-window.global';

declare global {
  interface Window {
    __mlFinrespBridge?: FinrespBridgeApi;
  }
}

@Injectable()
export class FinrespBridgeService {
  readonly results$ = new BehaviorSubject<FinrespResultsViewModel>({ ...EMPTY_FINRESP_RESULTS });
  readonly live$ = new BehaviorSubject<FinrespLiveViewModel>({ ...EMPTY_FINRESP_LIVE });
  readonly formCatalog$ = new BehaviorSubject<FinrespFormCatalogViewModel>({
    ...EMPTY_FINRESP_FORM_CATALOG,
  });
  readonly window$ = new BehaviorSubject<FinrespWindowViewModel>({ ...EMPTY_FINRESP_WINDOW });
  readonly charts$ = new BehaviorSubject<FinrespChartsViewModel>({ ...EMPTY_FINRESP_CHARTS });

  private formSyncHandler: (() => void) | null = null;
  private bootReadyHandler: (() => void) | null = null;
  private formSnapshotHandler: (() => FinrespFormValues) | null = null;
  private instrumentsHandler: (() => FinrespBridgeInstrument[]) | null = null;
  private logicIdsHandler: (() => string[]) | null = null;
  private applyInstrumentsHandler: ((ids: string[]) => void) | null = null;
  private applyLogicsHandler: ((ids: string[], cleared?: boolean) => void) | null = null;
  private applyFormSnapshotHandler: ((snapshot: Partial<FinrespFormValues>) => void) | null =
    null;
  private applyDateFieldsHandler:
    | ((from: string, till: string, month?: string) => void)
    | null = null;
  private prepareForConfigPersistHandler: (() => FinrespFormValues) | null = null;
  private windowInputHandler:
    | ((which: 'start' | 'end', start: number, end: number) => void)
    | null = null;
  private logicAppliedHandler: (() => void) | null = null;
  private instrumentAppliedHandler: (() => void) | null = null;
  private logicChipsRefreshHandler: (() => void) | null = null;
  private windowSyncHandler: ((view: FinrespWindowViewModel) => void) | null = null;

  constructor(private readonly ngZone: NgZone) {}

  installOnWindow(): void {
    window.__mlFinrespBridge = {
      setResults: (view) => this.ngZone.run(() => this.patchResults(view)),
      setLive: (view) => this.ngZone.run(() => this.patchLive(view)),
      setStatus: (text) => this.ngZone.run(() => this.patchResults({ statusText: text })),
      setFormCatalog: (view) => this.ngZone.run(() => this.patchFormCatalog(view)),
      setWindow: (view) => this.ngZone.run(() => this.patchWindow(view)),
      setCharts: (view) => this.ngZone.run(() => this.patchCharts(view)),
      getFormSnapshot: () => this.formSnapshotHandler?.() ?? this.emptyFormSnapshot(),
      getSelectedInstruments: () => this.instrumentsHandler?.() ?? [],
      getSelectedLogicIds: () => this.logicIdsHandler?.() ?? [],
      applyInstrumentSelection: (ids) =>
        this.ngZone.run(() => this.applyInstrumentsHandler?.(ids)),
      applyLogicSelection: (ids, cleared) =>
        this.ngZone.run(() => this.applyLogicsHandler?.(ids, cleared)),
      applyFormSnapshot: (snapshot) =>
        this.ngZone.run(() => this.applyFormSnapshotHandler?.(snapshot)),
      applyDateFields: (from, till, month) =>
        this.ngZone.run(() => this.applyDateFieldsHandler?.(from, till, month)),
      prepareForConfigPersist: () =>
        this.ngZone.run(() => this.prepareForConfigPersistHandler?.() ?? this.emptyFormSnapshot()),
      registerWindowHandler: (handler) => {
        this.windowInputHandler = (which, start, end) =>
          this.ngZone.run(() => handler(which, start, end));
      },
      registerLogicAppliedHandler: (handler) => {
        this.logicAppliedHandler = () => this.ngZone.run(() => handler());
      },
      registerInstrumentAppliedHandler: (handler) => {
        this.instrumentAppliedHandler = () => this.ngZone.run(() => handler());
      },
      registerLogicChipsRefresh: (handler) => {
        this.logicChipsRefreshHandler = () => this.ngZone.run(() => handler());
      },
      refreshLogicChips: () => this.ngZone.run(() => this.logicChipsRefreshHandler?.()),
      syncFormFromDom: () => this.ngZone.run(() => this.formSyncHandler?.()),
      onBootReady: () => this.ngZone.run(() => this.bootReadyHandler?.()),
    };
  }

  registerFormSync(handler: () => void): void {
    this.formSyncHandler = handler;
  }

  registerBootReady(handler: () => void): void {
    this.bootReadyHandler = handler;
  }

  registerFormSnapshot(handler: () => FinrespFormValues): void {
    this.formSnapshotHandler = handler;
  }

  registerInstruments(handler: () => FinrespBridgeInstrument[]): void {
    this.instrumentsHandler = handler;
  }

  registerLogicIds(handler: () => string[]): void {
    this.logicIdsHandler = handler;
  }

  registerApplyInstruments(handler: (ids: string[]) => void): void {
    this.applyInstrumentsHandler = handler;
  }

  registerApplyLogics(handler: (ids: string[], cleared?: boolean) => void): void {
    this.applyLogicsHandler = handler;
  }

  registerApplyFormSnapshot(handler: (snapshot: Partial<FinrespFormValues>) => void): void {
    this.applyFormSnapshotHandler = handler;
  }

  registerApplyDateFields(
    handler: (from: string, till: string, month?: string) => void,
  ): void {
    this.applyDateFieldsHandler = handler;
  }

  registerPrepareForConfigPersist(handler: () => FinrespFormValues): void {
    this.prepareForConfigPersistHandler = handler;
  }

  registerWindowHandler(
    handler: (which: 'start' | 'end', start: number, end: number) => void,
  ): void {
    this.windowInputHandler = (which, start, end) => handler(which, start, end);
  }

  registerWindowSync(handler: (view: FinrespWindowViewModel) => void): void {
    this.windowSyncHandler = handler;
  }

  notifyWindowInput(which: 'start' | 'end', start: number, end: number): void {
    this.windowInputHandler?.(which, start, end);
  }

  notifyLogicApplied(): void {
    this.logicAppliedHandler?.();
  }

  notifyInstrumentApplied(): void {
    this.instrumentAppliedHandler?.();
  }

  registerLogicChipsRefresh(handler: () => void): void {
    this.logicChipsRefreshHandler = handler;
  }

  notifyLogicChipsRefresh(): void {
    this.logicChipsRefreshHandler?.();
  }

  private patchResults(view: Partial<FinrespResultsViewModel>): void {
    this.results$.next({ ...this.results$.value, ...view });
  }

  private patchLive(view: Partial<FinrespLiveViewModel>): void {
    this.live$.next({ ...this.live$.value, ...view });
  }

  private patchFormCatalog(view: Partial<FinrespFormCatalogViewModel>): void {
    this.formCatalog$.next({ ...this.formCatalog$.value, ...view });
  }

  private patchWindow(view: Partial<FinrespWindowViewModel>): void {
    const next = { ...this.window$.value, ...view };
    this.window$.next(next);
    this.windowSyncHandler?.(next);
  }

  private patchCharts(view: Partial<FinrespChartsViewModel>): void {
    this.charts$.next({ ...this.charts$.value, ...view });
  }

  private emptyFormSnapshot(): FinrespFormValues {
    return {
      timeframe: '60',
      month: '',
      from: '',
      till: '',
      accountMode: 'paper',
      instrumentIds: [],
      logicIds: [],
      logicSelectionCleared: false,
    };
  }
}
