import type {
  GeneratePreviewRequestDto,
  GeneratePreviewResponseDto,
  IEnvironment,
  StepResponseDto,
} from '@novu/shared';
import { getV2, postV2 } from './api.client';

export const getStep = async ({
  environment,
  stepSlug,
  workflowSlug,
}: {
  environment: IEnvironment;
  stepSlug: string;
  workflowSlug: string;
}): Promise<StepResponseDto> => {
  const { data } = await getV2<{ data: StepResponseDto }>(`/workflows/${workflowSlug}/steps/${stepSlug}`, {
    environment,
  });

  return data;
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
