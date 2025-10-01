import { ContextPayload, ContextValue, isValidContextPayload } from '@novu/shared';
import { registerDecorator, ValidationOptions } from 'class-validator';

const MAX_SIZE_KB = 64;

export interface ContextPayloadValidationOptions extends ValidationOptions {
  maxCount?: number;
}

export interface ContextDataValidationOptions extends ValidationOptions {
  maxSizeKB?: number;
}

export interface ContextPayloadValidationResult {
  isValid: boolean;
  error?: string;
}

function calculateDataSize(data: unknown, maxSizeKB = MAX_SIZE_KB): ContextPayloadValidationResult {
  if (!data) return { isValid: true };

  try {
    const jsonString = JSON.stringify(data);
    const sizeInBytes = Buffer.byteLength(jsonString, 'utf8');
    const maxSizeBytes = maxSizeKB * 1024;

    if (sizeInBytes > maxSizeBytes) {
      const currentSizeKB = Math.round(sizeInBytes / 1024);
      return {
        isValid: false,
        error: `Data is too large: ${currentSizeKB}KB exceeds ${maxSizeKB}KB limit`,
      };
    }

    return { isValid: true };
  } catch {
    return {
      isValid: false,
      error: 'Data is invalid: cannot serialize to JSON',
    };
  }
}

function validateContextCount(contextObj: Record<string, unknown>, maxCount?: number): ContextPayloadValidationResult {
  if (!maxCount) return { isValid: true };

  const contextCount = Object.keys(contextObj).length;
  if (contextCount > maxCount) {
    return {
      isValid: false,
      error: `Too many contexts: ${contextCount} provided, maximum allowed is ${maxCount}`,
    };
  }

  return { isValid: true };
}

function validateContextDataSizes(contextObj: Record<string, unknown>): ContextPayloadValidationResult {
  for (const [contextType, contextValue] of Object.entries(contextObj)) {
    const result = validateSingleContextData(contextType, contextValue);
    if (!result.isValid) return result;
  }

  return { isValid: true };
}

function validateSingleContextData(contextType: string, contextValue: unknown): ContextPayloadValidationResult {
  if (typeof contextValue !== 'object' || contextValue === null || !('data' in contextValue)) {
    return { isValid: true }; // No data to validate
  }

  const data = (contextValue as ContextValue & { data?: unknown }).data;
  const result = calculateDataSize(data);

  if (!result.isValid) {
    return {
      isValid: false,
      error: `Context '${contextType}' ${result.error}`,
    };
  }

  return { isValid: true };
}

// Main validation functions
export function validateContextPayloadWithDetails(value: unknown, maxCount?: number): ContextPayloadValidationResult {
  // Handle null/undefined
  if (value == null) return { isValid: true };

  // Validate structure
  if (!isValidContextPayload(value)) {
    return {
      isValid: false,
      error:
        'Invalid context payload structure. Expected object with context types as keys and string IDs or {id, data} objects as values',
    };
  }

  const contextObj = value as ContextPayload;

  // Validate count
  const countResult = validateContextCount(contextObj, maxCount);
  if (!countResult.isValid) return countResult;

  // Validate data sizes
  return validateContextDataSizes(contextObj);
}

export function validateContextPayload(value: unknown, maxCount?: number): boolean {
  return validateContextPayloadWithDetails(value, maxCount).isValid;
}

export function validateContextDataWithDetails(value: unknown, maxSizeKB?: number): ContextPayloadValidationResult {
  if (value == null) return { isValid: true };

  // Must be an object
  if (typeof value !== 'object' || Array.isArray(value)) {
    return {
      isValid: false,
      error: 'Context data must be an object',
    };
  }

  return calculateDataSize(value, maxSizeKB);
}

function createValidationDecorator<T extends ValidationOptions>(
  name: string,
  validationFn: (value: unknown, options?: T) => ContextPayloadValidationResult,
  defaultMessage: string
) {
  return (validationOptions?: T) => {
    return (object: object, propertyName: string) => {
      let lastValidationError: string | undefined;

      registerDecorator({
        name,
        target: object.constructor,
        propertyName: propertyName,
        options: validationOptions,
        validator: {
          validate(value: unknown) {
            const result = validationFn(value, validationOptions);
            lastValidationError = result.error;
            return result.isValid;
          },
          defaultMessage() {
            return lastValidationError || defaultMessage;
          },
        },
      });
    };
  };
}

// Decorators
export const IsValidContextPayload = createValidationDecorator<ContextPayloadValidationOptions>(
  'isValidContextPayload',
  (value, options) => validateContextPayloadWithDetails(value, options?.maxCount),
  'Invalid context payload'
);

export const IsValidContextData = createValidationDecorator<ContextDataValidationOptions>(
  'isValidContextData',
  (value, options) => validateContextDataWithDetails(value, options?.maxSizeKB),
  'Invalid context data'
);
