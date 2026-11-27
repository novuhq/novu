import { type Accessor, createEffect, createResource, createSignal } from 'solid-js';
import type { ChannelEndpointResponse, LinkChannelEndpointArgs } from '../../../channel-connections/types';
import { useNovu } from '../../context';

const TELEGRAM_PROVIDER_ID = 'telegram';

export type UseTelegramConnectionOptions = {
  integrationIdentifier: string;
  subscriberId?: string;
};

export const useTelegramConnection = (options: Accessor<UseTelegramConnectionOptions | undefined>) => {
  const novuAccessor = useNovu();
  const [loading, setLoading] = createSignal(true);

  const [endpoint, { mutate, refetch }] = createResource(
    options,
    async ({ integrationIdentifier, subscriberId }): Promise<ChannelEndpointResponse | null> => {
      try {
        const response = await novuAccessor().channelEndpoints.list({
          integrationIdentifier,
          providerId: TELEGRAM_PROVIDER_ID,
          subscriberId,
          limit: 1,
        });

        return response.data?.[0] ?? null;
      } catch {
        return null;
      }
    }
  );

  const link = async (args: LinkChannelEndpointArgs) => {
    return novuAccessor().channelEndpoints.link(args);
  };

  const disconnect = async (identifier: string) => {
    setLoading(true);
    const response = await novuAccessor().channelEndpoints.delete({ identifier });
    if (!response.error) {
      mutate(null);
    }
    setLoading(false);

    return response;
  };

  createEffect(() => {
    setLoading(endpoint.loading);
  });

  return { endpoint, loading, mutate, refetch, link, disconnect };
};
