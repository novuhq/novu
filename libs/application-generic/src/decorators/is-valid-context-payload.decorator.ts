import { isValidContextPayload } from '@novu/shared';
import { registerDecorator, ValidationOptions } from 'class-validator';

export interface ContextPayloadValidationOptions extends ValidationOptions {
  maxCount?: number;
}

export function IsValidContextPayload(validationOptions?: ContextPayloadValidationOptions) {
  return (object: object, propertyName: string) => {
    registerDecorator({
      name: 'isValidContextPayload',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: unknown) {
          return validateContextPayload(value, validationOptions?.maxCount);
        },
        defaultMessage() {
          const maxCount = validationOptions?.maxCount;
          if (maxCount) {
            return `Invalid context payload type or exceeds maximum of ${maxCount} contexts`;
          }
          return 'Invalid context payload type';
        },
      },
    });
  };
}

export function validateContextPayload(value: unknown, maxCount?: number): boolean {
  if (value === undefined || value === null) {
    return true; // Optional field
  }

  if (!isValidContextPayload(value)) {
    return false;
  }

  // Check maximum count if specified
  if (maxCount && typeof value === 'object' && value !== null) {
    const contextObj = value as Record<string, unknown>;
    return Object.keys(contextObj).length <= maxCount;
  }

  return true;
}
