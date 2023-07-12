import { Logger } from '@nestjs/common';

const LOG_CONTEXT = 'TriggerQueueService';

import { BullMqService } from './bull-mq.service';

export class TriggerQueueService {
  public readonly name = 'trigger-handler';
  public readonly bullMqService: BullMqService;

  constructor() {
    this.bullMqService = new BullMqService();

    this.bullMqService.createQueue(this.name, {
      defaultJobOptions: {
        removeOnComplete: true,
      },
    });
  }

  public add(id: string, data: any, organizationId: string) {
    Logger.log(
      `TriggerQueueService.add: ${id} Group: ${organizationId}`,
      LOG_CONTEXT
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
    Logger.log('Shutting the Trigger Queue service down', LOG_CONTEXT);

    await this.bullMqService.gracefulShutdown();

    Logger.log(
      'Shutting down the Trigger Queue service has finished',
      LOG_CONTEXT
    );
  }

  async onModuleDestroy(): Promise<void> {
    await this.gracefulShutdown();
  }
}
