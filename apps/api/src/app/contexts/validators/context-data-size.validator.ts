import {
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

// Context data size limits
export const CONTEXT_DATA_MAX_SIZE_BYTES = 64 * 1024;

@ValidatorConstraint({ name: 'IsContextDataSizeValid', async: false })
export class IsContextDataSizeValidConstraint implements ValidatorConstraintInterface {
  validate(data: unknown): boolean {
    if (!data) return true; // Allow null/undefined

    try {
      // Check JSON serialization size
      const jsonString = JSON.stringify(data);
      const sizeInBytes = Buffer.byteLength(jsonString, 'utf8');

      return sizeInBytes <= CONTEXT_DATA_MAX_SIZE_BYTES;
    } catch {
      // If JSON.stringify fails, the data is invalid
      return false;
    }
  }

  defaultMessage(args: ValidationArguments) {
    const jsonString = JSON.stringify(args.value);
    const sizeInBytes = Buffer.byteLength(jsonString, 'utf8');
    const maxSizeKB = Math.round(CONTEXT_DATA_MAX_SIZE_BYTES / 1024);
    const currentSizeKB = Math.round(sizeInBytes / 1024);

    return `Context data is too large (${currentSizeKB}KB). Maximum size is ${maxSizeKB}KB`;
  }
}

export const IsContextDataSizeValid =
  (validationOptions?: ValidationOptions) => (object: object, propertyName: string) => {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsContextDataSizeValidConstraint,
    });
  };
