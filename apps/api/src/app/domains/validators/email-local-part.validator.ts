import {
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

const MAX_LOCAL_PART_LENGTH = 64;
const EMAIL_LOCAL_PART_REGEX = /^[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*$/i;

export function isValidEmailLocalPart(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  if (value === '*') return true;
  if (value.length === 0 || value.length > MAX_LOCAL_PART_LENGTH) return false;
  if (value !== value.trim()) return false;
  if (value.includes('@')) return false;

  return EMAIL_LOCAL_PART_REGEX.test(value);
}

@ValidatorConstraint({ name: 'isEmailLocalPart', async: false })
class IsEmailLocalPartConstraint implements ValidatorConstraintInterface {
  validate(value: unknown): boolean {
    return isValidEmailLocalPart(value);
  }

  defaultMessage(args: ValidationArguments): string {
    return `${args.property} must be a valid inbox address local part, for example "hello" or "sales+vip".`;
  }
}

export function IsEmailLocalPart(validationOptions?: ValidationOptions) {
  return (object: object, propertyName: string) => {
    registerDecorator({
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: IsEmailLocalPartConstraint,
    });
  };
}
