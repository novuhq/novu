import type { AgentConnectMode, CustomCodeConnectOutcome } from '../../types';
import { isCustomCodeScaffoldMode } from '../../types';

export function resolveCustomCodeOutcomeMessage(
  connectMode: AgentConnectMode | undefined,
  outcome: CustomCodeConnectOutcome | undefined
): string | null {
  if (!connectMode || !isCustomCodeScaffoldMode(connectMode) || !outcome) {
    return null;
  }

  if (outcome.scaffolded) {
    if (outcome.skippedInstall) {
      return `Agent app scaffolded at ${outcome.projectDir} — run npm install, then npm run dev.`;
    }

    return `Agent app ready at ${outcome.projectDir}. Edit your handler and run npm run dev.`;
  }

  return `Wire your agent code in ${outcome.projectDir} and point it at Novu.`;
}
