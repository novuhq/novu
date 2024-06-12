import { Injectable } from '@nestjs/common';

import { JobRepository } from '@novu/dal';
import { InstrumentUsecase } from '@novu/application-generic';

import { SendMessageCommand } from './send-message.command';

@Injectable()
export class ExecuteStepCustom {
  constructor(private jobRepository: JobRepository) {}

  @InstrumentUsecase()
  public async execute(command: SendMessageCommand) {
    await this.jobRepository.updateOne(
      { _id: command.job._id, _environmentId: command.environmentId },
      {
        $set: { stepOutput: command.bridgeData?.outputs },
      }
    );
  }
}
