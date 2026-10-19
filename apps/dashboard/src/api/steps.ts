import type { GeneratePreviewRequestDto, GeneratePreviewResponseDto, IEnvironment } from '@novu/shared';
import { postV2 } from './api.client';

export type TestHttpEndpointResponse = {
  statusCode: number;
  body: unknown;
  headers: Record<string, string>;
  durationMs: number;
  resolvedRequest: {
    url: string;
    method: string;
    headers?: Record<string, string>;
    body?: Record<string, unknown>;
  };
};

export const previewStep = async ({
  environment,
  previewData,
  stepSlug,
  workflowSlug,
  signal,
}: {
  environment: IEnvironment;
  previewData?: GeneratePreviewRequestDto;
  stepSlug: string;
  workflowSlug: string;
  signal?: AbortSignal;
}): Promise<GeneratePreviewResponseDto> => {
  const { data } = await postV2<{ data: GeneratePreviewResponseDto }>(
    `/workflows/${workflowSlug}/step/${stepSlug}/preview`,
    { environment, body: previewData, signal }
  );

  return data;
};

export const testHttpEndpoint = async ({
  environment,
  controlValues,
  previewPayload,
  signal,
}: {
  environment: IEnvironment;
  controlValues?: Record<string, unknown>;
  previewPayload?: GeneratePreviewRequestDto['previewPayload'];
  signal?: AbortSignal;
}): Promise<TestHttpEndpointResponse> => {
  const { data } = await postV2<{ data: TestHttpEndpointResponse }>(`/workflows/steps/test-http-request`, {
    environment,
    body: { controlValues, previewPayload },
    signal,
  });

  return data;
};
