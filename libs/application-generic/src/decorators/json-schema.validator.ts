import { registerDecorator, ValidationArguments, ValidationOptions } from 'class-validator';
import { createSchemaValidationAjv } from '../utils/issues';

export function IsValidJsonSchema(validationOptions?: ValidationOptions & { nullable?: boolean }) {
  return (object: object, propertyName: string) => {
    registerDecorator({
      name: 'isValidJsonSchema',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate(value: any, args: ValidationArguments) {
          if (!value || typeof value !== 'object') {
            if (validationOptions?.nullable && !value) {
              return true;
            }

            return false;
          }

          try {
            createSchemaValidationAjv({ schema: value }).compile(value);

            return true;
          } catch (error) {
            return false;
          }
        },
        defaultMessage(args: ValidationArguments) {
          return `${args.property} must be a valid JSON schema`;
        },
      },
    });
  };
}
