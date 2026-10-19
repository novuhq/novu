import { validateLocale } from '@novu/shared';
import { registerDecorator, ValidationArguments, ValidationOptions } from 'class-validator';

export function IsValidLocale(validationOptions?: ValidationOptions) {
  return (object: any, propertyName: string) => {
    registerDecorator({
      name: 'isValidLocale',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate(value: unknown, args: ValidationArguments) {
          const result = validateLocale(value, args.property);

          return result.isValid;
        },
        defaultMessage(args: ValidationArguments) {
          const result = validateLocale(args.value, args.property);

          return result.errorMessage || `${args.property} must be a valid locale code`;
        },
      },
    });
  };
}
