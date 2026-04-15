import type { ChannelEndpointResponse, NovuError } from '@novu/js';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useNovu } from './NovuProvider';

export type UseChannelEndpointProps = {
  identifier: string;
  onSuccess?: (data: ChannelEndpointResponse | null) => void;
  onError?: (error: NovuError) => void;
};

export type UseChannelEndpointResult = {
  endpoint?: ChannelEndpointResponse | null;
  error?: NovuError;
  isLoading: boolean;
  isFetching: boolean;
  refetch: () => Promise<void>;
};

/**
 * Get a channel endpoint by identifier.
 */
export const useChannelEndpoint = (props: UseChannelEndpointProps): UseChannelEndpointResult => {
  const novu = useNovu();
  const propsRef = useRef<UseChannelEndpointProps>(props);
  propsRef.current = props;

  const [endpoint, setEndpoint] = useState<ChannelEndpointResponse | null>();
  const [error, setError] = useState<NovuError>();
  const [isLoading, setIsLoading] = useState(true);
  const [isFetching, setIsFetching] = useState(false);

  const fetchEndpoint = useCallback(
    async (options?: { refetch: boolean }) => {
      const { identifier, onSuccess, onError } = propsRef.current;
      if (options?.refetch) {
        setError(undefined);
        setIsLoading(true);
      }

      setIsFetching(true);

      const response = await novu.channelEndpoints.get({ identifier });

      if (response.error) {
        setError(response.error as NovuError);
        onError?.(response.error as NovuError);
      } else if (response.data !== undefined) {
        onSuccess?.(response.data);
        setEndpoint(response.data);
      }
      setIsLoading(false);
      setIsFetching(false);
    },
    [novu]
  );

  // biome-ignore lint/correctness/useExhaustiveDependencies: props.identifier is needed to re-run the effect and initial fetch when the identifier changes
  useEffect(() => {
    const cleanupGetPending = novu.on('channel-endpoint.get.pending', () => {
      setIsFetching(true);
    });

    const cleanupGetResolved = novu.on('channel-endpoint.get.resolved', ({ data, error: resolvedError }) => {
      const { onSuccess, onError } = propsRef.current;
      if (resolvedError) {
        setError(resolvedError as NovuError);
        onError?.(resolvedError as NovuError);
      } else {
        setEndpoint((data as ChannelEndpointResponse) ?? null);
        onSuccess?.((data as ChannelEndpointResponse) ?? null);
      }
      setIsFetching(false);
    });

    const cleanupCreateResolved = novu.on('channel-endpoint.create.resolved', ({ data }) => {
      if (data) {
        setEndpoint(data as ChannelEndpointResponse);
        propsRef.current.onSuccess?.(data as ChannelEndpointResponse);
      }
      setIsFetching(false);
    });

    const cleanupDeleteResolved = novu.on('channel-endpoint.delete.resolved', ({ args }) => {
      if (!args || args.identifier !== propsRef.current.identifier) {
        return;
      }
      setEndpoint(null);
      propsRef.current.onSuccess?.(null);
      setIsFetching(false);
    });

    void fetchEndpoint({ refetch: true });

    return () => {
      cleanupGetPending();
      cleanupGetResolved();
      cleanupCreateResolved();
      cleanupDeleteResolved();
    };
  }, [novu, fetchEndpoint, props.identifier]);

  const refetch = useCallback(() => fetchEndpoint({ refetch: true }), [fetchEndpoint]);

  return {
    endpoint,
    error,
    isLoading,
    isFetching,
    refetch,
  };
};
