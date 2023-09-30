import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { JobEntity, JobRepository } from '@novu/dal';
import { AddJob, InstrumentUsecase } from '@novu/application-generic';

import { QueueNextJobCommand } from './queue-next-job.command';
import { MessageMatcher } from '../message-matcher/message-matcher.usecase';
import { StepTypeEnum } from '@novu/shared';
import { MessageMatcherCommand } from '../message-matcher/message-matcher.command';

@Injectable()
export class QueueNextJob {
  constructor(
    private jobRepository: JobRepository,
    @Inject(forwardRef(() => AddJob)) private addJobUsecase: AddJob,
    private messageMatcher: MessageMatcher
  ) {}

  @InstrumentUsecase()
  public async execute(command: QueueNextJobCommand): Promise<JobEntity | undefined> {
    const job = await this.jobRepository.findOne({
      _environmentId: command.environmentId,
      _parentId: command.parentId,
    });

    if (!job) {
      return;
    }

    let filtered = false;

    if ([StepTypeEnum.DELAY, StepTypeEnum.DIGEST].includes(job.type as StepTypeEnum)) {
      const messageMatcherCommand = MessageMatcherCommand.create({
        step: job.step,
        job: job,
        userId: command.userId,
        transactionId: job.transactionId,
        _subscriberId: job._subscriberId,
        environmentId: job._environmentId,
        organizationId: job._organizationId,
        subscriberId: job.subscriberId,
        identifier: job.identifier,
      });
      const payload = await this.messageMatcher.getFilterData(messageMatcherCommand);
      const shouldRun = await this.messageMatcher.filter(messageMatcherCommand, payload, true);

      filtered = !shouldRun.passed;
    }

    await this.addJobUsecase.execute({
      userId: job._userId,
      environmentId: job._environmentId,
      organizationId: command.organizationId,
      jobId: job._id,
      job,
      filtered,
    });

    return job;
  }
}
