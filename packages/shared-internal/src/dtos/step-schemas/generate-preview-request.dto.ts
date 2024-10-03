import { z } from 'zod';

import { jsonschemaZodValidator } from './jsonschema-zod-validator';

export const TRANSIENT_PREVIEW_PREFIX = 'transient-preview-';

/**
 * @enum {string}
 * @description Enum representing different validation strategies for processing requests.
 * If an empty list is submitted, no validation will occur.
 * If multiple strategies are submitted, they will be executed in the order they are listed.
 */
export enum ValidationStrategyEnum {
  VALIDATE_MISSING_PAYLOAD_VALUES_FOR_HYDRATION = 'VALIDATE_MISSING_PAYLOAD_VALUES_FOR_HYDRATION',
  VALIDATE_MISSING_CONTROL_VALUES = 'VALIDATE_MISSING_CONTROL_VALUES',
}

/**
 * @enum {string}
 * @description Enum representing different hydration strategies for variables.
 * If an empty list is submitted, no hydration will occur.
 * If multiple strategies are submitted, they will be executed in the order they are listed.
 * If a strategy is not listed, it will not be executed.
 */
export enum HydrationStrategyEnum {
  HYDRATE_SYSTEM_VARIABLES_WITH_DEFAULTS = 'HYDRATE_SYSTEM_VARIABLES_WITH_DEFAULTS',
  HYDRATE_PAYLOAD_VARIABLES_WITH_RANDOM_VALUES_IF_MISSING = 'HYDRATE_PAYLOAD_VARIABLES_WITH_RANDOM_VALUES_IF_MISSING',
}

export const GeneratePreviewRequestDtoSchema = z.object({
  controlValues: z.record(z.unknown()).optional(),
  payloadValues: z.record(z.unknown()).optional(),
  controlSchema: jsonschemaZodValidator,
  variablesSchema: jsonschemaZodValidator.optional(),
  workflowId: z.string(),
  stepId: z.string().optional(),
  hydrationStrategies: z.array(z.nativeEnum(HydrationStrategyEnum)),
  validationStrategies: z.array(z.nativeEnum(ValidationStrategyEnum)),
});

export type GeneratePreviewRequestDto = z.infer<typeof GeneratePreviewRequestDtoSchema>;
