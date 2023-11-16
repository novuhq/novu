import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { JobStatusEnum, JobRepository, JobEntity } from '@novu/dal';
import { DelayTypeEnum, DigestTypeEnum, StepTypeEnum } from '@novu/shared';
import { CancelDelayedCommand } from './cancel-delayed.command';
import { differenceInMilliseconds } from 'date-fns';
import { AddJob, CalculateDelayService } from '@novu/application-generic';

@Injectable()
export class CancelDelayed {
  constructor(
    private jobRepository: JobRepository,
    private addJob: AddJob,
    @Inject(forwardRef(() => CalculateDelayService))
    private calculateDelayService: CalculateDelayService
  ) {}

  public async execute(command: CancelDelayedCommand): Promise<boolean> {
    const jobs = await this.jobRepository.find(
      {
        _environmentId: command.environmentId,
        transactionId: command.transactionId,
        status: [JobStatusEnum.DELAYED, JobStatusEnum.MERGED],
      },
      '_id'
    );

    if (!jobs?.length) {
      return false;
    }

    await this.jobRepository.update(
      {
        _environmentId: command.environmentId,
        _id: {
          $in: jobs.map((job) => job._id),
        },
      },
      {
        $set: {
          status: JobStatusEnum.CANCELED,
        },
      }
    );

    const digestJob = jobs.find((job) => job.type === StepTypeEnum.DIGEST && job.status === JobStatusEnum.DELAYED);

    if (digestJob) {
      return await this.scheduleNextDigestJob(digestJob);
    }

    return true;
  }

  private async scheduleNextDigestJob(job: JobEntity) {
    const jobs = await this.jobRepository.find(
      {
        _mergedDigestId: job._id,
        status: JobStatusEnum.MERGED,
        type: StepTypeEnum.DIGEST,
        _environmentId: job._environmentId,
        _subscriberId: job._subscriberId,
      },
      '',
      {
        sort: { createdAt: 1 },
        limit: 1,
      }
    );
    const newJob = jobs[0];

    if (!newJob) {
      return false;
    }

    let digestAmount = this.calculateDelayService.calculateDelay({
      stepMetadata: job.digest,
      payload: job.payload,
      overrides: job.overrides,
    });

    await this.jobRepository.update(
      {
        _environmentId: job._environmentId,
        status: JobStatusEnum.DELAYED,
        _mergedDigestId: job._id,
      },
      {
        $set: {
          status: JobStatusEnum.DELAYED,
          _mergedDigestId: newJob._id,
        },
      }
    );

    await this.jobRepository.update(
      {
        _environmentId: job._environmentId,
        _id: job._id,
      },
      {
        $set: {
          status: JobStatusEnum.MERGED,
          _mergedDigestId: null,
        },
      }
    );

    await this.jobRepository.updateAllChildJobStatus(newJob, JobStatusEnum.PENDING, newJob._id);

    if (![DelayTypeEnum.SCHEDULED, DigestTypeEnum.TIMED].includes(job.digest?.type as any)) {
      digestAmount = digestAmount - differenceInMilliseconds(new Date(), new Date(job.updatedAt));
    }

    await this.addJob.queueJob(newJob, digestAmount);

    return true;
  }
}
