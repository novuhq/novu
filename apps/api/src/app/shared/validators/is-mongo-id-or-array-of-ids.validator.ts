import { isMongoId, ValidateBy, ValidationOptions } from 'class-validator';

export function IsMongoIdOrArrayOfMongoIds(validationOptions: ValidationOptions & { fieldName?: string }) {
  return ValidateBy(
    {
      name: 'isMongoIdOrArrayOfMongoIds',
      validator: {
        validate: (value: unknown): boolean => {
          if (typeof value === 'string') {
            return isMongoId(value);
          }

          if (Array.isArray(value)) {
            return value.length > 0 && value.every((id) => typeof id === 'string' && isMongoId(id));
          }

          return false;
        },
        defaultMessage: (): string => {
          return `${validationOptions.fieldName} must be a valid MongoDB ObjectId or an array of valid MongoDB ObjectIds`;
        },
      },
    },
    validationOptions
  );
}
