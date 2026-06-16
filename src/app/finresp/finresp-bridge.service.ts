import { Injectable, NgZone } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import {
  EMPTY_FINRESP_LIVE,
  EMPTY_FINRESP_RESULTS,
  FinrespLiveViewModel,
  FinrespResultsViewModel,
} from './models/finresp-ui.models';

export interface FinrespBridgeApi {
  setResults: (view: Partial<FinrespResultsViewModel>) => void;
  setLive: (view: Partial<FinrespLiveViewModel>) => void;
  setStatus: (text: string) => void;
  syncFormFromDom: () => void;
  onBootReady: () => void;
}

declare global {
  interface Window {
    __mlFinrespBridge?: FinrespBridgeApi;
  }
}

@Injectable()
export class FinrespBridgeService {
  readonly results$ = new BehaviorSubject<FinrespResultsViewModel>({ ...EMPTY_FINRESP_RESULTS });
  readonly live$ = new BehaviorSubject<FinrespLiveViewModel>({ ...EMPTY_FINRESP_LIVE });

  private formSyncHandler: (() => void) | null = null;
  private bootReadyHandler: (() => void) | null = null;

  constructor(private readonly ngZone: NgZone) {}

  installOnWindow(): void {
    window.__mlFinrespBridge = {
      setResults: (view) => this.ngZone.run(() => this.patchResults(view)),
      setLive: (view) => this.ngZone.run(() => this.patchLive(view)),
      setStatus: (text) => this.ngZone.run(() => this.patchResults({ statusText: text })),
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

  private patchResults(view: Partial<FinrespResultsViewModel>): void {
    this.results$.next({ ...this.results$.value, ...view });
  }

  private patchLive(view: Partial<FinrespLiveViewModel>): void {
    this.live$.next({ ...this.live$.value, ...view });
  }
}
