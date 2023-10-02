import {
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
} from 'class-validator';
import { StepVariantDto } from '@novu/shared';

// eslint-disable-next-line @typescript-eslint/naming-convention
export function IsNotEmpty(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isNotEmpty',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: any, args: ValidationArguments) {
          return ![null, undefined, 'null', 'undefined', ''].some(
            (invalidValue) => invalidValue === value
          );
        },
        defaultMessage: function (data) {
          const value = data?.value === '' ? 'empty string' : data?.value;

          return `${data?.property} should not be ${value}`;
        },
      },
    });
  };
}

// eslint-disable-next-line @typescript-eslint/naming-convention
export function VariantWithFilter(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'variantWithFilter',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: any, args: ValidationArguments) {
          const invalid = value.some((variant) => !variant.filters?.length);

          return !invalid;
        },
        defaultMessage: function (data) {
          return `Variant conditions are required, by providing a variant please make sure to add at least one condition.`;
        },
      },
    });
  };
}
