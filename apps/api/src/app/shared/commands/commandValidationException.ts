import { BadRequestException } from '@nestjs/common';

export class CommandValidationException extends BadRequestException {
  constructor(public mappedErrors: string[]) {
    super({ message: 'Validation failed', errors: mappedErrors });
  }
}
