import { ReactNode } from 'react';
import { useEnvironment } from '@/context/environment/hooks';
import { useFetchEnvironmentVariables } from '@/hooks/use-fetch-environment-variables';
import { useTestHttpEndpoint } from '@/hooks/use-test-http-endpoint';
import { HttpRequestTestContext, mergePreviewPayloadWithEnvironmentVariables } from './http-request-test-context';

export function HttpRequestTestProvider({ children }: { children: ReactNode }) {
  const { triggerTest: trigger, isTestPending, testError, testResult, resetTest } = useTestHttpEndpoint();
  const { currentEnvironment } = useEnvironment();
  const { data: envVariables = [] } = useFetchEnvironmentVariables({ enabled: !!currentEnvironment?._id });

  async function triggerTest(params: { controlValues?: Record<string, unknown>; previewPayload?: unknown }) {
    const enrichedPayload = mergePreviewPayloadWithEnvironmentVariables(
      params.previewPayload,
      envVariables,
      currentEnvironment?._id
    );

    return trigger({ ...params, previewPayload: enrichedPayload } as Parameters<typeof trigger>[0]);
  }

  return (
    <HttpRequestTestContext.Provider value={{ testResult, isTestPending, testError, triggerTest, resetTest }}>
      {children}
    </HttpRequestTestContext.Provider>
  );
}
