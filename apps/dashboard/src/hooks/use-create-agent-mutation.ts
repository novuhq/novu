import { AgentRuntimeProviderIdEnum, CLAUDE_BUILTIN_TOOLS, IntegrationKindEnum } from '@novu/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback, useState } from 'react';
import { AGENTS_LIST_QUERY_KEY, type AgentResponse, type CreateAgentBody, createAgent } from '@/api/agents';
import type { CreateAgentForm } from '@/components/agents/create-agent-fields';
import { requireEnvironment, useEnvironment } from '@/context/environment/hooks';
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
          requireEnvironment(currentEnvironment, 'No environment selected');

          let integrationId: string;
          // Tracks whether THIS submission provisioned the integration, so we only roll back our own.
          let createdIntegrationInThisSubmit = false;

          if (providedIntegrationId) {
            integrationId = providedIntegrationId;
          } else {
            try {
              const { data: integration } = await createIntegration({
                active: true,
                kind: IntegrationKindEnum.AGENT,
                providerId: AgentRuntimeProviderIdEnum.Anthropic,
                // `externalWorkspaceId` is only sent when the user pasted a non-default workspace id —
                // omitting it lets the backend fall back to the `default` workspace.
                credentials: { apiKey, ...(externalWorkspaceId ? { externalWorkspaceId } : {}) },
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
                  providerId: AgentRuntimeProviderIdEnum.Anthropic,
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
                  providerId: AgentRuntimeProviderIdEnum.Anthropic,
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
    [createAgentMutation, createIntegration, currentEnvironment, deleteIntegration]
  );

  return { submit, isPending };
}
