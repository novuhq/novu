import type { GeneratePreviewResponseDto, IEnvironment, StepTypeEnum, WorkflowResponseDto } from '@novu/shared';
import { post } from './api.client';

/**
 * Client for the stateless bridge endpoints backing the "Local" environment
 * mode. The bridge URL is the developer's dev tunnel and lives only in this
 * browser (see `utils/local-bridge.ts`), so it is sent with each request.
 * The API signs bridge requests with the selected environment's secret key —
 * a `BRIDGE_AUTHENTICATION_FAILED` error means the local app's
 * NOVU_SECRET_KEY belongs to a different environment.
 */

export type StatelessBridgeHealthCheck = {
  status: 'ok';
  sdkVersion: string;
  frameworkVersion: string;
  discovered: { workflows: number; steps: number };
};

export const BRIDGE_AUTHENTICATION_FAILED_CODE = 'BRIDGE_AUTHENTICATION_FAILED';

export const getStatelessBridgeStatus = async ({
  environment,
  bridgeUrl,
  signal,
}: {
  environment: IEnvironment;
  bridgeUrl: string;
  signal?: AbortSignal;
}): Promise<StatelessBridgeHealthCheck> => {
  const { data } = await post<{ data: StatelessBridgeHealthCheck }>('/bridge/stateless/status', {
    environment,
    body: { bridgeUrl },
    signal,
  });

  return data;
};

export const discoverStatelessWorkflows = async ({
  environment,
  bridgeUrl,
  signal,
}: {
  environment: IEnvironment;
  bridgeUrl: string;
  signal?: AbortSignal;
}): Promise<{ workflows: WorkflowResponseDto[] }> => {
  const { data } = await post<{ data: { workflows: WorkflowResponseDto[] } }>('/bridge/stateless/discover', {
    environment,
    body: { bridgeUrl },
    signal,
  });

  return data;
};

export const previewStatelessStep = async ({
  environment,
  bridgeUrl,
  workflowId,
  stepId,
  stepType,
  controlValues,
  previewPayload,
  signal,
}: {
  environment: IEnvironment;
  bridgeUrl: string;
  workflowId: string;
  stepId: string;
  stepType: StepTypeEnum;
  controlValues?: Record<string, unknown>;
  previewPayload?: Record<string, unknown>;
  signal?: AbortSignal;
}): Promise<GeneratePreviewResponseDto> => {
  const { data } = await post<{ data: GeneratePreviewResponseDto }>(
    `/bridge/stateless/preview/${encodeURIComponent(workflowId)}/${encodeURIComponent(stepId)}`,
    {
      environment,
      body: { bridgeUrl, stepType, controlValues, previewPayload },
      signal,
    }
  );

  return data;
};
