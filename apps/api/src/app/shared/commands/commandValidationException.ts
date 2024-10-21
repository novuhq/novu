import { BadRequestException } from '@nestjs/common';

export class CommandValidationException extends BadRequestException {
  constructor(private mappedErrors: string[]) {
    super(`Command validation failed: ${JSON.stringify(mappedErrors)}`);
  }
}
