import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { RiCheckLine, RiExternalLinkLine } from 'react-icons/ri';
import type { AgentResponse } from '@/api/agents';
import {
  getAgentDetailQueryKey,
  getClaudeAgentCredentials,
  getClaudeAgentCredentialsQueryKey,
  testClaudeManagedAgent,
  updateAgent,
  updateClaudeAgentCredentials,
} from '@/api/agents';
import { Button } from '@/components/primitives/button';
import { Input } from '@/components/primitives/input';
import { showErrorToast, showSuccessToast } from '@/components/primitives/sonner-helpers';
import { requireEnvironment, useEnvironment } from '@/context/environment/hooks';
import { SetupStep } from './setup-guide-primitives';
import { deriveStepStatus } from './setup-guide-step-utils';

const ANTHROPIC_CONSOLE_URL = 'https://console.anthropic.com/';

function buildAnthropicConsoleAgentUrl(agentId: string): string {
  return `${ANTHROPIC_CONSOLE_URL}console/agents/${encodeURIComponent(agentId)}`;
}

type ClaudeManagedSetupSectionProps = {
  agent: AgentResponse;
  stepOffset: number;
};

export function ClaudeManagedSetupSection({ agent, stepOffset }: ClaudeManagedSetupSectionProps) {
  const { currentEnvironment } = useEnvironment();

  const credentialsQuery = useQuery({
    queryKey: getClaudeAgentCredentialsQueryKey(currentEnvironment?._id),
    queryFn: () => getClaudeAgentCredentials(requireEnvironment(currentEnvironment, 'No environment selected')),
    enabled: Boolean(currentEnvironment),
  });

  const hasCredentials = credentialsQuery.data?.configured ?? false;
  const hasManagedRuntime = Boolean(agent.managedRuntime?.agentId && agent.managedRuntime?.environmentId);
  const isProvisioned = hasCredentials && hasManagedRuntime;

  const testConnectionMutation = useMutation({
    mutationFn: () =>
      testClaudeManagedAgent(requireEnvironment(currentEnvironment, 'No environment selected'), agent.identifier),
    onSuccess: () => {
      showSuccessToast('Claude Managed Agent connection verified.', 'Connection successful');
    },
    onError: () => {
      showErrorToast('Could not verify the Claude Managed Agent connection.', 'Connection failed');
    },
  });

  if (isProvisioned) {
    return (
      <SetupStep
        index={stepOffset}
        status={deriveStepStatus(stepOffset, stepOffset + 1)}
        sectionLabel="2/2 CLAUDE MANAGED AGENT"
        title="Provisioned in Anthropic"
        description={
          <span>
            Novu created this agent for you in your Anthropic workspace. Manage the model, prompt, and tools from the
            Anthropic Console.
          </span>
        }
        rightContent={
          <div className="flex w-full max-w-md flex-col gap-2">
            <div className="border-stroke-soft bg-bg-white flex flex-col gap-1 rounded-md border p-3 text-label-xs">
              <div className="flex items-center justify-between gap-2">
                <span className="text-text-soft">Agent ID</span>
                <span className="font-mono text-text-strong">{agent.managedRuntime?.agentId}</span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-text-soft">Environment ID</span>
                <span className="font-mono text-text-strong">{agent.managedRuntime?.environmentId}</span>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="secondary"
                mode="outline"
                size="xs"
                leadingIcon={RiCheckLine}
                isLoading={testConnectionMutation.isPending}
                onClick={() => testConnectionMutation.mutate()}
              >
                Test connection
              </Button>
              <a
                href={
                  agent.managedRuntime?.agentId
                    ? buildAnthropicConsoleAgentUrl(agent.managedRuntime.agentId)
                    : ANTHROPIC_CONSOLE_URL
                }
                target="_blank"
                rel="noreferrer noopener"
                className="text-text-soft hover:text-text-sub inline-flex items-center gap-1 text-label-xs underline-offset-2 hover:underline"
              >
                Open in Anthropic Console
                <RiExternalLinkLine className="size-3.5 shrink-0" aria-hidden />
              </a>
            </div>
          </div>
        }
      />
    );
  }

  return <ClaudeManagedManualSection agent={agent} stepOffset={stepOffset} hasCredentials={hasCredentials} />;
}

type ClaudeManagedManualSectionProps = {
  agent: AgentResponse;
  stepOffset: number;
  hasCredentials: boolean;
};

function ClaudeManagedManualSection({ agent, stepOffset, hasCredentials }: ClaudeManagedManualSectionProps) {
  const queryClient = useQueryClient();
  const { currentEnvironment } = useEnvironment();

  const [apiKey, setApiKey] = useState('');
  const [agentId, setAgentId] = useState(agent.managedRuntime?.agentId ?? '');
  const [environmentId, setEnvironmentId] = useState(agent.managedRuntime?.environmentId ?? '');
  const [vaultIds, setVaultIds] = useState(agent.managedRuntime?.vaultIds?.join(', ') ?? '');

  const updateCredentialsMutation = useMutation({
    mutationFn: () =>
      updateClaudeAgentCredentials(requireEnvironment(currentEnvironment, 'No environment selected'), apiKey.trim()),
    onSuccess: async () => {
      setApiKey('');
      await queryClient.invalidateQueries({ queryKey: getClaudeAgentCredentialsQueryKey(currentEnvironment?._id) });
      showSuccessToast('Anthropic API key saved.', 'Claude Managed Agents');
    },
    onError: () => {
      showErrorToast('Could not save Anthropic API key.', 'Claude Managed Agents');
    },
  });

  const updateRuntimeMutation = useMutation({
    mutationFn: () =>
      updateAgent(requireEnvironment(currentEnvironment, 'No environment selected'), agent.identifier, {
        runtime: 'claude_managed',
        managedRuntime: {
          provider: 'anthropic',
          agentId: agentId.trim(),
          environmentId: environmentId.trim(),
          vaultIds: vaultIds
            .split(',')
            .map((id) => id.trim())
            .filter(Boolean),
        },
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: getAgentDetailQueryKey(currentEnvironment?._id, agent.identifier),
      });
      showSuccessToast('Claude Managed Agent configuration saved.', 'Agent updated');
    },
    onError: () => {
      showErrorToast('Could not save Claude Managed Agent configuration.', 'Update failed');
    },
  });

  const testConnectionMutation = useMutation({
    mutationFn: () =>
      testClaudeManagedAgent(requireEnvironment(currentEnvironment, 'No environment selected'), agent.identifier),
    onSuccess: () => {
      showSuccessToast('Claude Managed Agent connection verified.', 'Connection successful');
    },
    onError: () => {
      showErrorToast('Could not verify the Claude Managed Agent connection.', 'Connection failed');
    },
  });

  const hasManagedRuntime = Boolean(agentId.trim() && environmentId.trim());
  const firstIncompleteStep =
    hasCredentials && hasManagedRuntime ? stepOffset + 3 : hasCredentials ? stepOffset + 1 : stepOffset;

  return (
    <>
      <SetupStep
        index={stepOffset}
        status={deriveStepStatus(stepOffset, firstIncompleteStep)}
        sectionLabel="2/2 CONNECT CLAUDE MANAGED AGENT"
        title="Add your Anthropic API key"
        description={
          <span>
            Novu stores this as an encrypted environment secret and uses it only to create sessions and stream responses
            for this environment.
          </span>
        }
        rightContent={
          <div className="flex w-full max-w-md flex-col gap-2">
            <div className="text-text-soft text-label-xs">
              Status:{' '}
              <span className={hasCredentials ? 'text-success-base font-medium' : 'text-warning-base font-medium'}>
                {hasCredentials ? 'configured' : 'not configured'}
              </span>
            </div>
            <div className="flex gap-2">
              <Input
                size="2xs"
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="sk-ant-..."
              />
              <Button
                type="button"
                variant="secondary"
                mode="outline"
                size="xs"
                disabled={!apiKey.trim()}
                isLoading={updateCredentialsMutation.isPending}
                onClick={() => updateCredentialsMutation.mutate()}
              >
                Save key
              </Button>
            </div>
            <a
              href={ANTHROPIC_CONSOLE_URL}
              target="_blank"
              rel="noreferrer noopener"
              className="text-text-soft hover:text-text-sub inline-flex items-center gap-1 text-label-xs underline-offset-2 hover:underline"
            >
              Open Anthropic Console
              <RiExternalLinkLine className="size-3.5 shrink-0" aria-hidden />
            </a>
          </div>
        }
      />

      <SetupStep
        index={stepOffset + 1}
        status={deriveStepStatus(stepOffset + 1, firstIncompleteStep)}
        title="Reference your managed agent"
        description="Paste the agent and environment IDs from Anthropic. Vault IDs are optional and comma-separated."
        rightContent={
          <div className="grid w-full max-w-md grid-cols-1 gap-2">
            <Input size="2xs" value={agentId} onChange={(e) => setAgentId(e.target.value)} placeholder="agent_011..." />
            <Input
              size="2xs"
              value={environmentId}
              onChange={(e) => setEnvironmentId(e.target.value)}
              placeholder="env_013..."
            />
            <Input
              size="2xs"
              value={vaultIds}
              onChange={(e) => setVaultIds(e.target.value)}
              placeholder="vlt_... (optional)"
            />
            <Button
              type="button"
              variant="secondary"
              mode="outline"
              size="xs"
              disabled={!agentId.trim() || !environmentId.trim()}
              isLoading={updateRuntimeMutation.isPending}
              onClick={() => updateRuntimeMutation.mutate()}
            >
              Save configuration
            </Button>
          </div>
        }
      />

      <SetupStep
        index={stepOffset + 2}
        status={deriveStepStatus(stepOffset + 2, firstIncompleteStep)}
        title="Test the connection"
        description="Verify that Novu can access the Anthropic agent and environment with the configured API key."
        rightContent={
          <Button
            type="button"
            variant="secondary"
            mode="outline"
            size="xs"
            leadingIcon={RiCheckLine}
            disabled={!hasCredentials || !hasManagedRuntime}
            isLoading={testConnectionMutation.isPending}
            onClick={() => testConnectionMutation.mutate()}
          >
            Test connection
          </Button>
        }
      />
    </>
  );
}
