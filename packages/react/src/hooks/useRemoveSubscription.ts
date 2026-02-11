import { BaseDeleteSubscriptionArgs, NovuError, DeleteSubscriptionArgs as RemoveSubscriptionArgs } from '@novu/js';
import { useCallback, useRef, useState } from 'react';
import { useNovu } from './NovuProvider';

export type UseRemoveSubscriptionProps = {
  onSuccess?: () => void;
  onError?: (error: NovuError) => void;
};

type RemoveResult = Promise<{
  error?: NovuError;
}>;

export type UseRemoveSubscriptionResult = {
  isRemoving: boolean;
  error?: NovuError;
  remove: (args: RemoveSubscriptionArgs) => RemoveResult;
};

export const useRemoveSubscription = (props: UseRemoveSubscriptionProps = {}): UseRemoveSubscriptionResult => {
  const propsRef = useRef<UseRemoveSubscriptionProps>(props);
  propsRef.current = props;
  const novu = useNovu();
  const [isRemoving, setIsRemoving] = useState(false);
  const [error, setError] = useState<NovuError>();

  const removeCallback = useCallback(
    async (args: RemoveSubscriptionArgs): RemoveResult => {
      const { onSuccess, onError } = propsRef.current;
      setError(undefined);
      setIsRemoving(true);

      const response = await novu.subscriptions.delete(args as BaseDeleteSubscriptionArgs);

      setIsRemoving(false);

      if (response.error) {
        setError(response.error);
        onError?.(response.error);
      } else if (response.data) {
        onSuccess?.();
      }

      return response;
    },
    [novu]
  );

  return {
    remove: removeCallback,
    isRemoving,
    error,
  };
};
