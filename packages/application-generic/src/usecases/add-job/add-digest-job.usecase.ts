import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { JobEntity, JobRepository } from '@novu/dal';
import {
  ExecutionDetailsSourceEnum,
  ExecutionDetailsStatusEnum,
  IDigestBaseMetadata,
  IDigestRegularMetadata,
  JobStatusEnum,
} from '@novu/shared';

import { AddDigestJobCommand } from './add-digest-job.command';
import { ApiException } from '../../utils/exceptions';
import {
  EventsDistributedLockService,
  CalculateDelayService,
} from '../../services';
import { DigestFilterSteps } from '../digest-filter-steps';
import {
  DetailEnum,
  CreateExecutionDetailsCommand,
  CreateExecutionDetails,
} from '../create-execution-details';
import { Instrument, InstrumentUsecase } from '../../instrumentation';
import { validateDigest } from './validation';

interface IFindAndUpdateResponse {
  matched: number;
  modified: number;
}

type AddDigestJobResult = number | undefined;

@Injectable()
export class AddDigestJob {
  constructor(
    @Inject(forwardRef(() => EventsDistributedLockService))
    private eventsDistributedLockService: EventsDistributedLockService,
    private jobRepository: JobRepository,
    protected createExecutionDetails: CreateExecutionDetails,
    @Inject(forwardRef(() => CalculateDelayService))
    private calculateDelayService: CalculateDelayService
  ) {}

  @InstrumentUsecase()
  public async execute(
    command: AddDigestJobCommand
  ): Promise<AddDigestJobResult> {
    const { job } = command;

    validateDigest(job);

    return await this.shouldDelayDigestOrMerge(job);
  }

  @Instrument()
  private async shouldDelayDigestOrMerge(
    job: JobEntity
  ): Promise<AddDigestJobResult> {
    const digestMeta = job.digest as IDigestBaseMetadata | undefined;
    const digestKey = digestMeta?.digestKey;
    const digestValue = DigestFilterSteps.getNestedValue(
      job.payload,
      digestKey
    );

    const { matched, modified } = await this.shouldDelayDigestOrMergeWithLock(
      job,
      digestKey,
      digestValue
    );

    // We merged the digest job as there was an existing delayed digest job for this subscriber and template in the same time frame
    if (matched > 0 && modified === 0) {
      await this.jobRepository.update(
        {
          _environmentId: job._environmentId,
          _id: job._id,
        },
        {
          $set: {
            status: JobStatusEnum.MERGED,
          },
        }
      );

      await this.jobRepository.updateAllChildJobStatus(
        job,
        JobStatusEnum.MERGED
      );

      await this.digestMergedExecutionDetails(job);

      return undefined;
    }

    // We delayed the job and created the digest
    if (matched === 0 && modified === 1) {
      const regularDigestMeta = digestMeta as
        | IDigestRegularMetadata
        | undefined;
      if (!regularDigestMeta?.amount || !regularDigestMeta?.unit) {
        throw new ApiException(
          `Somehow ${job._id} had wrong digest settings and escaped validation`
        );
      }

      return this.calculateDelayService.calculateDelay({
        stepMetadata: job.digest,
        payload: job.payload,
        overrides: job.overrides,
      });
    }

    return undefined;
  }

  private async shouldDelayDigestOrMergeWithLock(
    job: JobEntity,
    digestKey?: string,
    digestValue?: string | number
  ): Promise<IFindAndUpdateResponse> {
    const TTL = 1500;
    let resource = `environment:${job._environmentId}:template:${job._templateId}:subscriber:${job._subscriberId}`;
    if (digestKey && digestValue) {
      resource = `${resource}:digestKey:${digestKey}:digestValue:${digestValue}`;
    }

    const shouldDelayDigestJobOrMerge = async () =>
      this.jobRepository.shouldDelayDigestJobOrMerge(
        job,
        digestKey,
        digestValue
      );

    const result =
      await this.eventsDistributedLockService.applyLock<IFindAndUpdateResponse>(
        {
          resource,
          ttl: TTL,
        },
        shouldDelayDigestJobOrMerge
      );

    return result;
  }

  private async digestMergedExecutionDetails(job: JobEntity): Promise<void> {
    await this.createExecutionDetails.execute(
      CreateExecutionDetailsCommand.create({
        ...CreateExecutionDetailsCommand.getDetailsFromJob(job),
        detail: DetailEnum.DIGEST_MERGED,
        source: ExecutionDetailsSourceEnum.INTERNAL,
        status: ExecutionDetailsStatusEnum.SUCCESS,
        isTest: false,
        isRetry: false,
      })
    );
  }
}
