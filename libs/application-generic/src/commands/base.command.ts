import { plainToInstance } from 'class-transformer';
import { validateSync, ValidationError } from 'class-validator';
import { BadRequestException } from '@nestjs/common';

export abstract class BaseCommand {
  static create<T extends BaseCommand>(this: new (...args: unknown[]) => T, data: T): T {
    const convertedObject = plainToInstance<T, unknown>(this, {
      ...data,
    });

    const errors = validateSync(convertedObject);
    const flattenedErrors = flattenErrors(errors);
    if (Object.keys(flattenedErrors).length > 0) {
      throw new CommandValidationException(this.name, flattenedErrors);
    }

    return data;
  }
}

export class ConstraintValidation {
  messages: string[];
  value: any;
}

function flattenErrors(errors: ValidationError[], prefix: string = ''): Record<string, ConstraintValidation> {
  const result: Record<string, ConstraintValidation> = {};

  for (const error of errors) {
    const currentKey = prefix ? `${prefix}.${error.property}` : error.property;

    if (error.constraints) {
      result[currentKey] = {
        messages: Object.values(error.constraints),
        value: error.value,
      };
    }

    if (error.children && error.children.length > 0) {
      const childErrors = flattenErrors(error.children, currentKey);
      for (const [key, value] of Object.entries(childErrors)) {
        if (result[key]) {
          result[key].messages = result[key].messages.concat(value.messages);
        } else {
          result[key] = value;
        }
      }
    }
  }

  return result;
}
export class CommandValidationException extends BadRequestException {
  constructor(
    public className: string,
    public constraintsViolated: Record<string, ConstraintValidation>
  ) {
    super({ message: 'Validation failed', className, constraintsViolated });
  }
}
