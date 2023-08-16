import { Injectable, Logger } from '@nestjs/common';

import { BullMqService, CreateExecutionDetails, CreateExecutionDetailsCommand } from '@novu/application-generic';
import { JobTopicNameEnum } from '@novu/shared';

@Injectable()
export class ExecutionDetailsArchiveConsumer {
  private readonly LOG_CONTEXT = 'ExecutionDetailsArchiveConsumerService';
  private readonly name = JobTopicNameEnum.EXECUTION_DETAIL_ARCHIVE;

  constructor(private createExecutionDetails: CreateExecutionDetails, private bullMqService: BullMqService) {
    this.bullMqService.createWorker(this.name, this.getWorkerProcessor(), this.getWorkerOpts());
  }

  private getWorkerProcessor() {
    return async ({ data }) => {
      try {
        await this.createExecutionDetails.execute(CreateExecutionDetailsCommand.create({ ...data }));
      } catch (e) {
        // eslint-disable-next-line no-console
        Logger.error(
          'Unexpected exception occurred while execution details archive consumer services route ',
          e,
          this.LOG_CONTEXT
        );

        throw e;
      }
    };
  }

  private getWorkerOpts() {
    return {
      lockDuration: 90000,
      concurrency: 5,
    };
  }
}
