import { Injectable, Logger } from '@nestjs/common';
import { JobTopicNameEnum } from '@novu/shared';
import { BullMqService } from '../../bull-mq.service';

@Injectable()
export class SubscriberProcessQueueService {
  private readonly LOG_CONTEXT = 'SubscriberProcessQueueService';
  public readonly name = JobTopicNameEnum.SUBSCRIBER_PROCESS;

  constructor(private bullMqService: BullMqService) {
    this.bullMqService.createQueue(this.name, {
      defaultJobOptions: {
        removeOnComplete: true,
      },
    });
  }

  public add(id: string, data: any, organizationId: string) {
    Logger.log(
      `${this.LOG_CONTEXT}.add: ${id} Group: ${organizationId}`,
      this.LOG_CONTEXT
    );

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
    Logger.log(
      'Shutting the subscriber process queue service down',
      this.LOG_CONTEXT
    );

    await this.bullMqService.gracefulShutdown();

    Logger.log(
      'Shutting down the subscriber process queue service has finished',
      this.LOG_CONTEXT
    );
  }

  async onModuleDestroy(): Promise<void> {
    await this.gracefulShutdown();
  }
}
