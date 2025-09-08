import { validateAddressForTypeFromSchema } from '@novu/application-generic';
import { ChannelAddressType } from '@novu/shared';
import { registerDecorator, ValidationArguments, ValidationOptions } from 'class-validator';

export function IsValidChannelAddress(validationOptions?: ValidationOptions) {
  return (object: object, propertyName: string) => {
    registerDecorator({
      name: 'isValidChannelAddress',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: unknown, args: ValidationArguments) {
          const obj = args.object as Record<string, unknown>;
          const type = obj.type as ChannelAddressType;

          if (!type || !value || typeof value !== 'object') {
            return false;
          }

          const addressValue = value as Record<string, unknown>;
          return validateAddressForTypeFromSchema(type, addressValue);
        },
        defaultMessage(args: ValidationArguments) {
          const obj = args.object as Record<string, unknown>;
          const type = obj.type;
          return `Address must match the required format for type "${type}"`;
        },
      },
    });
  };
}
