/** Augments `Window` for legacy FINRESP boot/live scripts. Import once (e.g. from bridge). */
export interface MlFinrespPreboot {
  setTechPre?: (text: string) => void;
  syncLivePanelFromMode?: () => void;
}

export interface MlFinrespGlobal {
  persistInstrumentSelection?: () => void;
  persistLogicSelection?: () => void;
  preboot?: MlFinrespPreboot;
  bootPhase?: string;
  lastBootError?: string | null;
  deferBrokerConnect?: boolean;
  saveConfig?: () => void;
  unstickUi?: (reason?: string) => void;
  applyMonthSelectionFromValue?: (month: string) => {
    from: string;
    till: string;
    month: string;
  };
  enforceUserDateRange?: (anchor?: 'from' | 'till') => void;
  onUserDateFieldsChanged?: () => void;
}

declare global {
  interface Window {
    __mlFinrespAssetBase?: string;
    __mlFinrespVersion?: string;
    __mlFinresp?: MlFinrespGlobal;
    __mlSyncAccountMode?: () => void;
    __mlOnAccountModeUserChange?: () => void | Promise<void>;
  }
}

export {};
