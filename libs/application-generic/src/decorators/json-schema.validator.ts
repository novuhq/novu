import type { AnySchema } from 'ajv';
import { registerDecorator, ValidationArguments, ValidationOptions } from 'class-validator';
import { getSchemaValidator } from '../utils/issues';

export function IsValidJsonSchema(validationOptions?: ValidationOptions & { nullable?: boolean }) {
  return (object: object, propertyName: string) => {
    registerDecorator({
      name: 'isValidJsonSchema',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate(value: unknown) {
          if (!value || typeof value !== 'object') {
            if (validationOptions?.nullable && !value) {
              return true;
            }

            return false;
          }

          try {
            // Same options as trigger payload validation, so this compile is reused at trigger time.
            getSchemaValidator(value as AnySchema, { useDefaults: true });

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
