import type { IValidateBridgeUrlResponse } from '@novu/shared';
import { UseMutationOptions, useMutation } from '@tanstack/react-query';
import { validateBridgeUrl } from '@/api/bridge';
import { useEnvironment } from '@/context/environment/hooks';
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
