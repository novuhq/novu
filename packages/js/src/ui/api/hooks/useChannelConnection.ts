import { type Accessor, createEffect, createResource, createSignal, onCleanup, onMount } from 'solid-js';
import type {
  ChannelConnectionResponse,
  DeleteChannelConnectionArgs,
  GenerateConnectOAuthUrlArgs,
  GetChannelConnectionArgs,
} from '../../../channel-connections/types';
import { useNovu } from '../../context';

export const useChannelConnection = (connectionIdentifier: Accessor<string | undefined>) => {
  const novuAccessor = useNovu();
  const [loading, setLoading] = createSignal(true);

  const [connection, { mutate, refetch }] = createResource(connectionIdentifier, async (identifier) => {
    try {
      const response = await novuAccessor().channelConnections.get({
        identifier,
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
        if (!args || args.identifier !== connectionIdentifier()) {
          return;
        }
        setLoading(true);
      }
    );

    const cleanupGetResolved = currentNovu.on(
      'channel-connection.get.resolved',
      ({ args, data }: { args: GetChannelConnectionArgs; data?: ChannelConnectionResponse | null }) => {
        if (!args || args.identifier !== connectionIdentifier()) {
          return;
        }
        mutate(data ?? null);
        setLoading(false);
      }
    );

    const cleanupDeletePending = currentNovu.on(
      'channel-connection.delete.pending',
      ({ args }: { args: DeleteChannelConnectionArgs }) => {
        if (!args || args.identifier !== connectionIdentifier()) {
          return;
        }
        setLoading(true);
      }
    );

    const cleanupDeleteResolved = currentNovu.on(
      'channel-connection.delete.resolved',
      ({ args }: { args: DeleteChannelConnectionArgs }) => {
        if (!args || args.identifier !== connectionIdentifier()) {
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
