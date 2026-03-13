import { useMutation } from '@tanstack/react-query';
import { type TestHttpEndpointResponse, testHttpEndpoint } from '@/api/steps';
import { useEnvironment } from '@/context/environment/hooks';
import type { OmitEnvironmentFromParameters } from '@/utils/types';

type TestHttpEndpointParameters = OmitEnvironmentFromParameters<typeof testHttpEndpoint>;

export const useTestHttpEndpoint = () => {
  const { currentEnvironment } = useEnvironment();
  const { mutateAsync, isPending, error, data, reset } = useMutation<
    TestHttpEndpointResponse,
    Error,
    TestHttpEndpointParameters
  >({
    mutationFn: (args: TestHttpEndpointParameters) =>
      testHttpEndpoint({ environment: currentEnvironment as NonNullable<typeof currentEnvironment>, ...args }),
  });

  return {
    triggerTest: mutateAsync,
    isTestPending: isPending,
    testError: error,
    testResult: data ?? null,
    resetTest: reset,
  };
};
