import { CreateSubscriptionArgs, NovuError, TopicSubscription } from '@novu/js';
import { useCallback, useRef, useState } from 'react';
import { useNovu } from './NovuProvider';

export type UseCreateSubscriptionProps = {
  onSuccess?: (data: TopicSubscription) => void;
  onError?: (error: NovuError) => void;
};

export type UseCreateSubscriptionResult = {
  isCreating: boolean;
  error?: NovuError;
  create: (args: CreateSubscriptionArgs) => Promise<{
    data?: TopicSubscription | undefined;
    error?: NovuError | undefined;
  }>;
};

export const useCreateSubscription = (props: UseCreateSubscriptionProps = {}): UseCreateSubscriptionResult => {
  const propsRef = useRef<UseCreateSubscriptionProps>(props);
  propsRef.current = props;
  const novu = useNovu();
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<NovuError>();

  const create = useCallback(
    async (args: CreateSubscriptionArgs) => {
      const { onSuccess, onError } = propsRef.current;
      setError(undefined);
      setIsCreating(true);

      const response = await novu.subscriptions.create(args);

      setIsCreating(false);

      if (response.error) {
        setError(response.error);
        onError?.(response.error);
      } else if (response.data) {
        onSuccess?.(response.data);
      }

      return response;
    },
    [novu]
  );

  return {
    create,
    isCreating,
    error,
  };
};
