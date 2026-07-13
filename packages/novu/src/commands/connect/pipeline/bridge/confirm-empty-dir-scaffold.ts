import type { ConnectCommandOptions } from '../../types';
import type { ConnectUI } from '../../ui/ui';
import { detectBridgeProject } from './detect-project';
import type { BridgeScaffoldVariant } from './types';

export type ConfirmEmptyDirScaffoldInput = {
  projectDir: string;
  options: ConnectCommandOptions;
  ui: ConnectUI;
  variant: BridgeScaffoldVariant;
  defaultAppName: (agentIdentifier: string) => string;
  agentIdentifier: string;
};

export type EmptyDirScaffoldDecision =
  | { action: 'existing-project'; projectDir: string }
  | { action: 'skipped'; projectDir: string }
  | { action: 'confirmed'; projectDir: string; appName: string };

export async function confirmEmptyDirScaffold(input: ConfirmEmptyDirScaffoldInput): Promise<EmptyDirScaffoldDecision> {
  const detected = detectBridgeProject(input.projectDir);

  if (detected.kind === 'project') {
    return { action: 'existing-project', projectDir: detected.projectDir };
  }

  if (input.options.noScaffold) {
    return { action: 'skipped', projectDir: detected.projectDir };
  }

  const appName = input.options.scaffoldDir?.trim() || input.defaultAppName(input.agentIdentifier);
  const confirmed = await input.ui.confirmScaffold({
    projectDir: detected.projectDir,
    appName,
    variant: input.variant,
  });

  if (!confirmed) {
    return { action: 'skipped', projectDir: detected.projectDir };
  }

  return { action: 'confirmed', projectDir: detected.projectDir, appName };
}
