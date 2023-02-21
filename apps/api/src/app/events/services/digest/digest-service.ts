import { Injectable } from '@nestjs/common';
import {
  NotificationRepository,
  JobRepository,
  NotificationEntity,
  NotificationStepEntity,
  JobStatusEnum,
  JobEntity,
} from '@novu/dal';
import { StepTypeEnum } from '@novu/shared';
import { get } from 'lodash';

@Injectable()
export class DigestService {
  constructor(private notificationRepository: NotificationRepository, private jobRepository: JobRepository) {}

  public async findOneAndUpdateDigest(notification: NotificationEntity, step: NotificationStepEntity) {
    const query: any = {
      status: JobStatusEnum.QUEUED,
      type: StepTypeEnum.DIGEST,
      _subscriberId: notification._subscriberId,
      _templateId: notification._templateId,
      _environmentId: notification._environmentId,
      _organizationId: notification._organizationId,
    };
    if (step.metadata?.digestKey) {
      query['payload.' + step.metadata.digestKey] = get(notification.payload, step.metadata.digestKey);
    }

    return await this.jobRepository.findOneAndUpdate(
      query,
      {
        $push: {
          digestedNotificationIds: notification._id,
        },
      },
      {
        projection: {
          _id: 1,
          digestedNotificationIds: { $slice: 1 },
        },
        upsert: true,
        new: true,
      }
    );
  }

  public async getJobsToUpdate(digestJob: JobEntity) {
    const nextJobs = await this.jobRepository.find({
      _environmentId: digestJob._environmentId,
      transactionId: digestJob.transactionId,
      _id: {
        $ne: digestJob._id,
      },
    });

    return nextJobs.filter((job) => {
      if (job.type === StepTypeEnum.IN_APP && job.status === JobStatusEnum.COMPLETED) {
        return true;
      }

      return job.status !== JobStatusEnum.COMPLETED && job.status !== JobStatusEnum.FAILED;
    });

    return nextJobs;
  }

  private async getDigestedPayload(job: JobEntity) {
    const digestIds = job.digestedNotificationIds ?? [];
    const digestedPayload =
      digestIds.length > 0
        ? await this.notificationRepository.find(
            { _id: { $in: digestIds }, _environmentId: job._environmentId },
            { payload: 1 }
          )
        : [];

    return digestedPayload.map((dp) => dp.payload);
  }

  public async getPayload(job: JobEntity) {
    const payload = job.payload ?? {};
    const digestPayload = await this.getDigestedPayload(job);
    if (digestPayload.length > 0) {
      payload.step = {
        digest: !!digestPayload?.length,
        events: digestPayload,
        total_count: digestPayload.length,
      };
    }

    return payload;
  }

  //this may happen very rarely.mostly we donot need this
  private async findAndMergeDupes(digestJob: JobEntity) {
    const matchedJobs = await this.jobRepository.find({
      _environmentId: digestJob._environmentId,
      _templateId: digestJob._templateId,
      type: StepTypeEnum.DIGEST,
      status: JobStatusEnum.QUEUED,
      _id: {
        $ne: digestJob._id,
      },
    });
    console.log('matchedJobs', matchedJobs);
    if (matchedJobs.length == 0) return;
    await this.jobRepository.update(
      {
        _environmentId: digestJob._environmentId,
        transactionId: {
          $in: matchedJobs.map((job) => job.transactionId),
        },
      },
      {
        $set: {
          status: JobStatusEnum.CANCELED,
        },
      }
    );
    for (const matchedJob of matchedJobs) {
      digestJob.digestedNotificationIds.concat(matchedJob.digestedNotificationIds); //need to check dupes
    }
    await this.jobRepository.findOneAndUpdate(
      { _id: digestJob._id },
      { digestedNotificationIds: digestJob.digestedNotificationIds }
    );
  }
}
