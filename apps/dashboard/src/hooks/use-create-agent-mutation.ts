import { AgentRuntimeProviderIdEnum, CLAUDE_BUILTIN_TOOLS, type IIntegration, IntegrationKindEnum } from '@novu/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback, useState } from 'react';
import { AGENTS_LIST_QUERY_KEY, type AgentResponse, type CreateAgentBody, createAgent } from '@/api/agents';
import { resolveClaudeManagedProviderId } from '@/components/agents/connectors/claude-managed-integrations';
import { buildManagedIntegrationCredentials } from '@/components/agents/create-agent-fields';
import type { CreateAgentForm } from '@/components/agents/create-agent-fields';
import { requireEnvironment, useEnvironment } from '@/context/environment/hooks';
import { QueryKeys } from '@/utils/query-keys';
import { useCreateIntegration } from './use-create-integration';
import { useDeleteIntegration } from './use-delete-integration';

type SubmitOptions = {
  onSuccess?: (agent: AgentResponse) => void;
  onError?: (error: Error) => void;
};

/**
 * Encapsulates the "create agent" flow shared between the agents list dialog and the onboarding
 * step. For Claude Managed, it provisions the Anthropic integration first and rolls it back if the
 * subsequent agent creation fails.
 */
export function useCreateAgentMutation() {
  const { currentEnvironment } = useEnvironment();
  const queryClient = useQueryClient();
  const { mutateAsync: createIntegration } = useCreateIntegration();
  const { deleteIntegration } = useDeleteIntegration();

  const [isPending, setIsPending] = useState(false);

  const createAgentMutation = useMutation({
    mutationFn: (body: CreateAgentBody) =>
      createAgent(requireEnvironment(currentEnvironment, 'No environment selected'), body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [AGENTS_LIST_QUERY_KEY] });
    },
  });

  const submit = useCallback(
    async (
      {
        name,
        identifier,
        instructions,
        apiKey,
        externalAgentId,
        externalEnvironmentId,
        externalWorkspaceId,
        region,
        providerId: formProviderId,
        runtime,
        isExistingMode,
        integrationId: providedIntegrationId,
        integrationName,
        managedOverrides,
      }: CreateAgentForm,
      options?: SubmitOptions
    ) => {
      setIsPending(true);

      try {
        if (runtime === 'scratch') {
          const request: CreateAgentBody = {
            name,
            identifier,
            description: instructions,
          };

          try {
            const created = await createAgentMutation.mutateAsync(request);
            options?.onSuccess?.(created);

            return created;
          } catch (err) {
            const error = err instanceof Error ? err : new Error('Could not create agent.');
            options?.onError?.(error);

            return undefined;
          }
        }

        if (runtime === 'claude') {
          const environment = requireEnvironment(currentEnvironment, 'No environment selected');

          let integrationId: string;
          let managedProviderId = formProviderId ?? AgentRuntimeProviderIdEnum.Anthropic;
          // Tracks whether THIS submission provisioned the integration, so we only roll back our own.
          let createdIntegrationInThisSubmit = false;

          if (providedIntegrationId) {
            integrationId = providedIntegrationId;
            const cachedIntegrations = queryClient.getQueryData<IIntegration[]>([
              QueryKeys.fetchIntegrations,
              environment._id,
            ]);
            const selectedIntegration = cachedIntegrations?.find((integration) => integration._id === integrationId);
            managedProviderId = resolveClaudeManagedProviderId(selectedIntegration);
          } else {
            try {
              const { data: integration } = await createIntegration({
                active: true,
                kind: IntegrationKindEnum.AGENT,
                providerId: managedProviderId,
                credentials: buildManagedIntegrationCredentials(managedProviderId, {
                  apiKey,
                  region,
                  externalWorkspaceId,
                }),
                name: integrationName?.trim() || name,
              });

              integrationId = integration._id;
              createdIntegrationInThisSubmit = true;
            } catch (err) {
              const error = err instanceof Error ? err : new Error('Could not create integration.');
              options?.onError?.(error);

              return undefined;
            }
          }

          // When adopting an existing Claude agent the backend resolves the name and identifier
          // from the provider, so we deliberately omit `name`, `identifier`, and `description`
          // from the request and only send the `managedRuntime` pointer.
          const request: CreateAgentBody = isExistingMode
            ? {
                runtime: 'managed',
                managedRuntime: {
                  integrationId,
                  providerId: managedProviderId,
                  externalAgentId,
                  externalEnvironmentId,
                },
              }
            : {
                name,
                identifier,
                runtime: 'managed',
                managedRuntime: {
                  integrationId,
                  providerId: managedProviderId,
                  model: 'claude-sonnet-4-6',
                  systemPrompt: managedOverrides?.systemPrompt ?? instructions ?? undefined,
                  tools: managedOverrides?.tools ?? CLAUDE_BUILTIN_TOOLS.map((tool) => tool.type),
                  ...(managedOverrides?.mcpServers ? { mcpServers: managedOverrides.mcpServers } : {}),
                  ...(managedOverrides?.skills
                    ? {
                        skills: managedOverrides.skills.map((skill) => ({
                          type: 'anthropic' as const,
                          skillId: skill.skillId,
                        })),
                      }
                    : {}),
                },
              };

          try {
            const created = await createAgentMutation.mutateAsync(request);
            options?.onSuccess?.(created);

            return created;
          } catch (err) {
            if (createdIntegrationInThisSubmit) {
              try {
                await deleteIntegration({ id: integrationId });
              } catch {
                // Best-effort cleanup; the caller's onError already surfaces a toast.
              }
            }

            const error = err instanceof Error ? err : new Error('Could not create agent.');
            options?.onError?.(error);

            return undefined;
          }
        }

        return undefined;
      } finally {
        setIsPending(false);
      }
    },
    [createAgentMutation, createIntegration, currentEnvironment, deleteIntegration, queryClient]
  );

  return { submit, isPending };
}
