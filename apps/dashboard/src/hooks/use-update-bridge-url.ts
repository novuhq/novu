import { updateBridgeUrl } from '@/api/environments';
import { useMutation } from '@tanstack/react-query';
import { useEnvironment } from '@/context/environment/hooks';

export const useUpdateBridgeUrl = () => {
  const { currentEnvironment } = useEnvironment();

  const { mutateAsync, isPending, error, data } = useMutation({
    mutationFn: async ({ url }: { url: string; environmentId: string }) =>
      updateBridgeUrl({ environment: currentEnvironment!, url }),
  });

  return {
    updateBridgeUrl: mutateAsync,
    isPending,
    error,
    data,
  };
};
