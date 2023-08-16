import { Injectable, Logger } from '@nestjs/common';

import { BullMqService } from '@novu/application-generic';
import { JobTopicNameEnum } from '@novu/shared';

@Injectable()
export class ExecutionDetailsArchiveProducer {
  private readonly LOG_CONTEXT = 'ExecutionDetailsArchiveProducerService';
  public readonly name = JobTopicNameEnum.EXECUTION_DETAIL_ARCHIVE;

  constructor(private bullMqService: BullMqService) {
    this.bullMqService.createQueue(this.name, {
      defaultJobOptions: {
        removeOnComplete: true,
      },
    });
  }

  public add(id: string, data: any, organizationId: string) {
    Logger.log(`${this.LOG_CONTEXT}.add: ${id} Group: ${organizationId}`, this.LOG_CONTEXT);

    this.bullMqService.add(
      id,
      data,
      {
        removeOnComplete: true,
        removeOnFail: true,
      },
      organizationId
    );
  }

  public async gracefulShutdown(): Promise<void> {
    Logger.log('Shutting the execution details archive producer service down', this.LOG_CONTEXT);

    await this.bullMqService.gracefulShutdown();

    Logger.log('Shutting down the execution details archive producer service has finished', this.LOG_CONTEXT);
  }

  async onModuleDestroy(): Promise<void> {
    await this.gracefulShutdown();
  }
}
