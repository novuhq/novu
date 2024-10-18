import { ChannelTypeEnum, GeneratePreviewRequestDto, GeneratePreviewResponseDto } from '@novu/shared';
import { createNovuBaseClient, HttpError, NovuRestResult } from './novu-base-client';

export const EMAIL_EDITOR_JSON_KEY = 'emailEditor';

// Define the StepSchemaClient as a function that utilizes the base client
export const createStepSchemaClient = (baseUrl: string, headers: HeadersInit = {}) => {
  const baseClient = createNovuBaseClient(baseUrl, headers);

  const generatePreview = async (
    stepType: ChannelTypeEnum,
    generatePreviewDto: GeneratePreviewRequestDto
  ): Promise<NovuRestResult<GeneratePreviewResponseDto, HttpError>> => {
    return await baseClient.safePost<GeneratePreviewResponseDto>(
      `/v1/step-schemas/${stepType}/preview`,
      generatePreviewDto
    );
  };

  // Return the methods as an object
  return {
    generatePreview,
  };
};
