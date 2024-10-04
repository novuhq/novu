import { InternalServerErrorException } from '@nestjs/common';
import { NotificationStepEntity } from '@novu/dal';

export class StepUpsertMechanismFailedMissingIdException extends InternalServerErrorException {
  constructor(stepDatabaseId: string, stepExternalID: string | undefined, persistedStep: NotificationStepEntity) {
    super({
      message: 'Failed to upsert step control values due to missing id',
      stepDatabaseId,
      stepExternalID,
      persistedStep,
    });
  }
}
