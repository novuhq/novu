import { validateBridgeUrl } from '@/api/bridge';
import { useMutation, UseMutationOptions } from '@tanstack/react-query';
import { useEnvironment } from '@/context/environment/hooks';
import type { IValidateBridgeUrlResponse } from '@novu/shared';
import type { OmitEnvironmentFromParameters } from '@/utils/types';

type ValidateBridgeUrlParameters = OmitEnvironmentFromParameters<typeof validateBridgeUrl>;

export const useValidateBridgeUrl = (
  options?: UseMutationOptions<IValidateBridgeUrlResponse, unknown, ValidateBridgeUrlParameters>
) => {
  const { currentEnvironment } = useEnvironment();
  const { mutateAsync, isPending, error, data } = useMutation({
    mutationFn: ({ bridgeUrl }: { bridgeUrl: string }) =>
      validateBridgeUrl({ bridgeUrl, environment: currentEnvironment! }),
    ...options,
  });

  return {
    validateBridgeUrl: mutateAsync,
    isPending,
    error,
    data,
  };
};
