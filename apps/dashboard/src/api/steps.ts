import type {
  StepResponseDto,
  GeneratePreviewRequestDto,
  GeneratePreviewResponseDto,
  IEnvironment,
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
}: {
  environment: IEnvironment;
  previewData?: GeneratePreviewRequestDto;
  stepSlug: string;
  workflowSlug: string;
}): Promise<GeneratePreviewResponseDto> => {
  const { data } = await postV2<{ data: GeneratePreviewResponseDto }>(
    `/workflows/${workflowSlug}/step/${stepSlug}/preview`,
    { environment, body: previewData }
  );

  return data;
};
