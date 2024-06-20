import { registerDecorator, ValidationOptions, ValidationArguments, isMongoId } from 'class-validator';

// eslint-disable-next-line @typescript-eslint/naming-convention
export function IsMongoIdOrNumber(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isMongoIdOrNumber',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: any, _: ValidationArguments) {
          const isMongoIdValue = isMongoId(value);
          if (isMongoIdValue) return true;

          const possibleNumber = Number(value);

          return !Number.isNaN(possibleNumber) && Number.isInteger(possibleNumber) && possibleNumber >= 0;
        },
      },
    });
  };
}
