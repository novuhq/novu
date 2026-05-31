import {
  AgentRuntimeProviderIdEnum,
  buildManagedIntegrationCredentials,
  hasCompleteManagedCredentials,
  type ManagedCredentialFields,
} from '@novu/shared';
import type { ConnectApiClient } from '../api/client';
import {
  createAgentRuntimeIntegration,
  type IntegrationRecord,
  listIntegrations,
  verifyManagedCredentials,
} from '../api/integrations';
import { NovuApiError } from '../api/client';
import type { AgentRuntimeChoice, ConnectCommandOptions } from '../types';
import type { ConnectUI } from '../ui/ui';

const AGENT_INTEGRATION_KIND = 'agent' as const;

export type ResolvedRuntimeIntegration = {
  integrationId: string;
  providerId: AgentRuntimeProviderIdEnum;
  createdInThisFlow: boolean;
};

export function resolveRuntimeProviderId(runtime: AgentRuntimeChoice): AgentRuntimeProviderIdEnum {
  switch (runtime) {
    case 'demo':
      return AgentRuntimeProviderIdEnum.NovuAnthropic;
    case 'claude':
      return AgentRuntimeProviderIdEnum.Anthropic;
    case 'claude-aws':
      return AgentRuntimeProviderIdEnum.AnthropicAws;
  }
}

export function resolveRuntimeFromOptions(options: ConnectCommandOptions): AgentRuntimeChoice | undefined {
  return options.runtime;
}

export async function resolveAgentRuntimeIntegration(
  client: ConnectApiClient,
  ui: ConnectUI,
  options: ConnectCommandOptions,
  runtime: AgentRuntimeChoice,
  environmentId: string
): Promise<ResolvedRuntimeIntegration> {
  const integrations = await listIntegrations(client);

  if (runtime === 'demo') {
    return resolveDemoIntegration(integrations);
  }

  const providerId = resolveRuntimeProviderId(runtime);

  if (options.agentIntegrationId) {
    return resolveExplicitIntegration(integrations, options.agentIntegrationId, providerId);
  }

  const existing = listAgentIntegrationsForProvider(integrations, providerId);

  if (existing.length > 0 && !hasByokCredentialFlags(options, runtime)) {
    const pick = await ui.pickAgentIntegration({
      providerLabel: runtime === 'claude-aws' ? 'AWS Claude' : 'Anthropic',
      integrations: existing,
    });

    if (pick.kind === 'existing') {
      const integration = existing.find((item) => item._id === pick.integrationId);
      if (!integration) {
        throw new Error('Selected integration was not found. Re-run `npx novu connect`.');
      }

      return {
        integrationId: integration._id,
        providerId: integration.providerId as AgentRuntimeProviderIdEnum,
        createdInThisFlow: false,
      };
    }
  }

  const fields = await collectAndVerifyManagedCredentials(client, ui, options, runtime, providerId);

  const integrationName = runtime === 'claude-aws' ? 'Novu Connect AWS Claude' : 'Novu Connect Anthropic';

  const created = await createAgentRuntimeIntegration(client, {
    environmentId,
    providerId,
    name: integrationName,
    credentials: buildManagedIntegrationCredentials(providerId, fields),
  });

  return {
    integrationId: created._id,
    providerId,
    createdInThisFlow: true,
  };
}

function resolveDemoIntegration(integrations: IntegrationRecord[]): ResolvedRuntimeIntegration {
  const demo = integrations.find(
    (integration) =>
      integration.providerId === AgentRuntimeProviderIdEnum.NovuAnthropic &&
      integration.kind === AGENT_INTEGRATION_KIND &&
      integration.active !== false
  );

  if (!demo) {
    throw new Error(
      "This environment doesn't have a Novu demo Claude integration. " +
        'Choose Anthropic or AWS Claude with your own credentials, or set up the demo integration in the dashboard.'
    );
  }

  return {
    integrationId: demo._id,
    providerId: AgentRuntimeProviderIdEnum.NovuAnthropic,
    createdInThisFlow: false,
  };
}

function resolveExplicitIntegration(
  integrations: IntegrationRecord[],
  integrationId: string,
  expectedProviderId: AgentRuntimeProviderIdEnum
): ResolvedRuntimeIntegration {
  const integration = integrations.find((item) => item._id === integrationId);

  if (!integration || integration.kind !== AGENT_INTEGRATION_KIND) {
    throw new Error(`Integration "${integrationId}" was not found or is not an agent integration.`);
  }

  if (integration.providerId !== expectedProviderId) {
    throw new Error(
      `Integration "${integrationId}" uses provider "${integration.providerId}", expected "${expectedProviderId}".`
    );
  }

  return {
    integrationId: integration._id,
    providerId: integration.providerId as AgentRuntimeProviderIdEnum,
    createdInThisFlow: false,
  };
}

function listAgentIntegrationsForProvider(
  integrations: IntegrationRecord[],
  providerId: AgentRuntimeProviderIdEnum
): IntegrationRecord[] {
  return integrations.filter(
    (integration) =>
      integration.providerId === providerId &&
      integration.kind === AGENT_INTEGRATION_KIND &&
      integration.active !== false
  );
}

function hasByokCredentialFlags(options: ConnectCommandOptions, runtime: AgentRuntimeChoice): boolean {
  if (runtime === 'claude') {
    return Boolean(options.anthropicApiKey?.trim());
  }

  if (runtime === 'claude-aws') {
    return Boolean(
      options.awsClaudeApiKey?.trim() && options.awsClaudeRegion?.trim() && options.awsClaudeWorkspaceId?.trim()
    );
  }

  return false;
}

async function collectAndVerifyManagedCredentials(
  client: ConnectApiClient,
  ui: ConnectUI,
  options: ConnectCommandOptions,
  runtime: AgentRuntimeChoice,
  providerId: AgentRuntimeProviderIdEnum
): Promise<ManagedCredentialFields> {
  let verificationError: string | undefined;
  let forcePrompt = false;

  while (true) {
    const fields = await resolveManagedCredentialFields(ui, options, runtime, {
      forcePrompt,
      verificationError,
    });
    verificationError = undefined;

    if (!hasCompleteManagedCredentials(providerId, fields)) {
      if (options.ci) {
        throw new Error('Complete credentials are required for the selected agent runtime.');
      }

      verificationError = 'Enter all required credential fields before continuing.';
      forcePrompt = true;

      continue;
    }

    ui.verifyingCredentials();
    try {
      await verifyManagedCredentials(client, {
        providerId,
        apiKey: fields.apiKey.trim(),
        region: fields.region?.trim(),
        externalWorkspaceId: fields.externalWorkspaceId?.trim(),
      });
      ui.credentialsVerified();

      return fields;
    } catch (err) {
      if (options.ci) {
        throw err;
      }

      verificationError = describeCredentialError(err);
      clearCredentialFlags(options, runtime);
      forcePrompt = true;
    }
  }
}

async function resolveManagedCredentialFields(
  ui: ConnectUI,
  options: ConnectCommandOptions,
  runtime: AgentRuntimeChoice,
  opts?: { forcePrompt?: boolean; verificationError?: string }
): Promise<ManagedCredentialFields> {
  const forcePrompt = opts?.forcePrompt ?? false;
  const verificationError = opts?.verificationError;

  if (runtime === 'claude') {
    const apiKey =
      !forcePrompt && options.anthropicApiKey?.trim()
        ? options.anthropicApiKey.trim()
        : await ui.promptForSecretInput({
            title: 'Anthropic API key',
            placeholder: 'sk-ant-…',
            hint: 'Used to create a Claude managed agent integration in your Novu environment.',
            verificationError,
          });

    return { apiKey: apiKey.trim() };
  }

  const apiKey =
    !forcePrompt && options.awsClaudeApiKey?.trim()
      ? options.awsClaudeApiKey.trim()
      : await ui.promptForSecretInput({
          title: 'AWS Claude API key',
          placeholder: 'sk-ant-…',
          hint: 'API key for your AWS Claude Platform workspace.',
          verificationError,
        });
  const region =
    !forcePrompt && options.awsClaudeRegion?.trim()
      ? options.awsClaudeRegion.trim()
      : await ui.pickAwsClaudeRegion();
  const externalWorkspaceId =
    !forcePrompt && options.awsClaudeWorkspaceId?.trim()
      ? options.awsClaudeWorkspaceId.trim()
      : await ui.promptForSecretInput({
          title: 'AWS Claude workspace ID',
          placeholder: 'wrkspc_…',
          hint: 'Workspace ID from the AWS Claude Platform console.',
          secret: false,
          verificationError,
        });

  return {
    apiKey: apiKey.trim(),
    region: region.trim(),
    externalWorkspaceId: externalWorkspaceId.trim(),
  };
}

function clearCredentialFlags(options: ConnectCommandOptions, runtime: AgentRuntimeChoice): void {
  if (runtime === 'claude') {
    options.anthropicApiKey = undefined;

    return;
  }

  if (runtime === 'claude-aws') {
    options.awsClaudeApiKey = undefined;
    options.awsClaudeRegion = undefined;
    options.awsClaudeWorkspaceId = undefined;
  }
}

function describeCredentialError(err: unknown): string {
  if (err instanceof NovuApiError) {
    return `${err.message} (${err.status} ${err.url})`;
  }
  if (err instanceof Error) return err.message;

  return String(err);
}
