import { BadRequestException } from '@nestjs/common';

export class CommandValidationException extends BadRequestException {
  constructor(private mappedErrors: string[]) {
    super({ message: 'Validation failed', errors: mappedErrors });
  }
}
