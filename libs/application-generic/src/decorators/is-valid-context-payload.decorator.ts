import { ContextPayload, ContextValue, isValidContextPayload } from '@novu/shared';
import { registerDecorator, ValidationOptions } from 'class-validator';

const MAX_SIZE_KB = 64;
const CONTEXT_DATA_MAX_SIZE_BYTES = MAX_SIZE_KB * 1024;

export interface ContextPayloadValidationOptions extends ValidationOptions {
  maxCount?: number;
}

export interface ContextPayloadValidationResult {
  isValid: boolean;
  error?: string;
}

function calculateDataSize(data: unknown): { sizeInBytes: number; isValid: boolean } {
  if (!data) return { sizeInBytes: 0, isValid: true };

  try {
    const jsonString = JSON.stringify(data);
    const sizeInBytes = Buffer.byteLength(jsonString, 'utf8');
    return { sizeInBytes, isValid: sizeInBytes <= CONTEXT_DATA_MAX_SIZE_BYTES };
  } catch {
    return { sizeInBytes: 0, isValid: false };
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
  const { sizeInBytes, isValid } = calculateDataSize(data);

  if (!isValid) {
    if (sizeInBytes === 0) {
      return {
        isValid: false,
        error: `Context '${contextType}' data is invalid: cannot serialize to JSON`,
      };
    }

    const currentSizeKB = Math.round(sizeInBytes / 1024);
    return {
      isValid: false,
      error: `Context '${contextType}' data is too large: ${currentSizeKB}KB exceeds ${MAX_SIZE_KB}KB limit`,
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

// Decorator
export function IsValidContextPayload(validationOptions?: ContextPayloadValidationOptions) {
  return (object: object, propertyName: string) => {
    let lastValidationError: string | undefined;

    registerDecorator({
      name: 'isValidContextPayload',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: unknown) {
          const result = validateContextPayloadWithDetails(value, validationOptions?.maxCount);
          lastValidationError = result.error;
          return result.isValid;
        },
        defaultMessage() {
          return lastValidationError || 'Invalid context payload';
        },
      },
    });
  };
}
