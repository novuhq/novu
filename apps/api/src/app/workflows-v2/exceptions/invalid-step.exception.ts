import { InternalServerErrorException } from '@nestjs/common';

export class InvalidStepException extends InternalServerErrorException {
  constructor(problematicStepId: string) {
    super({ message: 'persisted step was found Invalid, potential bug to be investigated ', step: problematicStepId });
  }
}
