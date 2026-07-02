import {
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

@ValidatorConstraint({ name: 'isDomainConnectRedirectUrl', async: false })
class IsDomainConnectRedirectUrlConstraint implements ValidatorConstraintInterface {
  validate(value: unknown): boolean {
    if (typeof value !== 'string') {
      return false;
    }

    try {
      const url = new URL(value);

      if (url.protocol === 'https:') {
        return true;
      }

      return url.protocol === 'http:' && (url.hostname === 'localhost' || url.hostname === '127.0.0.1');
    } catch {
      return false;
    }
  }

  defaultMessage(args: ValidationArguments): string {
    return `${args.property} must be an HTTPS URL, or HTTP only for localhost/127.0.0.1.`;
  }
}

export function IsDomainConnectRedirectUrl(validationOptions?: ValidationOptions) {
  return (object: object, propertyName: string) => {
    registerDecorator({
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: IsDomainConnectRedirectUrlConstraint,
    });
  };
}
