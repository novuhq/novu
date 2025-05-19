import { BadRequestException } from '@nestjs/common';

/**
 * Validates the data structure for the data parameter.
 * Ensures:
 * - Maximum nesting level of 2
 * - Only scalar values are allowed (string, number, boolean, null)
 * - String values are limited to 256 characters
 */
export function validateDataStructure(data: unknown): void {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new BadRequestException('Data must be an object');
  }
  for (const [key, value] of Object.entries(data)) {
    if (typeof value === 'object' && value !== null) {
      if (Array.isArray(value)) {
        throw new BadRequestException('Arrays are not supported in data filter');
      }
      for (const [subKey, subValue] of Object.entries(value)) {
        if (typeof subValue === 'object' && subValue !== null) {
          throw new BadRequestException('Maximum nesting level exceeded (2 levels max)');
        }
        validateScalarValue(subKey, subValue);
      }
    } else {
      validateScalarValue(key, value);
    }
  }
}

/**
 * Validates a scalar value.
 * Ensures:
 * - Value is a scalar (string, number, boolean, null)
 * - String values are limited to 256 characters
 */
export function validateScalarValue(key: string, value: unknown): void {
  if (typeof value === 'string' && value.length > 256) {
    throw new BadRequestException(`String value for ${key} exceeds 256 characters`);
  }
  if (typeof value !== 'string' && typeof value !== 'number' && typeof value !== 'boolean' && value !== null) {
    throw new BadRequestException(`Value for ${key} must be a scalar (string, number, boolean, or null)`);
  }
}
