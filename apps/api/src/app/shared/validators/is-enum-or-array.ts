import { registerDecorator, ValidationArguments, ValidationOptions } from 'class-validator';

export function IsEnumOrArray(enumObj: object, options?: ValidationOptions) {
  return (object: unknown, propertyName: string) => {
    registerDecorator({
      name: 'isEnumOrArray',
      target: (object as any).constructor,
      propertyName,
      constraints: [enumObj],
      options,
      validator: {
        validate(value: any, args: ValidationArguments) {
          const allowed = Object.values(args.constraints[0] as object);
          if (value === undefined || value === null) return true;
          return Array.isArray(value) ? value.every((v) => allowed.includes(v)) : allowed.includes(value);
        },
      },
    });
  };
}
