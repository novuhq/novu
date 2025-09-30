import { Injectable } from '@nestjs/common';
import {
  isActionStepType,
  isMainDigest,
  StepRunRepository,
} from '@novu/application-generic';
import { JobEntity, JobRepository, JobStatusEnum } from '@novu/dal';
import { StepTypeEnum } from '@novu/shared';

import { CancelDelayedCommand } from './cancel-delayed.command';

@Injectable()
export class CancelDelayed {
  constructor(
    private jobRepository: JobRepository,
    private stepRunRepository: StepRunRepository,
  ) {}

  public async execute(command: CancelDelayedCommand): Promise<boolean> {
    let jobs: JobEntity[] = await this.jobRepository.find({
      _environmentId: command.environmentId,
      transactionId: command.transactionId,
      status: [JobStatusEnum.DELAYED, JobStatusEnum.MERGED],
    });

    if (!jobs?.length) {
      return false;
    }

    if (jobs.find((job) => job.type && isActionStepType(job.type))) {
      const possiblePendingJobs: JobEntity[] = await this.jobRepository.find({
        _environmentId: command.environmentId,
        transactionId: command.transactionId,
        status: [JobStatusEnum.PENDING],
      });

      jobs = [...jobs, ...possiblePendingJobs];
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

    await this.stepRunRepository.createMany(jobs, {
      status: JobStatusEnum.CANCELED,
    });

    const mainDigestJob = jobs.find((job) => isMainDigest(job.type, job.status));

    if (!mainDigestJob) {
      return true;
    }

    return await this.assignNextDigestJob(mainDigestJob);
  }

  private async assignNextDigestJob(job: JobEntity) {
    const mainFollowerDigestJob = await this.jobRepository.findOne(
      {
        _mergedDigestId: job._id,
        status: JobStatusEnum.MERGED,
        type: StepTypeEnum.DIGEST,
        _environmentId: job._environmentId,
        _subscriberId: job._subscriberId,
      },
      '',
      {
        query: { sort: { createdAt: 1 } },
      }
    );

    // meaning that only one trigger was send, and it was cancelled in the CancelDelayed.execute
    if (!mainFollowerDigestJob) {
      return true;
    }

    await this.stepRunRepository.create(mainFollowerDigestJob, {
      status: JobStatusEnum.DELAYED,
    });

    // update new main follower from Merged to Delayed
    await this.jobRepository.update(
      {
        _environmentId: job._environmentId,
        status: JobStatusEnum.MERGED,
        _id: mainFollowerDigestJob._id,
      },
      {
        $set: {
          status: JobStatusEnum.DELAYED,
          _mergedDigestId: null,
        },
      }
    );

    // update all main follower children jobs to pending status
    await this.jobRepository.updateAllChildJobStatus(
      mainFollowerDigestJob,
      JobStatusEnum.PENDING,
      mainFollowerDigestJob._id
    );

    // update all jobs that were merged into the old main digest job to point to the new follower
    await this.jobRepository.update(
      {
        _environmentId: job._environmentId,
        status: JobStatusEnum.MERGED,
        _mergedDigestId: job._id,
      },
      {
        $set: {
          _mergedDigestId: mainFollowerDigestJob._id,
        },
      }
    );

    return true;
  }
}
