import { type FlowEntry, Screen } from './router';
import { OutroKind } from './wizard-session';

/**
 * Top-level pipeline:
 *
 *   Run → Exit
 *
 * RunScreen owns every phase end-to-end — its right pane swaps based on
 * `session.runPhase` (bootstrap → auth → skills → agent → MCP picker →
 * outro). Exit is a vestigial fallback that's only reached if RunScreen's
 * predicate ever flips to true; the driver tears the UI down via
 * `ui.shutdown()` first under normal flow, so Exit is effectively
 * unreachable today.
 */
export const MAIN_FLOW: FlowEntry[] = [
  {
    screen: Screen.Run,
    isComplete: () => false,
  },
  {
    screen: Screen.Exit,
    isComplete: () => false,
  },
];

export function isErrorOutro(kind?: OutroKind): boolean {
  return kind === OutroKind.Error;
}
