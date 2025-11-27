import { BaseDeleteSubscriptionArgs, DeleteSubscriptionArgs, NovuError } from '@novu/js';
import { useCallback, useRef, useState } from 'react';
import { useNovu } from './NovuProvider';

export type UseDeleteSubscriptionProps = {
  onSuccess?: () => void;
  onError?: (error: NovuError) => void;
};

type DeleteResult = Promise<{
  error?: NovuError;
}>;

export type UseDeleteSubscriptionResult = {
  isDeleting: boolean;
  error?: NovuError;
  delete: (args: DeleteSubscriptionArgs) => DeleteResult;
};

export const useDeleteSubscription = (props: UseDeleteSubscriptionProps = {}): UseDeleteSubscriptionResult => {
  const propsRef = useRef<UseDeleteSubscriptionProps>(props);
  propsRef.current = props;
  const novu = useNovu();
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<NovuError>();

  const deleteCallback = useCallback(
    async (args: DeleteSubscriptionArgs): DeleteResult => {
      const { onSuccess, onError } = propsRef.current;
      setError(undefined);
      setIsDeleting(true);

      const response = await novu.subscriptions.delete(args as BaseDeleteSubscriptionArgs);

      setIsDeleting(false);

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
    delete: deleteCallback,
    isDeleting,
    error,
  };
};
