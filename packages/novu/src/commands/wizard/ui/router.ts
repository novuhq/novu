import type { WizardSession } from './wizard-session';

export enum Screen {
  Run = 'run',
  Exit = 'exit',
}

export enum Flow {
  Main = 'main',
}

export type FlowEntry = {
  screen: Screen;
  /**
   * Predicate that returns true when this screen's work is finished. The
   * router walks the flow array and renders the FIRST entry whose
   * `isComplete` returns false. When all entries are complete, the
   * router lands on the final entry's screen.
   */
  isComplete: (session: WizardSession) => boolean;
};

export type Router = {
  /** Returns the active screen for the given session snapshot. */
  resolve: (session: WizardSession) => Screen;
};

export function createRouter(flow: FlowEntry[]): Router {
  return {
    resolve: (session) => {
      for (const entry of flow) {
        if (!entry.isComplete(session)) return entry.screen;
      }
      const last = flow[flow.length - 1];

      return last ? last.screen : Screen.Exit;
    },
  };
}
