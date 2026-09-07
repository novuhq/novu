import { normalizeTagGroups } from '@novu/shared';
import {
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

@ValidatorConstraint({ name: 'isTagsFilter', async: false })
export class IsTagsFilterConstraint implements ValidatorConstraintInterface {
  validate(value: unknown): boolean {
    if (value === null) {
      return false;
    }

    if (value === undefined) {
      return true;
    }

    try {
      normalizeTagGroups(value as never);

      return true;
    } catch {
      return false;
    }
  }

  defaultMessage(args: ValidationArguments) {
    return `${args.property} must be string[] (OR), { or: string[] }, or { and: [{ or: string[] }, ...] } (AND of OR-groups)`;
  }
}

export function IsTagsFilter(validationOptions?: ValidationOptions) {
  return (object: object, propertyName: string) => {
    registerDecorator({
      target: object.constructor,
      propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsTagsFilterConstraint,
    });
  };
}
