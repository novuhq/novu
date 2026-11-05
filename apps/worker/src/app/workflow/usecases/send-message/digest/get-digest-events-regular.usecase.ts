import { Injectable } from '@nestjs/common';
import { CreateExecutionDetails, getJobDigest, InstrumentUsecase, StepRunV2Writer } from '@novu/application-generic';
import { JobRepository } from '@novu/dal';
import { IDigestBaseMetadata } from '@novu/shared';
import { sub } from 'date-fns';

import { DigestEventsCommand } from './digest-events.command';
import { GetDigestEvents } from './get-digest-events.usecase';

@Injectable()
export class GetDigestEventsRegular extends GetDigestEvents {
  constructor(
    jobRepository: JobRepository,
    createExecutionDetails: CreateExecutionDetails,
    private stepRunV2Writer: StepRunV2Writer
  ) {
    super(jobRepository, createExecutionDetails);
  }

  @InstrumentUsecase()
  public async execute(command: DigestEventsCommand) {
    const { currentJob } = command;

    const { digestKey, digestMeta, digestValue } = getJobDigest(currentJob);
    const amount = this.castAmount(digestMeta);
    const unit = digestMeta?.unit;

    const subtractedTime =
      digestMeta && unit
        ? {
            [unit]: amount,
          }
        : {};
    const earliest = sub(new Date(currentJob.createdAt), subtractedTime);

    const { triggers, completedDigestJobIds } = await this.jobRepository.findJobsToDigest(
      earliest,
      currentJob._templateId,
      currentJob._environmentId,
      command._subscriberId,
      digestKey,
      digestValue
    );
    this.stepRunV2Writer.writeByIds({
      environmentId: currentJob._environmentId,
      organizationId: currentJob._organizationId,
      jobIds: completedDigestJobIds,
    });

    return this.filterJobs(currentJob, currentJob.transactionId, triggers);
  }

  private castAmount(digestMeta: IDigestBaseMetadata | undefined): number | undefined {
    let amount: number | undefined;

    if (typeof digestMeta?.amount === 'number') {
      amount = digestMeta.amount;
    }

    if (typeof digestMeta?.amount === 'string') {
      amount = parseInt(digestMeta.amount, 10);
    }

    return amount;
  }
}
