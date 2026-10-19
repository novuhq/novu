import { PreviewPayload } from './preview-step-response.dto';

export enum ValidationStrategyEnum {
  VALIDATE_MISSING_PAYLOAD_VALUES_FOR_HYDRATION = 'VALIDATE_MISSING_PAYLOAD_VALUES_FOR_HYDRATION',
  VALIDATE_MISSING_CONTROL_VALUES = 'VALIDATE_MISSING_CONTROL_VALUES',
}

// Interface for Generate Preview Request DTO
interface GeneratePreviewRequestDto {
  controlValues?: Record<string, unknown>; // Optional control values
  previewPayload?: PreviewPayload; // Optional payload values
}

// Export the GeneratePreviewRequestDto type
export type { GeneratePreviewRequestDto };
