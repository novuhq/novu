import type { ParsedCommand, Suite } from '../core/types.js';
import { agentOnboardingSuite } from './agent-onboarding/index.js';

export const suites: Record<string, Suite<ParsedCommand>> = {
  [agentOnboardingSuite.id]: agentOnboardingSuite as unknown as Suite<ParsedCommand>,
};

export const DEFAULT_SUITE = agentOnboardingSuite.id;

export function getSuite(id: string): Suite<ParsedCommand> | undefined {
  return suites[id];
}

export function listSuiteIds(): string[] {
  return Object.keys(suites);
}
