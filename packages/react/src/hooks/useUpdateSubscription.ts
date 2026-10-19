import { BaseUpdateSubscriptionArgs, NovuError, TopicSubscription, UpdateSubscriptionArgs } from '@novu/js';
import { useCallback, useRef, useState } from 'react';
import { useNovu } from './NovuProvider';

export type UseUpdateSubscriptionProps = {
  onSuccess?: (data: TopicSubscription) => void;
  onError?: (error: NovuError) => void;
};

type UpdateResult = Promise<{
  data?: TopicSubscription | undefined;
  error?: NovuError;
}>;

export type UseUpdateSubscriptionResult = {
  isUpdating: boolean;
  error?: NovuError;
  update: (args: UpdateSubscriptionArgs) => UpdateResult;
};

export const useUpdateSubscription = (props: UseUpdateSubscriptionProps = {}): UseUpdateSubscriptionResult => {
  const propsRef = useRef<UseUpdateSubscriptionProps>(props);
  propsRef.current = props;
  const novu = useNovu();
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<NovuError>();

  const update = useCallback(
    async (args: UpdateSubscriptionArgs): UpdateResult => {
      const { onSuccess, onError } = propsRef.current;
      setError(undefined);
      setIsUpdating(true);

      const response = await novu.subscriptions.update(args as BaseUpdateSubscriptionArgs);

      setIsUpdating(false);

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
    update,
    isUpdating,
    error,
  };
};
