import { ChannelTypeEnum, EmailProviderIdEnum, type IIntegration, PROVIDER_ID_TO_CHANNEL_MAP } from '@novu/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback, useRef, useState } from 'react';
import {
  type AgentIntegrationLink,
  addAgentIntegration,
  getAgentDetailQueryKey,
  getAgentIntegrationsQueryKey,
  removeAgentIntegration,
} from '@/api/agents';
import { NovuApiError } from '@/api/api.client';
import { createIntegration, deleteIntegration } from '@/api/integrations';
import { showErrorToast, showSuccessToast } from '@/components/primitives/sonner-helpers';
import { requireEnvironment, useEnvironment } from '@/context/environment/hooks';
import { useCurrentApp } from '@/hooks/use-current-app';
import { useTelemetry } from '@/hooks/use-telemetry';
import { APP_IDS } from '@/utils/apps';
import { QueryKeys } from '@/utils/query-keys';
import { TelemetryEvent } from '@/utils/telemetry';

type LinkProviderItem = {
  providerId: string;
  displayName: string;
  /** When set, link this existing integration instead of creating a new one. */
  integration?: IIntegration;
  /** Override the name used when creating a new integration (defaults to providerId-based fallback). */
  newIntegrationName?: string;
};

type UseLinkAgentIntegrationOptions = {
  agentIdentifier: string;
  /** Already-linked integration ids — selecting one of these skips the link API call. */
  linkedIntegrationIds?: Set<string>;
  /**
   * Existing agent-integration links. Required when `replaceExisting` is enabled so the hook
   * can remove the previous links after the new link succeeds.
   */
  existingLinks?: AgentIntegrationLink[];
  /**
   * When true, after a successful link the hook removes every other agent-integration link
   * from `existingLinks`. Integrations provisioned by this hook during the session are also
   * deleted; pre-existing integrations are only unlinked. Used for single-select pickers like
   * the onboarding provider cards.
   */
  replaceExisting?: boolean;
  /** Called after a successful link with the resolved integration. */
  onLinked?: (providerId: string, integration: IIntegration) => void;
};

type UseLinkAgentIntegrationResult = {
  /** Identifier of the in-flight item, or null. Callers use this to render per-row spinners. */
  pendingItemKey: string | null;
  /** Returns true while any link operation is running. */
  isBusy: boolean;
  /** Invokes the link flow. `itemKey` is reflected back via `pendingItemKey`. */
  linkProvider: (item: LinkProviderItem, itemKey: string) => Promise<IIntegration | undefined>;
};

function isAlreadyLinkedToAgentConflict(err: unknown): boolean {
  if (!(err instanceof NovuApiError) || err.status !== 409) {
    return false;
  }

  return err.message.includes('already linked');
}

export function useLinkAgentIntegration({
  agentIdentifier,
  linkedIntegrationIds,
  existingLinks,
  replaceExisting,
  onLinked,
}: UseLinkAgentIntegrationOptions): UseLinkAgentIntegrationResult {
  const { currentEnvironment } = useEnvironment();
  const queryClient = useQueryClient();
  const track = useTelemetry();
  const currentApp = useCurrentApp();
  const isConnectApp = currentApp === APP_IDS.CONNECT;

  const [pendingItemKey, setPendingItemKey] = useState<string | null>(null);
  /** Integrations created by this hook instance — safe to delete when switching providers. */
  const createdIntegrationIdsRef = useRef(new Set<string>());

  const addAgentIntegrationMutation = useMutation({
    mutationFn: async (body: { integrationIdentifier?: string; providerId?: string }) => {
      const environment = requireEnvironment(currentEnvironment, 'No environment selected');

      return addAgentIntegration(environment, agentIdentifier, body);
    },
  });

  const createIntegrationMutation = useMutation({
    mutationFn: async (vars: { providerId: string; name: string }) => {
      const environment = requireEnvironment(currentEnvironment, 'No environment selected');
      const channel = PROVIDER_ID_TO_CHANNEL_MAP[vars.providerId];

      if (channel == null) {
        throw new Error(`Unknown channel for provider ${vars.providerId}`);
      }

      const response = await createIntegration(
        {
          providerId: vars.providerId,
          channel,
          credentials: {},
          configurations: {},
          name: vars.name,
          active: true,
          _environmentId: environment._id,
        },
        environment
      );

      return response.data;
    },
  });

  const linkProvider = useCallback(
    async (item: LinkProviderItem, itemKey: string): Promise<IIntegration | undefined> => {
      const environment = currentEnvironment;

      if (!environment?._id) {
        showErrorToast('No environment selected.', 'Cannot link provider');

        return undefined;
      }

      const environmentId = environment._id;
      setPendingItemKey(itemKey);

      const invalidateAgentLinkQueries = async () => {
        await queryClient.invalidateQueries({ queryKey: [QueryKeys.fetchIntegrations, environmentId] });
        await queryClient.invalidateQueries({
          queryKey: getAgentIntegrationsQueryKey(environmentId, agentIdentifier),
        });
        await queryClient.invalidateQueries({
          queryKey: getAgentDetailQueryKey(environmentId, agentIdentifier),
        });
      };

      const trackLink = (
        providerId: string,
        integrationIdentifier: string,
        mode: 'novu_email' | 'existing_integration' | 'new_integration_then_link'
      ) => {
        track(
          isConnectApp
            ? TelemetryEvent.CONNECT_AGENT_INTEGRATION_LINKED_FROM_DASHBOARD
            : TelemetryEvent.AGENT_INTEGRATION_LINKED_FROM_DASHBOARD,
          {
            agentIdentifier,
            providerId,
            integrationIdentifier,
            mode,
          }
        );
      };

      /**
       * Removes every existing link that is not the freshly linked one. Runs only when
       * `replaceExisting` is enabled. Only integrations provisioned by this hook are deleted;
       * pre-existing integrations are unlinked but left intact. Failures are logged but never
       * surfaced because the primary link succeeded.
       */
      const removePreviousLinks = async (keepIntegrationId: string | undefined) => {
        if (!replaceExisting || !existingLinks?.length) return;

        const toRemove = existingLinks.filter((link) => link.integration._id !== keepIntegrationId);

        await Promise.all(
          toRemove.map(async (link) => {
            try {
              await removeAgentIntegration(environment, agentIdentifier, link._id);
            } catch (removeErr) {
              console.warn('Failed to unlink previous agent integration', { linkId: link._id, removeErr });

              return;
            }

            if (!createdIntegrationIdsRef.current.has(link.integration._id)) {
              return;
            }

            try {
              await deleteIntegration({ id: link.integration._id, environment });
              createdIntegrationIdsRef.current.delete(link.integration._id);
            } catch (deleteErr) {
              console.warn('Failed to delete previous integration', {
                integrationId: link.integration._id,
                deleteErr,
              });
            }
          })
        );
      };

      try {
        if (item.providerId === EmailProviderIdEnum.NovuAgent) {
          const link = await addAgentIntegrationMutation.mutateAsync({ providerId: item.providerId });
          const integration = link.integration as unknown as IIntegration;

          createdIntegrationIdsRef.current.add(integration._id);
          showSuccessToast('Integration linked', `${link.integration.name ?? 'Novu Email'} was added to this agent.`);
          trackLink(item.providerId, link.integration.identifier, 'novu_email');
          await removePreviousLinks(integration._id);
          onLinked?.(item.providerId, integration);
          await invalidateAgentLinkQueries();

          return integration;
        }

        if (item.integration) {
          const alreadyLinked = linkedIntegrationIds?.has(item.integration._id);

          if (!alreadyLinked) {
            try {
              await addAgentIntegrationMutation.mutateAsync({ integrationIdentifier: item.integration.identifier });
              showSuccessToast('Integration linked', `${item.integration.name} was added to this agent.`);
              trackLink(item.providerId, item.integration.identifier, 'existing_integration');
            } catch (linkErr) {
              if (!isAlreadyLinkedToAgentConflict(linkErr)) {
                throw linkErr;
              }

              if (!linkedIntegrationIds?.has(item.integration._id)) {
                throw linkErr;
              }
            }
          }

          await removePreviousLinks(item.integration._id);
          onLinked?.(item.providerId, item.integration);
          await invalidateAgentLinkQueries();

          return item.integration;
        }

        const channel = PROVIDER_ID_TO_CHANNEL_MAP[item.providerId];
        const fallbackName = channel === ChannelTypeEnum.CHAT ? agentIdentifier : item.displayName;
        const uniqueName = item.newIntegrationName ?? fallbackName;

        const created = await createIntegrationMutation.mutateAsync({
          providerId: item.providerId,
          name: uniqueName,
        });

        createdIntegrationIdsRef.current.add(created._id);
        try {
          await addAgentIntegrationMutation.mutateAsync({ integrationIdentifier: created.identifier });
        } catch (linkErr) {
          await deleteIntegration({ id: created._id, environment }).catch(() => undefined);
          throw linkErr;
        }
        showSuccessToast('Integration linked', `${created.name} was added to this agent.`);
        trackLink(item.providerId, created.identifier, 'new_integration_then_link');
        await removePreviousLinks(created._id);
        onLinked?.(item.providerId, created);
        await invalidateAgentLinkQueries();

        return created;
      } catch (err) {
        if (
          item.integration &&
          isAlreadyLinkedToAgentConflict(err) &&
          linkedIntegrationIds?.has(item.integration._id)
        ) {
          await removePreviousLinks(item.integration._id);
          onLinked?.(item.providerId, item.integration);
          await invalidateAgentLinkQueries();

          return item.integration;
        }

        const message = err instanceof NovuApiError ? err.message : 'Could not link integration.';
        showErrorToast(message, 'Link failed');

        return undefined;
      } finally {
        setPendingItemKey(null);
      }
    },
    [
      addAgentIntegrationMutation,
      agentIdentifier,
      createIntegrationMutation,
      currentEnvironment,
      existingLinks,
      isConnectApp,
      linkedIntegrationIds,
      onLinked,
      queryClient,
      replaceExisting,
      track,
    ]
  );

  return {
    pendingItemKey,
    isBusy: pendingItemKey !== null,
    linkProvider,
  };
}
