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

          // For update operations, type may not be present (it's determined from existing endpoint)
          // Skip validation here - it will be validated in the usecase after fetching the existing endpoint
          if (!type) {
            return true;
          }

          if (!value || typeof value !== 'object') {
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
