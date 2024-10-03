import { JSONSchemaDto } from './json-schema-dto';

export enum ValidationStrategyEnum {
  VALIDATE_MISSING_PAYLOAD_VALUES_FOR_HYDRATION = 'VALIDATE_MISSING_PAYLOAD_VALUES_FOR_HYDRATION',
  VALIDATE_MISSING_CONTROL_VALUES = 'VALIDATE_MISSING_CONTROL_VALUES',
}

export enum HydrationStrategyEnum {
  HYDRATE_SYSTEM_VARIABLES_WITH_DEFAULTS = 'HYDRATE_SYSTEM_VARIABLES_WITH_DEFAULTS',
  HYDRATE_PAYLOAD_VARIABLES_WITH_RANDOM_VALUES_IF_MISSING = 'HYDRATE_PAYLOAD_VARIABLES_WITH_RANDOM_VALUES_IF_MISSING',
}

// Interface for Generate Preview Request DTO
// eslint-disable-next-line @typescript-eslint/naming-convention
interface GeneratePreviewRequestDto {
  controlValues?: Record<string, unknown>; // Optional control values
  payloadValues?: Record<string, unknown>; // Optional payload values
  controlSchema: JSONSchemaDto; // Assuming this matches the structure of jsonschemaZodValidator
  variablesSchema?: JSONSchemaDto; // Optional variables schema
  workflowId: string; // Required workflow ID
  stepId?: string; // Optional step ID
  hydrationStrategies: HydrationStrategyEnum[]; // Array of hydration strategies
  validationStrategies: ValidationStrategyEnum[]; // Array of validation strategies
}

// Export the GeneratePreviewRequestDto type
export type { GeneratePreviewRequestDto };
