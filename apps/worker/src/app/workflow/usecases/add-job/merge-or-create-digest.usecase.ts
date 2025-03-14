import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { IDelayOrDigestJobResult, JobEntity, JobRepository, NotificationRepository } from '@novu/dal';
import {
  DigestCreationResultEnum,
  DigestTypeEnum,
  ExecutionDetailsSourceEnum,
  ExecutionDetailsStatusEnum,
  IDigestBaseMetadata,
  IDigestRegularMetadata,
  IDigestTimedMetadata,
  JobStatusEnum,
} from '@novu/shared';
import {
  ApiException,
  CreateExecutionDetails,
  CreateExecutionDetailsCommand,
  DetailEnum,
  Instrument,
  InstrumentUsecase,
  RetryOnError,
} from '@novu/application-generic';
import { isBefore } from 'date-fns';
import { MergeOrCreateDigestCommand } from './merge-or-create-digest.command';

type MergeOrCreateDigestResultType = DigestCreationResultEnum;

@Injectable()
export class MergeOrCreateDigest {
  constructor(
    private jobRepository: JobRepository,
    @Inject(forwardRef(() => CreateExecutionDetails))
    private createExecutionDetails: CreateExecutionDetails,
    private notificationRepository: NotificationRepository
  ) {}

  @InstrumentUsecase()
  public async execute(command: MergeOrCreateDigestCommand): Promise<MergeOrCreateDigestResultType> {
    const { job } = command;

    const digestMeta = job.digest as IDigestBaseMetadata;
    const digestAction = command.filtered
      ? { digestResult: DigestCreationResultEnum.SKIPPED }
      : await this.computeDigestLogicBasedOnExistingDigestState(job, digestMeta);

    switch (digestAction.digestResult) {
      case DigestCreationResultEnum.MERGED: {
        if (!digestAction.activeDigestId || !digestAction.activeNotificationId) {
          throw new ApiException(
            `Active digest or notification id is missing, active digest id ${digestAction.activeDigestId},` +
              `active notification id ${digestAction.activeNotificationId}`
          );
        }

        return await this.processMergedDigest(job, digestAction.activeDigestId, digestAction.activeNotificationId);
      }
      case DigestCreationResultEnum.SKIPPED:
        return await this.processSkippedDigest(job, command.filtered);
      case DigestCreationResultEnum.CREATED:
        return await this.processCreatedDigest(digestMeta as IDigestBaseMetadata, job);
      default:
        throw new ApiException('Something went wrong with digest creation');
    }
  }

  @Instrument()
  private async processCreatedDigest(
    digestMeta: IDigestBaseMetadata | undefined,
    job: JobEntity
  ): Promise<DigestCreationResultEnum> {
    if ((digestMeta as unknown as IDigestTimedMetadata)?.timed?.cronExpression) {
      return DigestCreationResultEnum.CREATED;
    }

    const regularDigestMeta = digestMeta as IDigestRegularMetadata | undefined;
    if (!regularDigestMeta?.amount || !regularDigestMeta?.unit) {
      throw new ApiException(`Somehow ${job._id} had wrong digest settings and escaped validation`);
    }

    return DigestCreationResultEnum.CREATED;
  }

  @Instrument()
  private async processMergedDigest(
    job: JobEntity,
    activeDigestId: string,
    activeNotificationId: string
  ): Promise<DigestCreationResultEnum> {
    await Promise.all([
      this.jobRepository.update(
        {
          _environmentId: job._environmentId,
          _id: job._id,
        },
        {
          $set: {
            status: JobStatusEnum.MERGED,
            _mergedDigestId: activeDigestId,
          },
        }
      ),
      this.jobRepository.updateAllChildJobStatus(job, JobStatusEnum.MERGED, activeDigestId),
      this.digestMergedExecutionDetails(job),
      this.notificationRepository.update(
        {
          _environmentId: job._environmentId,
          _id: job._notificationId,
        },
        {
          $set: {
            _digestedNotificationId: activeNotificationId,
          },
        }
      ),
    ]);

    return DigestCreationResultEnum.MERGED;
  }

  @Instrument()
  private async processSkippedDigest(job: JobEntity, filtered = false): Promise<DigestCreationResultEnum> {
    await Promise.all([
      this.jobRepository.update(
        {
          _environmentId: job._environmentId,
          _id: job._id,
        },
        {
          $set: {
            status: JobStatusEnum.SKIPPED,
          },
        }
      ),
      this.digestSkippedExecutionDetails(job, filtered),
    ]);

    return DigestCreationResultEnum.SKIPPED;
  }

  @RetryOnError('MongoServerError', {
    maxRetries: 3,
    delay: 500,
  })
  private async computeDigestLogicBasedOnExistingDigestState(
    job: JobEntity,
    digestMeta?: IDigestBaseMetadata
  ): Promise<IDelayOrDigestJobResult> {
    if (this.isBackOffDigestType(job, digestMeta)) {
      return await this.backoffLogic(job, digestMeta);
    }

    return await this.isMasterDigestOrShouldMergeToExisting(job, digestMeta);
  }

  private async isMasterDigestOrShouldMergeToExisting(job: JobEntity, digestMeta: IDigestBaseMetadata | undefined) {
    const delayedDigestJob = await this.jobRepository.getExistingDelayedJobWithTheSameDigestValue(job, digestMeta);
    if (!delayedDigestJob) {
      await this.jobRepository.markJobAsDigestMaster(job);

      return {
        activeDigestId: job._id,
        digestResult: DigestCreationResultEnum.CREATED,
      };
    }

    return {
      activeDigestId: delayedDigestJob._id,
      activeNotificationId: delayedDigestJob._notificationId?.toString(),
      digestResult: DigestCreationResultEnum.MERGED,
    };
  }

  private isBackOffDigestType(job: JobEntity, digestMeta?: IDigestBaseMetadata): digestMeta is IDigestRegularMetadata {
    return !!(
      job.digest?.type === DigestTypeEnum.BACKOFF ||
      (job.digest as IDigestRegularMetadata)?.backoff ||
      (digestMeta && 'backoff' in digestMeta && digestMeta?.backoff)
    );
  }

  private getEarliestJobUpdateDate(jobs: JobEntity[] | undefined): JobEntity | null {
    if (!jobs || jobs.length === 0) {
      return null;
    }

    return jobs.reduce((earliestJob, currentJob) => {
      const earliestDate = new Date(earliestJob.createdAt);
      const currentDate = new Date(currentJob.createdAt);

      return currentDate < earliestDate ? currentJob : earliestJob;
    });
  }

  private async backoffLogic(job: JobEntity, digestMeta?: IDigestRegularMetadata) {
    const otherJobsWithSameDigest = await this.jobRepository.getAnotherJobTriggeredWithinBackoffTime(job, digestMeta);
    const earliestOtherJobDate = this.getEarliestJobUpdateDate(otherJobsWithSameDigest);
    if (!earliestOtherJobDate) {
      return {
        digestResult: DigestCreationResultEnum.SKIPPED,
      };
    }
    const isMyJobBefore = isBefore(new Date(job.createdAt), new Date(earliestOtherJobDate.createdAt));

    if (isMyJobBefore) {
      return {
        digestResult: DigestCreationResultEnum.SKIPPED,
      };
    }

    return await this.isMasterDigestOrShouldMergeToExisting(job, digestMeta);
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

  private async digestSkippedExecutionDetails(job: JobEntity, filtered: boolean): Promise<void> {
    await this.createExecutionDetails.execute(
      CreateExecutionDetailsCommand.create({
        ...CreateExecutionDetailsCommand.getDetailsFromJob(job),
        detail: filtered ? DetailEnum.FILTER_STEPS : DetailEnum.DIGEST_SKIPPED,
        source: ExecutionDetailsSourceEnum.INTERNAL,
        status: ExecutionDetailsStatusEnum.SUCCESS,
        isTest: false,
        isRetry: false,
      })
    );
  }
}
