import { Injectable } from '@nestjs/common';
import { JobStatusEnum, JobRepository, JobEntity } from '@novu/dal';
import { StepTypeEnum } from '@novu/shared';
import { CancelDelayedCommand } from './cancel-delayed.command';
import { isMainDigest } from '@novu/application-generic/build/main/utils/digest';

type PartialJob = Pick<JobEntity, '_id' | 'type' | 'status' | '_environmentId' | '_subscriberId'>;
@Injectable()
export class CancelDelayed {
  constructor(private jobRepository: JobRepository) {}

  public async execute(command: CancelDelayedCommand): Promise<boolean> {
    const transactionJobs: PartialJob[] = await this.jobRepository.find(
      {
        _environmentId: command.environmentId,
        transactionId: command.transactionId,
        status: [JobStatusEnum.DELAYED, JobStatusEnum.MERGED, JobStatusEnum.PENDING],
      },
      '_id type status _environmentId _subscriberId'
    );

    if (!transactionJobs?.length) {
      return false;
    }

    await this.jobRepository.update(
      {
        _environmentId: command.environmentId,
        _id: {
          $in: transactionJobs.map((job) => job._id),
        },
      },
      {
        $set: {
          status: JobStatusEnum.CANCELED,
        },
      }
    );

    const mainDigestJob = transactionJobs.find((job) => isMainDigest(job.type, job.status));

    if (!mainDigestJob) {
      return true;
    }

    return await this.scheduleNextDigestJob(mainDigestJob);
  }

  private async scheduleNextDigestJob(job: PartialJob) {
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
