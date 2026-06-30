import { TemplateTypeEnum } from '../../../init/templates';
import type { ResolvedConnectAuth } from '../../auth/resolve-connect-auth';
import type { AgentSummary, ConnectCommandOptions, CustomCodeConnectOutcome } from '../../types';
import type { ConnectUI } from '../../ui/ui';
import {
  defaultCustomCodeScaffoldDirName,
  resolveAgentHandlerPathIfExists,
} from '../bridge/agent-paths';
import { confirmEmptyDirScaffold } from '../bridge/confirm-empty-dir-scaffold';
import { requireConnectSecretKey } from '../bridge/require-secret-key';
import { runScaffoldWithConsole } from '../bridge/run-scaffold-with-console';
import { scaffoldBridgeProject } from '../bridge/scaffold-project';

export type CustomCodeSetupInput = {
  options: ConnectCommandOptions;
  ui: ConnectUI;
  auth: ResolvedConnectAuth;
  agent: AgentSummary;
};

export async function runCustomCodeProjectSetup(input: CustomCodeSetupInput): Promise<CustomCodeConnectOutcome> {
  const projectDir = input.options.projectDir?.trim() || process.cwd();
  const decision = await confirmEmptyDirScaffold({
    projectDir,
    options: input.options,
    ui: input.ui,
    variant: 'custom-code',
    defaultAppName: defaultCustomCodeScaffoldDirName,
    agentIdentifier: input.agent.identifier,
  });

  if (decision.action === 'existing-project') {
    return {
      projectDir: decision.projectDir,
      scaffolded: false,
      agentFilePath: resolveAgentHandlerPathIfExists(decision.projectDir, input.agent.identifier),
    };
  }

  if (decision.action === 'skipped') {
    return {
      projectDir: decision.projectDir,
      scaffolded: false,
    };
  }

  const scaffolded = await runScaffoldWithConsole({
    ui: input.ui,
    variant: 'custom-code',
    scaffold: () =>
      scaffoldBridgeProject({
        parentDir: decision.projectDir,
        appName: decision.appName,
        template: TemplateTypeEnum.APP_AGENT,
        defaultAppName: defaultCustomCodeScaffoldDirName,
        secretKey: requireConnectSecretKey(input.auth),
        apiUrl: input.options.apiUrl,
        agentIdentifier: input.agent.identifier,
        silent: false,
      }),
  });

  input.ui.bridgeScaffolded({
    variant: 'custom-code',
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
