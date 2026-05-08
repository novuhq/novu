import type { WizardStore } from './store';
import type { WizardUI } from './wizard-ui';

/**
 * `WizardUI` implementation backed by a {@link WizardStore}. Every method is a
 * thin pass-through to a store setter — React subscribers re-render
 * automatically because they listen to the underlying nanostores atoms.
 *
 * The imperative driver (`pipeline/runner.ts`) talks to this interface; it
 * never imports the store directly. That keeps the driver agnostic to whether
 * the host is the Ink TUI or the plain-text {@link LoggingUI}.
 */
export function createInkUI(store: WizardStore, opts: { onShutdown: () => Promise<number> }): WizardUI {
  return {
    setProject: store.setProject,
    setGoal: store.setGoal,
    setAuthStatus: store.setAuthStatus,
    setAuthDashboardUrl: store.setAuthDashboardUrl,
    setAuth: store.setAuth,
    setAuthFailed: store.setAuthFailed,
    setRunPhase: store.setRunPhase,
    setPhase: store.setPhase,
    setSkills: store.setSkills,
    setMcpCandidates: store.setMcpCandidates,
    addMcpInstall: store.addMcpInstall,
    finishMcpInstalls: store.finishMcpInstalls,
    setReport: store.setReport,
    setOutroData: store.setOutroData,

    pushStatus: store.pushStatus,
    pushTrail: store.pushTrail,
    pushLiveTail: store.pushLiveTail,
    syncTodos: store.syncTodos,

    awaitBootstrapGate: () => store.getGate('bootstrap').promise,
    awaitMcpGate: () => store.getGate('mcp').promise,
    awaitOutroGate: () => store.getGate('outro').promise,

    shutdown: opts.onShutdown,
  };
}
