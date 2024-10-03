import { BadRequestException } from '@nestjs/common';

export class CommandValidationException extends BadRequestException {
  constructor(public mappedErrors: unknown[]) {
    super(`Command validation failed: ${JSON.stringify(mappedErrors)}`);
  }
}
