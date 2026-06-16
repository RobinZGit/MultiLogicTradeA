import { Injectable } from '@angular/core';
import { FinrespBridgeService } from './finresp-bridge.service';
import { FinrespLiveViewModel } from './models/finresp-ui.models';

/** Тонкая обёртка над bridge для live-панели (данные приходят из live.js). */
@Injectable()
export class FinrespLiveService {
  readonly live$ = this.bridge.live$;

  constructor(private readonly bridge: FinrespBridgeService) {}

  patch(view: Partial<FinrespLiveViewModel>): void {
    const api = window.__mlFinrespBridge;
    api?.setLive(view);
  }
}
