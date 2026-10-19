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

export type EmptyDirScaffoldTarget =
  | { status: 'existing-project'; projectDir: string }
  | { status: 'skipped'; projectDir: string }
  | { status: 'needs-confirm'; projectDir: string; appName: string };

export function resolveEmptyDirScaffoldTarget(input: ConfirmEmptyDirScaffoldInput): EmptyDirScaffoldTarget {
  const detected = detectBridgeProject(input.projectDir);

  if (detected.kind === 'project') {
    return { status: 'existing-project', projectDir: detected.projectDir };
  }

  if (input.options.noScaffold) {
    return { status: 'skipped', projectDir: detected.projectDir };
  }

  const appName = input.options.scaffoldDir?.trim() || input.defaultAppName(input.agentIdentifier);

  return { status: 'needs-confirm', projectDir: detected.projectDir, appName };
}

export async function confirmEmptyDirScaffold(input: ConfirmEmptyDirScaffoldInput): Promise<EmptyDirScaffoldDecision> {
  const target = resolveEmptyDirScaffoldTarget(input);

  if (target.status === 'existing-project') {
    return { action: 'existing-project', projectDir: target.projectDir };
  }

  if (target.status === 'skipped') {
    return { action: 'skipped', projectDir: target.projectDir };
  }

  const confirmed = await input.ui.confirmScaffold({
    projectDir: target.projectDir,
    appName: target.appName,
    variant: input.variant,
  });

  if (!confirmed) {
    return { action: 'skipped', projectDir: target.projectDir };
  }

  return { action: 'confirmed', projectDir: target.projectDir, appName: target.appName };
}
