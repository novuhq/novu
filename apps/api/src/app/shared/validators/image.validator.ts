import { registerDecorator, ValidationOptions, ValidationArguments } from 'class-validator';

export function IsImageUrl(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isImageUrl',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate(value: any, args: ValidationArguments) {
          const validExtensions = ['jpg', 'jpeg', 'png', 'gif', 'svg'];
          const extension = value.split('.').pop();
          if (!extension) return false;

          return validExtensions.includes(extension);
        },
      },
    });
  };
}
