import { updateBridgeUrl } from '@/api/environments';
import { useMutation } from '@tanstack/react-query';

export const useUpdateBridgeUrl = () => {
  const { mutateAsync, isLoading, error, data } = useMutation({
    mutationFn: async ({ url, environmentId }: { url: string; environmentId: string }) =>
      updateBridgeUrl({ url }, environmentId),
  });

  return {
    updateBridgeUrl: mutateAsync,
    isLoading,
    error,
    data,
  };
};
