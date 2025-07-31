import { BadRequestException } from '@nestjs/common';
import { ApiProperty } from '@nestjs/swagger';
import { plainToInstance } from 'class-transformer';
import { ValidationError, validateSync } from 'class-validator';

// biome-ignore lint/complexity/noStaticOnlyClass: Base class pattern for command validation
export abstract class BaseCommand {
  static create<T extends BaseCommand>(this: new (...args: unknown[]) => T, data: T): T {
    // biome-ignore lint/complexity/noThisInStatic: Biome linter is configured to newer JS/TS version than the compiler
    const convertedObject = plainToInstance<T, unknown>(this, {
      ...data,
    });

    const errors = validateSync(convertedObject);
    const flattenedErrors = flattenErrors(errors);
    if (Object.keys(flattenedErrors).length > 0) {
      // biome-ignore lint/complexity/noThisInStatic: Biome linter is configured to newer JS/TS version than the compiler
      throw new CommandValidationException(this.name, flattenedErrors);
    }

    return convertedObject;
  }
}

export class ConstraintValidation {
  @ApiProperty({
    type: 'array',
    items: { type: 'string' },
    description: 'List of validation error messages',
    example: ['Field is required', 'Invalid format'],
  })
  messages: string[];

  @ApiProperty({
    required: false,
    description: 'Value that failed validation',
    oneOf: [
      { type: 'string', nullable: true },
      { type: 'number' },
      { type: 'boolean' },
      { type: 'object' },
      {
        type: 'array',
        items: {
          anyOf: [
            { type: 'string', nullable: true },
            { type: 'number' },
            { type: 'boolean' },
            { type: 'object', additionalProperties: true },
          ],
        },
      },
    ],
    example: 'xx xx xx ',
  })
  value?: string | number | boolean | object | object[] | null;
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
