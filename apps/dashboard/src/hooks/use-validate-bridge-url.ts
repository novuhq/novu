import { validateBridgeUrl } from '@/api/bridge';
import { useMutation } from '@tanstack/react-query';

export const useValidateBridgeUrl = () => {
  const { mutateAsync, isPending, error, data } = useMutation({
    mutationFn: async (url: string) => validateBridgeUrl({ bridgeUrl: url }),
  });

  return {
    validateBridgeUrl: mutateAsync,
    isPending,
    error,
    data,
  };
};
