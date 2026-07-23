import type { ChannelEndpointResponse, ListChannelEndpointsArgs, NovuError } from '@novu/js';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useNovu } from './NovuProvider';

export type UseChannelEndpointsProps = ListChannelEndpointsArgs & {
  onSuccess?: (data: ChannelEndpointResponse[]) => void;
  onError?: (error: NovuError) => void;
};

export type UseChannelEndpointsResult = {
  endpoints: ChannelEndpointResponse[];
  error?: NovuError;
  isLoading: boolean;
  isFetching: boolean;
  refetch: () => Promise<void>;
};

/**
 * List channel endpoints for the current subscriber. Use this to discover a linked
 * user endpoint (e.g. a `slack_user` endpoint) for a given connection identifier.
 *
 * @example
 * const { endpoints } = useChannelEndpoints({ integrationIdentifier: 'my-chat', connectionIdentifier });
 * const isLinked = endpoints.some((endpoint) => endpoint.type === 'slack_user');
 */
export const useChannelEndpoints = (props: UseChannelEndpointsProps = {}): UseChannelEndpointsResult => {
  const novu = useNovu();
  const propsRef = useRef<UseChannelEndpointsProps>(props);
  propsRef.current = props;

  const [endpoints, setEndpoints] = useState<ChannelEndpointResponse[]>([]);
  const [error, setError] = useState<NovuError>();
  const [isLoading, setIsLoading] = useState(true);
  const [isFetching, setIsFetching] = useState(false);

  const fetchEndpoints = useCallback(
    async (options?: { refetch: boolean }) => {
      const { onSuccess, onError, ...listArgs } = propsRef.current;

      if (options?.refetch) {
        setError(undefined);
        setIsLoading(true);
      }

      setIsFetching(true);

      try {
        const response = await novu.channelEndpoints.list(listArgs);

        if (response.error) {
          setError(response.error as NovuError);
          onError?.(response.error as NovuError);
        } else if (response.data !== undefined) {
          setEndpoints(response.data);
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
    const cleanups = (
      [
        'channel-endpoint.create.resolved',
        'channel-endpoint.delete.resolved',
        'channel-endpoint.link.resolved',
      ] as const
    ).map((event) =>
      novu.on(event, () => {
        void fetchEndpoints({ refetch: true });
      })
    );

    void fetchEndpoints({ refetch: true });

    return () => {
      for (const cleanup of cleanups) {
        cleanup();
      }
    };
  }, [novu, fetchEndpoints]);

  const refetch = useCallback(() => fetchEndpoints({ refetch: true }), [fetchEndpoints]);

  return {
    endpoints,
    error,
    isLoading,
    isFetching,
    refetch,
  };
};
