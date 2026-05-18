import { AgentRuntimeProviderIdEnum, CLAUDE_BUILTIN_TOOLS, IntegrationKindEnum } from '@novu/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback, useState } from 'react';
import { AGENTS_LIST_QUERY_KEY, type AgentResponse, type CreateAgentBody, createAgent } from '@/api/agents';
import { deleteIntegration } from '@/api/integrations';
import type { CreateAgentForm } from '@/components/agents/create-agent-fields';
import { requireEnvironment, useEnvironment } from '@/context/environment/hooks';
import { useCreateIntegration } from './use-create-integration';

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

          const created = await createAgentMutation.mutateAsync(request);
          options?.onSuccess?.(created);

          return created;
        }

        if (runtime === 'claude') {
          const environment = requireEnvironment(currentEnvironment, 'No environment selected');

          let integrationId: string;

          try {
            const { data: integration } = await createIntegration({
              active: true,
              kind: IntegrationKindEnum.AGENT,
              providerId: AgentRuntimeProviderIdEnum.Anthropic,
              // `externalWorkspaceId` is only sent when the user pasted a non-default workspace id —
              // omitting it lets the backend fall back to the `default` workspace.
              credentials: { apiKey, ...(externalWorkspaceId ? { externalWorkspaceId } : {}) },
              name,
            });

            integrationId = integration._id;
          } catch (err) {
            const error = err instanceof Error ? err : new Error('Could not create integration.');
            options?.onError?.(error);

            return undefined;
          }

          const request: CreateAgentBody = {
            name,
            identifier,
            runtime: 'managed',
            managedRuntime: isExistingMode
              ? {
                  integrationId,
                  providerId: AgentRuntimeProviderIdEnum.Anthropic,
                  externalAgentId,
                  externalEnvironmentId,
                }
              : {
                  integrationId,
                  providerId: AgentRuntimeProviderIdEnum.Anthropic,
                  model: 'claude-opus-4-5',
                  systemPrompt: instructions || undefined,
                  tools: CLAUDE_BUILTIN_TOOLS.map((tool) => tool.type),
                },
          };

          try {
            const created = await createAgentMutation.mutateAsync(request);
            options?.onSuccess?.(created);

            return created;
          } catch (err) {
            try {
              await deleteIntegration({ id: integrationId, environment });
            } catch {
              // Best-effort cleanup; the caller's onError already surfaces a toast.
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
    [createAgentMutation, createIntegration, currentEnvironment]
  );

  return { submit, isPending };
}
