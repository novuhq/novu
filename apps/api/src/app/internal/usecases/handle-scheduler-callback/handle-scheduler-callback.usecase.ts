import { Injectable } from '@nestjs/common';
import { PinoLogger, StandardQueueService } from '@novu/application-generic';
import { CloudflareSchedulerMode } from '@novu/shared';
import { HandleSchedulerCallbackCommand } from './handle-scheduler-callback.command';

@Injectable()
export class HandleSchedulerCallback {
  constructor(
    private standardQueueService: StandardQueueService,
    private logger: PinoLogger
  ) {
    this.logger.setContext(HandleSchedulerCallback.name);
  }

  async execute(command: HandleSchedulerCallbackCommand): Promise<{ success: boolean; jobId: string }> {
    const shouldSkipProcessing = command.mode === CloudflareSchedulerMode.SHADOW;

    this.logger.info(
      {
        jobId: command.jobId,
        mode: command.mode,
        shouldSkipProcessing,
      },
      'Received scheduler callback'
    );

    const jobData = {
      _environmentId: command.data._environmentId,
      _id: command.data._id,
      _organizationId: command.data._organizationId,
      _userId: command.data._userId,
      ...(shouldSkipProcessing && { skipProcessing: true }),
    };

    await this.standardQueueService.add({
      name: command.jobId,
      data: jobData,
      groupId: command.data._organizationId,
      options: { delay: 0 },
    });

    this.logger.info(
      {
        jobId: command.jobId,
        mode: command.mode,
        skipProcessing: shouldSkipProcessing,
      },
      'Job enqueued to BullMQ from scheduler callback'
    );

    return { success: true, jobId: command.jobId };
  }
}
