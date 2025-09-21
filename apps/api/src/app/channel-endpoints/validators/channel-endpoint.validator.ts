import { validateEndpointForTypeFromSchema } from '@novu/application-generic';
import { ChannelEndpointType } from '@novu/shared';
import { registerDecorator, ValidationArguments, ValidationOptions } from 'class-validator';

export function IsValidChannelEndpoint(validationOptions?: ValidationOptions) {
  return (object: object, propertyName: string) => {
    registerDecorator({
      name: 'isValidChannelEndpoint',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: unknown, args: ValidationArguments) {
          const obj = args.object as Record<string, unknown>;
          const type = obj.type as ChannelEndpointType;

          if (!type || !value || typeof value !== 'object') {
            return false;
          }

          const endpointValue = value as Record<string, unknown>;
          return validateEndpointForTypeFromSchema(type, endpointValue);
        },
        defaultMessage(args: ValidationArguments) {
          const obj = args.object as Record<string, unknown>;
          const type = obj.type;
          return `Endpoint must match the required format for type "${type}"`;
        },
      },
    });
  };
}
