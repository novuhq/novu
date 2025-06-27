import { ValidationArguments, registerDecorator, ValidationOptions } from 'class-validator';
import { LocaleValidator } from '../utils/locale-validator';

export function IsValidLocale(validationOptions?: ValidationOptions) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (object: any, propertyName: string) => {
    registerDecorator({
      name: 'isValidLocale',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate(value: unknown, args: ValidationArguments) {
          const result = LocaleValidator.validate(value, args.property);

          return result.isValid;
        },
        defaultMessage(args: ValidationArguments) {
          const result = LocaleValidator.validate(args.value, args.property);

          return result.errorMessage || `${args.property} must be a valid locale code`;
        },
      },
    });
  };
}
