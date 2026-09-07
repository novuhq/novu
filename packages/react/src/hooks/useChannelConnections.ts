import type { ChannelConnectionResponse, ListChannelConnectionsArgs, NovuError } from '@novu/js';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useNovu } from './NovuProvider';

export type UseChannelConnectionsProps = ListChannelConnectionsArgs & {
  onSuccess?: (data: ChannelConnectionResponse[]) => void;
  onError?: (error: NovuError) => void;
};

export type UseChannelConnectionsResult = {
  connections: ChannelConnectionResponse[];
  error?: NovuError;
  isLoading: boolean;
  isFetching: boolean;
  refetch: () => Promise<void>;
};

/**
 * List channel connections for the current subscriber. Use this to discover an active
 * connection identifier after a chat OAuth flow so it can be passed to `LinkUser`.
 *
 * @example
 * const { connections } = useChannelConnections({ integrationIdentifier: 'my-chat-integration' });
 * const connectionIdentifier = connections[0]?.identifier;
 */
export const useChannelConnections = (props: UseChannelConnectionsProps = {}): UseChannelConnectionsResult => {
  const novu = useNovu();
  const propsRef = useRef<UseChannelConnectionsProps>(props);
  propsRef.current = props;

  const [connections, setConnections] = useState<ChannelConnectionResponse[]>([]);
  const [error, setError] = useState<NovuError>();
  const [isLoading, setIsLoading] = useState(true);
  const [isFetching, setIsFetching] = useState(false);

  const fetchConnections = useCallback(
    async (options?: { refetch: boolean }) => {
      const { onSuccess, onError, ...listArgs } = propsRef.current;

      if (options?.refetch) {
        setError(undefined);
        setIsLoading(true);
      }

      setIsFetching(true);

      try {
        const response = await novu.channelConnections.list(listArgs);

        if (response.error) {
          setError(response.error as NovuError);
          onError?.(response.error as NovuError);
        } else if (response.data !== undefined) {
          setConnections(response.data);
          onSuccess?.(response.data);
        }
      } catch (err) {
        setError(err as NovuError);
        onError?.(err as NovuError);
      } finally {
        setIsLoading(false);
        setIsFetching(false);
      }
    },
    [novu]
  );

  useEffect(() => {
    const cleanupDeleteResolved = novu.on('channel-connection.delete.resolved', () => {
      void fetchConnections({ refetch: true });
    });

    void fetchConnections({ refetch: true });

    return () => {
      cleanupDeleteResolved();
    };
  }, [novu, fetchConnections]);

  const refetch = useCallback(() => fetchConnections({ refetch: true }), [fetchConnections]);

  return {
    connections,
    error,
    isLoading,
    isFetching,
    refetch,
  };
};
