import { normalizeTagGroups, TagsFilterValidationError } from '@novu/shared';
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
    } catch (e) {
      if (e instanceof TagsFilterValidationError) {
        return false;
      }

      return false;
    }
  }

  defaultMessage(args: ValidationArguments) {
    return `${args.property} must be a flat string[] (OR) or nested string[][] (AND of OR-groups) with non-empty inner arrays`;
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
