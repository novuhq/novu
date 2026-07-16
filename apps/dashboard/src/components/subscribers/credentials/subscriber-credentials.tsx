import type { ChannelEndpointType } from '@novu/shared';
import { ChannelTypeEnum, FeatureFlagsKeysEnum } from '@novu/shared';
import { formatDistanceToNow } from 'date-fns';
import { useMemo, useState } from 'react';
import { ExternalToast } from 'sonner';
import type { ChannelEndpointPayload } from '@/api/channel-endpoints';
import type { SubscriberCredentialsProviderId } from '@/api/subscriber-credentials';
import { ConfirmationModal } from '@/components/confirmation-modal';
import { InlineToast } from '@/components/primitives/inline-toast';
import { Separator } from '@/components/primitives/separator';
import { Skeleton } from '@/components/primitives/skeleton';
import { showErrorToast, showSuccessToast } from '@/components/primitives/sonner-helpers';
import { useEnvironment } from '@/context/environment/hooks';
import { useCreateChannelEndpoint } from '@/hooks/use-create-channel-endpoint';
import { useDeleteChannelEndpoint } from '@/hooks/use-delete-channel-endpoint';
import { useDeleteSubscriberCredentials } from '@/hooks/use-delete-subscriber-credentials';
import { useFeatureFlag } from '@/hooks/use-feature-flag';
import { useFetchChannelConnections } from '@/hooks/use-fetch-channel-connections';
import { useFetchChannelEndpoints } from '@/hooks/use-fetch-channel-endpoints';
import { useFetchIntegrations } from '@/hooks/use-fetch-integrations';
import { useFetchSubscriber } from '@/hooks/use-fetch-subscriber';
import { useUpdateChannelEndpoint } from '@/hooks/use-update-channel-endpoint';
import { useUpdateSubscriberCredentials } from '@/hooks/use-update-subscriber-credentials';
import {
  buildCredentialGroups,
  type ChatCredentialItem,
  type ChatIntegrationRow,
  type EditableCredentialRow,
  type OverviewField,
} from './build-credential-groups';
import type { CredentialActions } from './credential-row';
import { CredentialSection } from './credential-section';

const CREDENTIALS_DOCS_URL = 'https://docs.novu.co/platform/concepts/subscribers#updating-subscriber-credentials';

const toastOptions: ExternalToast = {
  position: 'bottom-right',
  classNames: { toast: 'mb-4 right-0 pointer-events-none' },
};

type TokenDeleteState = { row: EditableCredentialRow; index: number };

type SubscriberCredentialsProps = {
  subscriberId: string;
  readOnly?: boolean;
  onEditInOverview: (field: OverviewField) => void;
};

function CredentialsSkeleton() {
  return (
    <div className="flex flex-col gap-6 p-5">
      {[0, 1, 2].map((section) => (
        <div key={section} className="flex flex-col gap-3">
          <Skeleton className="h-3 w-16" />
          <div className="flex items-center gap-2.5">
            <Skeleton className="size-5 rounded-full" />
            <Skeleton className="h-3 w-24" />
          </div>
          <Skeleton className="h-9 w-full rounded-lg" />
        </div>
      ))}
    </div>
  );
}

export function SubscriberCredentials({
  subscriberId,
  readOnly = false,
  onEditInOverview,
}: SubscriberCredentialsProps) {
  const { currentEnvironment } = useEnvironment();
  const isToolChannelEnabled = useFeatureFlag(FeatureFlagsKeysEnum.IS_TOOL_CHANNEL_ENABLED);
  const { data: subscriber, isPending: isSubscriberPending } = useFetchSubscriber({ subscriberId });
  const { integrations, isPending: isIntegrationsPending } = useFetchIntegrations();
  // Fetch all subscriber endpoints (chat + tool); groups filter by channel client-side.
  const { channelEndpoints, isPending: isEndpointsPending } = useFetchChannelEndpoints({
    subscriberId,
  });
  const { channelConnections, isPending: isConnectionsPending } = useFetchChannelConnections({
    channel: ChannelTypeEnum.CHAT,
  });

  const [chatDeleteItem, setChatDeleteItem] = useState<ChatCredentialItem | null>(null);
  const [tokenDelete, setTokenDelete] = useState<TokenDeleteState | null>(null);

  const { updateChannelEndpoint } = useUpdateChannelEndpoint();
  const { createChannelEndpoint } = useCreateChannelEndpoint();
  const { deleteSubscriberCredentials, isPending: isCredentialsDeletePending } = useDeleteSubscriberCredentials();
  const { deleteChannelEndpoint, isPending: isEndpointDeletePending } = useDeleteChannelEndpoint();
  const { updateSubscriberCredentials, isPending: isCredentialsUpdatePending } = useUpdateSubscriberCredentials();

  const environmentIntegrations = useMemo(() => {
    if (!integrations || !currentEnvironment?._id) {
      return [];
    }

    return integrations.filter((integration) => integration._environmentId === currentEnvironment._id);
  }, [integrations, currentEnvironment?._id]);

  const groups = useMemo(() => {
    if (!subscriber) {
      return [];
    }

    return buildCredentialGroups({
      subscriber,
      integrations: environmentIntegrations,
      channelEndpoints,
      channelConnections,
      includeToolChannel: isToolChannelEnabled,
    });
  }, [subscriber, environmentIntegrations, channelEndpoints, channelConnections, isToolChannelEnabled]);

  if (isSubscriberPending || isIntegrationsPending || isEndpointsPending || isConnectionsPending) {
    return <CredentialsSkeleton />;
  }

  const saveChatItem = async (item: ChatCredentialItem, payload: ChannelEndpointPayload): Promise<boolean> => {
    try {
      if (item.source === 'endpoint') {
        await updateChannelEndpoint({ subscriberId, identifier: item.endpointIdentifier, endpoint: payload });
      } else {
        // Editing a legacy webhook updates the stored credential in place
        const webhook = payload as { url?: string; channel?: string };

        await updateSubscriberCredentials({
          subscriberId,
          providerId: item.providerId as SubscriberCredentialsProviderId,
          integrationIdentifier: item.integrationIdentifier,
          credentials: { webhookUrl: webhook.url, ...(webhook.channel ? { channel: webhook.channel } : {}) },
          mode: 'replace',
        });
      }

      showSuccessToast('Credential updated', undefined, toastOptions);

      return true;
    } catch {
      showErrorToast('Failed to update credential', undefined, toastOptions);

      return false;
    }
  };

  const addChatEndpoint = async (
    row: ChatIntegrationRow,
    type: ChannelEndpointType,
    payload: ChannelEndpointPayload
  ): Promise<boolean> => {
    const requiresConnection = row.addableTypes.find((option) => option.type === type)?.requiresConnection ?? false;

    try {
      await createChannelEndpoint({
        subscriberId,
        integrationIdentifier: row.integrationIdentifier,
        type,
        endpoint: payload,
        connectionIdentifier: requiresConnection ? row.connectionIdentifier : undefined,
      });

      showSuccessToast('Credential added', undefined, toastOptions);

      return true;
    } catch {
      showErrorToast('Failed to add credential', undefined, toastOptions);

      return false;
    }
  };

  const saveToken = async (
    row: EditableCredentialRow,
    value: string,
    mode: 'add' | 'edit',
    index?: number
  ): Promise<boolean> => {
    const providerId = row.providerId as SubscriberCredentialsProviderId;

    try {
      if (mode === 'edit' && index !== undefined) {
        const deviceTokens = row.values.map((existing, valueIndex) => (valueIndex === index ? value : existing));

        await updateSubscriberCredentials({
          subscriberId,
          providerId,
          integrationIdentifier: row.integrationIdentifier,
          credentials: { deviceTokens },
          mode: 'replace',
        });
      } else {
        await updateSubscriberCredentials({
          subscriberId,
          providerId,
          integrationIdentifier: row.integrationIdentifier,
          credentials: { deviceTokens: [value] },
          mode: 'append',
        });
      }

      showSuccessToast(mode === 'edit' ? 'Device token updated' : 'Device token added', undefined, toastOptions);

      return true;
    } catch {
      showErrorToast('Failed to save device token', undefined, toastOptions);

      return false;
    }
  };

  const actions: CredentialActions = {
    onSaveItem: saveChatItem,
    onDeleteItem: setChatDeleteItem,
    onAddItem: addChatEndpoint,
    onSaveToken: saveToken,
    onDeleteToken: (row, index) => setTokenDelete({ row, index }),
    onEditInOverview,
  };

  const confirmDeleteChatItem = async () => {
    if (!chatDeleteItem) {
      return;
    }

    try {
      if (chatDeleteItem.source === 'endpoint') {
        await deleteChannelEndpoint({ subscriberId, identifier: chatDeleteItem.endpointIdentifier });
      } else {
        await deleteSubscriberCredentials({
          subscriberId,
          providerId: chatDeleteItem.providerId as SubscriberCredentialsProviderId,
        });
      }

      showSuccessToast('Credential deleted', undefined, toastOptions);
      setChatDeleteItem(null);
    } catch {
      showErrorToast('Failed to delete credential', undefined, toastOptions);
    }
  };

  const confirmDeleteToken = async () => {
    if (!tokenDelete) {
      return;
    }

    const { row, index } = tokenDelete;
    const deviceTokens = row.values.filter((_, valueIndex) => valueIndex !== index);
    const providerId = row.providerId as SubscriberCredentialsProviderId;

    try {
      if (deviceTokens.length === 0) {
        await deleteSubscriberCredentials({ subscriberId, providerId });
      } else {
        await updateSubscriberCredentials({
          subscriberId,
          providerId,
          integrationIdentifier: row.integrationIdentifier,
          credentials: { deviceTokens },
          mode: 'replace',
        });
      }

      showSuccessToast('Device token deleted', undefined, toastOptions);
      setTokenDelete(null);
    } catch {
      showErrorToast('Failed to delete device token', undefined, toastOptions);
    }
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-1 flex-col gap-6 overflow-y-auto">
        {groups.length > 0 ? (
          <div className="flex flex-col gap-2">
            {groups.map((group) => (
              <CredentialSection
                key={group.channel}
                group={group}
                subscriberId={subscriberId}
                readOnly={readOnly}
                actions={actions}
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center gap-1 py-10 text-center">
            <span className="text-label-sm text-text-strong">No credentials</span>
            <span className="text-label-xs text-text-soft">
              {isToolChannelEnabled
                ? 'Connect a push, chat, email, SMS or tool integration to manage subscriber credentials.'
                : 'Connect a push, chat, email or SMS integration to manage subscriber credentials.'}
            </span>
          </div>
        )}
      </div>

      <Separator />
      <div className="flex flex-col gap-2.5 px-5 py-3">
        {subscriber?.updatedAt && (
          <span className="text-2xs text-text-soft">
            Last updated {formatDistanceToNow(new Date(subscriber.updatedAt), { addSuffix: true })}
          </span>
        )}
        <InlineToast
          variant="tip"
          title="Tip:"
          description="Credentials can be updated via API"
          ctaLabel="View docs"
          onCtaClick={() => window.open(CREDENTIALS_DOCS_URL, '_blank', 'noopener,noreferrer')}
        />
      </div>

      <ConfirmationModal
        open={!!chatDeleteItem}
        onOpenChange={(open) => {
          if (!open) {
            setChatDeleteItem(null);
          }
        }}
        onConfirm={confirmDeleteChatItem}
        title="Delete credential"
        description={
          <span>
            Are you sure you want to delete this <span className="font-bold">{chatDeleteItem?.displayName}</span>{' '}
            credential for this subscriber? This action cannot be undone.
          </span>
        }
        confirmButtonText="Delete credential"
        confirmButtonVariant="error"
        isLoading={isCredentialsDeletePending || isEndpointDeletePending}
      />

      <ConfirmationModal
        open={!!tokenDelete}
        onOpenChange={(open) => {
          if (!open) {
            setTokenDelete(null);
          }
        }}
        onConfirm={confirmDeleteToken}
        title="Delete device token"
        description={
          <span>
            Are you sure you want to delete this <span className="font-bold">{tokenDelete?.row.displayName}</span>{' '}
            device token for this subscriber? This action cannot be undone.
          </span>
        }
        confirmButtonText="Delete token"
        confirmButtonVariant="error"
        isLoading={isCredentialsDeletePending || isCredentialsUpdatePending}
      />
    </div>
  );
}
