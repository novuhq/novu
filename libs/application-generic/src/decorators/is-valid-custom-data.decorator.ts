import { registerDecorator, ValidationOptions } from 'class-validator';

function isScalarCustomDataValue(value: unknown): boolean {
  if (value === undefined) {
    return true;
  }

  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return true;
  }

  if (Array.isArray(value)) {
    return value.every((item) => typeof item === 'string');
  }

  return false;
}

export function validateCustomDataWithDetails(value: unknown): { isValid: boolean; error?: string } {
  if (value == null) {
    return { isValid: true };
  }

  if (typeof value !== 'object' || Array.isArray(value)) {
    return { isValid: false, error: 'Custom data must be an object' };
  }

  for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
    if (!isScalarCustomDataValue(entry)) {
      return {
        isValid: false,
        error: `Custom data field "${key}" must be a string, number, boolean, or string[]`,
      };
    }
  }

  return { isValid: true };
}

export function IsValidCustomData(validationOptions?: ValidationOptions) {
  return (object: object, propertyName: string) => {
    let lastValidationError: string | undefined;

    registerDecorator({
      name: 'isValidCustomData',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate(value: unknown) {
          const result = validateCustomDataWithDetails(value);
          lastValidationError = result.error;

          return result.isValid;
        },
        defaultMessage() {
          return lastValidationError || 'Invalid custom data';
        },
      },
    });
  };
}
