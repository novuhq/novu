import { JSONSchemaDto } from './json-schema-dto';

export enum ValidationStrategyEnum {
  VALIDATE_MISSING_PAYLOAD_VALUES_FOR_HYDRATION = 'VALIDATE_MISSING_PAYLOAD_VALUES_FOR_HYDRATION',
  VALIDATE_MISSING_CONTROL_VALUES = 'VALIDATE_MISSING_CONTROL_VALUES',
}

// Interface for Generate Preview Request DTO
// eslint-disable-next-line @typescript-eslint/naming-convention
interface GeneratePreviewRequestDto {
  controlValues?: Record<string, unknown>; // Optional control values
  payloadValues?: Record<string, unknown>; // Optional payload values
  variablesSchema?: JSONSchemaDto; // Optional variables schema
  validationStrategies: ValidationStrategyEnum[]; // Array of validation strategies
}

// Export the GeneratePreviewRequestDto type
export type { GeneratePreviewRequestDto };
