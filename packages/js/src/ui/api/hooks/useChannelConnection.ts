import { createEffect, createResource, createSignal, onCleanup, onMount } from 'solid-js';
import type {
  ChannelConnectionResponse,
  DeleteChannelConnectionArgs,
  GenerateConnectOAuthUrlArgs,
  GetChannelConnectionArgs,
} from '../../../channel-connections/types';
import { useNovu } from '../../context';

export type UseChannelConnectionOptions = {
  integrationIdentifier: string;
  connectionIdentifier?: string;
  subscriberId?: string;
};

export const useChannelConnection = (options: UseChannelConnectionOptions) => {
  const novuAccessor = useNovu();
  const [loading, setLoading] = createSignal(true);

  const [connection, { mutate, refetch }] = createResource(options, async ({ connectionIdentifier }) => {
    try {
      if (!connectionIdentifier) {
        return null;
      }

      const response = await novuAccessor().channelConnections.get({
        identifier: connectionIdentifier,
      });

      return response.data ?? null;
    } catch {
      return null;
    }
  });

  const generateConnectOAuthUrl = async (args: GenerateConnectOAuthUrlArgs) => {
    return novuAccessor().channelConnections.generateConnectOAuthUrl(args);
  };

  const disconnect = async (identifier: string) => {
    setLoading(true);
    const response = await novuAccessor().channelConnections.delete({ identifier });
    if (!response.error) {
      mutate(null);
    }
    setLoading(false);

    return response;
  };

  onMount(() => {
    const currentNovu = novuAccessor();

    const cleanupGetPending = currentNovu.on(
      'channel-connection.get.pending',
      ({ args }: { args: GetChannelConnectionArgs }) => {
        if (!args || args.identifier !== options.connectionIdentifier) {
          return;
        }
        setLoading(true);
      }
    );

    const cleanupGetResolved = currentNovu.on(
      'channel-connection.get.resolved',
      ({ args, data }: { args: GetChannelConnectionArgs; data?: ChannelConnectionResponse }) => {
        if (!args || args.identifier !== options.connectionIdentifier) {
          return;
        }
        mutate((data as ChannelConnectionResponse) ?? null);
        setLoading(false);
      }
    );

    const cleanupDeletePending = currentNovu.on(
      'channel-connection.delete.pending',
      ({ args }: { args: DeleteChannelConnectionArgs }) => {
        if (!args || args.identifier !== options.connectionIdentifier) {
          return;
        }
        setLoading(true);
      }
    );

    const cleanupDeleteResolved = currentNovu.on(
      'channel-connection.delete.resolved',
      ({ args }: { args: DeleteChannelConnectionArgs }) => {
        if (!args || args.identifier !== options.connectionIdentifier) {
          return;
        }
        mutate(null);
        setLoading(false);
      }
    );

    onCleanup(() => {
      cleanupGetPending();
      cleanupGetResolved();
      cleanupDeletePending();
      cleanupDeleteResolved();
    });
  });

  createEffect(() => {
    setLoading(connection.loading);
  });

  return { connection, loading, mutate, refetch, generateConnectOAuthUrl, disconnect };
};
