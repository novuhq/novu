import { Injectable } from '@nestjs/common';
import { JobRepository, JobEntity } from '@novu/dal';
import { ChannelTypeEnum } from '@novu/shared';

@Injectable()
export abstract class GetDigestEvents {
  constructor(protected jobRepository: JobRepository) {}

  protected async filterJobs(currentJob: JobEntity, transactionId: string, jobs: JobEntity[]) {
    const batchValue = currentJob?.payload ? currentJob.payload[currentJob?.digest?.digestKey] : undefined;
    if (batchValue) {
      jobs = jobs.filter((job) => {
        return job.payload[currentJob.digest.digestKey] === batchValue;
      });
    }

    const currentTrigger = await this.jobRepository.findOne({
      transactionId: transactionId,
      type: ChannelTypeEnum.TRIGGER,
    });

    return [currentJob.payload, ...jobs.filter((job) => job._id !== currentTrigger._id).map((job) => job.payload)];
  }
}
