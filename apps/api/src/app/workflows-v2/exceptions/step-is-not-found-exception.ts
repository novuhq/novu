import { NotFoundException } from '@nestjs/common';

export class StepIsNotFoundException extends NotFoundException {
  constructor(stepUuid: string) {
    super({ message: 'Step cannot be found using the UUID Supplied', stepUuid });
  }
}
