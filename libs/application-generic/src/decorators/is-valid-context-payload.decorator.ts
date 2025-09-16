import { ContextPayload, isFullObjectContext, isStringContext, isTypeKeyContext } from '@novu/shared';
import { registerDecorator, ValidationOptions } from 'class-validator';

export function IsValidContextPayload(validationOptions?: ValidationOptions) {
  return (object: object, propertyName: string) => {
    registerDecorator({
      name: 'isValidContextPayload',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: unknown) {
          return validateContextPayload(value);
        },
        defaultMessage() {
          return 'Context must be a valid identifier string, context type object, or full context object';
        },
      },
    });
  };
}

export function validateContextPayload(value: unknown): boolean {
  if (value === undefined || value === null) {
    return true; // Optional field
  }

  const contextPayload = value as ContextPayload;

  return isStringContext(contextPayload) || isTypeKeyContext(contextPayload) || isFullObjectContext(contextPayload);
}
