import type { NovuError } from '@novu/js';
import { useCallback, useRef, useState } from 'react';
import { useNovu } from './NovuProvider';

export type UseDeleteChannelConnectionProps = {
  onSuccess?: () => void;
  onError?: (error: NovuError) => void;
};

export type UseDeleteChannelConnectionResult = {
  isDeleting: boolean;
  error?: NovuError;
  remove: (identifier: string) => Promise<{
    data?: undefined;
    error?: NovuError | undefined;
  }>;
};

/**
 * Delete a channel connection by identifier. Works for both subscriber-owned and
 * shared (workspace-level) connections the current subscriber can access.
 */
export const useDeleteChannelConnection = (
  props: UseDeleteChannelConnectionProps = {}
): UseDeleteChannelConnectionResult => {
  const propsRef = useRef<UseDeleteChannelConnectionProps>(props);
  propsRef.current = props;
  const novu = useNovu();
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<NovuError>();

  const remove = useCallback(
    async (identifier: string) => {
      setError(undefined);
      setIsDeleting(true);

      try {
        const response = await novu.channelConnections.delete({ identifier });

        if (response.error) {
          setError(response.error as NovuError);
          propsRef.current.onError?.(response.error as NovuError);
        } else {
          propsRef.current.onSuccess?.();
        }

        return response as { data?: undefined; error?: NovuError };
      } catch (err) {
        const novuError = err as NovuError;
        setError(novuError);
        propsRef.current.onError?.(novuError);

        return { error: novuError };
      } finally {
        setIsDeleting(false);
      }
    },
    [novu]
  );

  return {
    remove,
    isDeleting,
    error,
  };
};
