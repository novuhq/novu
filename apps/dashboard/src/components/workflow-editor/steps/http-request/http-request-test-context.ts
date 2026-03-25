import { createContext } from 'react';
import { EnvironmentVariableResponseDto } from '@/api/environment-variables';
import type { TestHttpEndpointResponse } from '@/api/steps';

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

function resolveEnvironmentVariablesByEnvironmentId(
  envVariables: EnvironmentVariableResponseDto[],
  environmentId: string | undefined
): Record<string, string> {
  return envVariables.reduce<Record<string, string>>((acc, variable) => {
    const envValue = variable.values.find((v) => v._environmentId === environmentId)?.value ?? '';
    acc[variable.key] = envValue;

    return acc;
  }, {});
}

export function mergePreviewPayloadWithEnvironmentVariables(
  previewPayload: unknown,
  envVariables: EnvironmentVariableResponseDto[],
  environmentId: string | undefined
): Record<string, unknown> {
  const resolvedEnv = resolveEnvironmentVariablesByEnvironmentId(envVariables, environmentId);
  const existingPayload = (previewPayload ?? {}) as Record<string, unknown>;

  return {
    ...existingPayload,
    env: {
      ...resolvedEnv,
      ...((existingPayload.env ?? {}) as Record<string, unknown>),
    },
  };
}
