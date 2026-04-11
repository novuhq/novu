import { BadRequestException, Injectable } from '@nestjs/common';
import { PinoLogger, StandardQueueService, StepRunRepository } from '@novu/application-generic';
import { JobRepository, JobStatusEnum } from '@novu/dal';
import { StepTypeEnum } from '@novu/shared';

import { CompleteDelayedCommand } from './complete-delayed.command';

@Injectable()
export class CompleteDelayed {
  constructor(
    private jobRepository: JobRepository,
    private stepRunRepository: StepRunRepository,
    private standardQueueService: StandardQueueService,
    private logger: PinoLogger
  ) {
    this.logger.setContext(this.constructor.name);
  }

  public async execute(command: CompleteDelayedCommand): Promise<boolean> {
    const stepTypeFilter = this.getStepTypeFilter(command.stepType);
    const jobsToComplete = await this.jobRepository.find({
      _environmentId: command.environmentId,
      ...this.buildCompleteQuery(command),
      status: [JobStatusEnum.DELAYED, JobStatusEnum.MERGED],
      type: stepTypeFilter,
    });

    if (!jobsToComplete.length) {
      return false;
    }

    const activeJobIds = Array.from(
      new Set(
        jobsToComplete
          .map((job) => (job.status === JobStatusEnum.MERGED ? job._mergedDigestId : job._id))
          .filter((jobId): jobId is string => Boolean(jobId))
      )
    );

    if (!activeJobIds.length) {
      return false;
    }

    const activeJobs = await this.jobRepository.find({
      _environmentId: command.environmentId,
      _id: {
        $in: activeJobIds,
      },
      status: JobStatusEnum.DELAYED,
      type: stepTypeFilter,
    });

    if (!activeJobs.length) {
      return false;
    }

    await Promise.all(
      activeJobs.map(async (job) => {
        await this.jobRepository.updateStatus(job._environmentId, job._id, JobStatusEnum.QUEUED);
        await this.stepRunRepository.create(job, {
          status: JobStatusEnum.QUEUED,
        });

        await this.standardQueueService.add({
          name: job._id,
          data: {
            _environmentId: job._environmentId,
            _id: job._id,
            _organizationId: job._organizationId,
            _userId: job._userId,
          },
          groupId: job._organizationId,
          options: {
            delay: 0,
          },
        });
      })
    );

    return true;
  }

  private buildCompleteQuery(command: CompleteDelayedCommand): Record<string, unknown> {
    if (
      !command.transactionId?.length &&
      !command.subscriberId?.length &&
      !command.workflowId &&
      !command.stepType &&
      !command.stepName &&
      !command.digestKey
    ) {
      throw new BadRequestException('At least one transaction or step filter is required');
    }

    const query: Record<string, unknown> = { };

    this.addArrayFilter(query, 'transactionId', command.transactionId);
    this.addArrayFilter(query, 'subscriberId', command.subscriberId);

    if (command.workflowId) {
      query.identifier = command.workflowId;
    }

    if (command.stepType) {
      query.type = command.stepType;
    }

    if (command.stepName) {
      query['step.name'] = command.stepName;
    }

    if (command.digestKey) {
      query['digest.digestKey'] = command.digestKey;
    }

    return query;
  }

  private getStepTypeFilter(stepType?: StepTypeEnum): StepTypeEnum | StepTypeEnum[] {
    if (!stepType) {
      return [StepTypeEnum.DIGEST, StepTypeEnum.DELAY];
    }

    return stepType;
  }

  private addArrayFilter(query: Record<string, unknown>, field: string, values?: string[]): void {
    const normalizedValues = this.getUniqueStrings(values);

    if (!normalizedValues.length) {
      return;
    }

    query[field] = normalizedValues.length === 1 ? normalizedValues[0] : { $in: normalizedValues };
  }

  private getUniqueStrings(values?: string[]): string[] {
    if (!values?.length) {
      return [];
    }

    return Array.from(new Set(values.filter(Boolean)));
  }
}
