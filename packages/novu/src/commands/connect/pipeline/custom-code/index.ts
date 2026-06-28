import type { ResolvedConnectAuth } from '../../auth/resolve-connect-auth';
import type { AgentSummary, ConnectCommandOptions, CustomCodeConnectOutcome } from '../../types';
import type { ConnectUI } from '../../ui/ui';
import {
  defaultCustomCodeScaffoldDirName,
  detectCustomCodeProject,
  resolveCustomCodeAgentFilePath,
} from './detect-project';
import { scaffoldCustomCodeProject } from './scaffold';

export type CustomCodeSetupInput = {
  options: ConnectCommandOptions;
  ui: ConnectUI;
  auth: ResolvedConnectAuth;
  agent: AgentSummary;
};

function requireSecretKey(auth: ResolvedConnectAuth): string {
  const secretKey = auth.secretKey?.trim();
  if (!secretKey) {
    throw new Error('Missing Novu secret key — authenticate with dashboard OAuth or pass --secret-key.');
  }

  return secretKey;
}

export async function runCustomCodeProjectSetup(input: CustomCodeSetupInput): Promise<CustomCodeConnectOutcome> {
  const projectDir = input.options.projectDir?.trim() || process.cwd();
  const detected = detectCustomCodeProject(projectDir);

  if (detected.kind === 'project') {
    return {
      projectDir: detected.projectDir,
      scaffolded: false,
      agentFilePath: resolveCustomCodeAgentFilePath(detected.projectDir, input.agent.identifier),
    };
  }

  if (input.options.noScaffold) {
    return {
      projectDir: detected.projectDir,
      scaffolded: false,
    };
  }

  const appName = input.options.scaffoldDir?.trim() || defaultCustomCodeScaffoldDirName(input.agent.identifier);
  const confirmed = await input.ui.confirmScaffold({
    projectDir: detected.projectDir,
    appName,
    variant: 'custom-code',
  });

  if (!confirmed) {
    return {
      projectDir: detected.projectDir,
      scaffolded: false,
    };
  }

  input.ui.scaffoldingCustomCode();

  const scaffolded = await scaffoldCustomCodeProject({
    parentDir: detected.projectDir,
    appName,
    secretKey: requireSecretKey(input.auth),
    apiUrl: input.options.apiUrl,
    agentIdentifier: input.agent.identifier,
    silent: input.ui.interactive,
  });

  input.ui.customCodeScaffolded({
    projectDir: scaffolded.root,
    agentFilePath: scaffolded.agentFilePath,
    skippedInstall: scaffolded.skippedInstall,
  });

  return {
    projectDir: scaffolded.root,
    scaffolded: true,
    skippedInstall: scaffolded.skippedInstall,
    agentFilePath: scaffolded.agentFilePath,
  };
}
