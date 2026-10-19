import type { ChannelEndpointResponse, CreateChannelEndpointArgs, NovuError } from '@novu/js';
import { useCallback, useRef, useState } from 'react';
import { useNovu } from './NovuProvider';

export type UseCreateChannelEndpointProps = {
  onSuccess?: (data: ChannelEndpointResponse) => void;
  onError?: (error: NovuError) => void;
};

export type UseCreateChannelEndpointResult = {
  isCreating: boolean;
  error?: NovuError;
  create: (args: CreateChannelEndpointArgs) => Promise<{
    data?: ChannelEndpointResponse | undefined;
    error?: NovuError | undefined;
  }>;
};

export const useCreateChannelEndpoint = (props: UseCreateChannelEndpointProps = {}): UseCreateChannelEndpointResult => {
  const propsRef = useRef<UseCreateChannelEndpointProps>(props);
  propsRef.current = props;
  const novu = useNovu();
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<NovuError>();

  const create = useCallback(
    async (args: CreateChannelEndpointArgs) => {
      const { onSuccess, onError } = propsRef.current;
      setError(undefined);
      setIsCreating(true);

      const response = await novu.channelEndpoints.create(args);

      setIsCreating(false);

      if (response.error) {
        setError(response.error as NovuError);
        onError?.(response.error as NovuError);
      } else if (response.data) {
        onSuccess?.(response.data as ChannelEndpointResponse);
      }

      return response as { data?: ChannelEndpointResponse; error?: NovuError };
    },
    [novu]
  );

  return {
    create,
    isCreating,
    error,
  };
};
