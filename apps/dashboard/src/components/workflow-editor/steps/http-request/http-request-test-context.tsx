import { createContext, ReactNode } from 'react';
import type { TestHttpEndpointResponse } from '@/api/steps';
import { useTestHttpEndpoint } from '@/hooks/use-test-http-endpoint';

export type HttpRequestTestContextType = {
  testResult: TestHttpEndpointResponse | null;
  isTestPending: boolean;
  testError: Error | null;
  triggerTest: (params: {
    controlValues?: Record<string, unknown>;
    previewPayload?: unknown;
  }) => Promise<TestHttpEndpointResponse>;
  resetTest: () => void;
};

export const HttpRequestTestContext = createContext<HttpRequestTestContextType | null>(null);

export function HttpRequestTestProvider({ children }: { children: ReactNode }) {
  const { triggerTest: trigger, isTestPending, testError, testResult, resetTest } = useTestHttpEndpoint();

  async function triggerTest(params: {
    controlValues?: Record<string, unknown>;
    previewPayload?: unknown;
  }): Promise<TestHttpEndpointResponse> {
    return trigger(params as Parameters<typeof trigger>[0]);
  }

  return (
    <HttpRequestTestContext.Provider value={{ testResult, isTestPending, testError, triggerTest, resetTest }}>
      {children}
    </HttpRequestTestContext.Provider>
  );
}
