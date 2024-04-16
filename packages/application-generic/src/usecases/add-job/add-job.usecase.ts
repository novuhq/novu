import { forwardRef, Inject, Injectable, Logger } from '@nestjs/common';
import { JobEntity, JobRepository, JobStatusEnum } from '@novu/dal';
import {
  ExecutionDetailsSourceEnum,
  ExecutionDetailsStatusEnum,
  StepTypeEnum,
  DigestCreationResultEnum,
  DigestTypeEnum,
} from '@novu/shared';

import { AddDelayJob } from './add-delay-job.usecase';
import { MergeOrCreateDigestCommand } from './merge-or-create-digest.command';
import { MergeOrCreateDigest } from './merge-or-create-digest.usecase';
import { AddJobCommand } from './add-job.command';
import {
  ConditionsFilter,
  ConditionsFilterCommand,
  DetailEnum,
} from '../../usecases';
import {
  CalculateDelayService,
  JobsOptions,
  StandardQueueService,
} from '../../services';
import { LogDecorator } from '../../logging';
import { InstrumentUsecase } from '../../instrumentation';
import { validateDigest } from './validation';
import {
  ExecutionLogRoute,
  ExecutionLogRouteCommand,
} from '../execution-log-route';
import { ModuleRef } from '@nestjs/core';
import {
  ExecuteOutput,
  IChimeraDigestResponse,
  IUseCaseInterfaceInline,
  requireInject,
} from '../../utils/require-inject';
import { IFilterVariables } from '../../utils/filter-processing-details';

export enum BackoffStrategiesEnum {
  WEBHOOK_FILTER_BACKOFF = 'webhookFilterBackoff',
}

const LOG_CONTEXT = 'AddJob';

@Injectable()
export class AddJob {
  private chimeraConnector: IUseCaseInterfaceInline;

  constructor(
    private jobRepository: JobRepository,
    @Inject(forwardRef(() => StandardQueueService))
    private standardQueueService: StandardQueueService,
    @Inject(forwardRef(() => ExecutionLogRoute))
    private executionLogRoute: ExecutionLogRoute,
    private mergeOrCreateDigestUsecase: MergeOrCreateDigest,
    private addDelayJob: AddDelayJob,
    @Inject(forwardRef(() => CalculateDelayService))
    private calculateDelayService: CalculateDelayService,
    @Inject(forwardRef(() => ConditionsFilter))
    private conditionsFilter: ConditionsFilter,
    private moduleRef: ModuleRef
  ) {
    this.chimeraConnector = requireInject('chimera_connector', this.moduleRef);
  }

  @InstrumentUsecase()
  @LogDecorator()
  public async execute(command: AddJobCommand): Promise<void> {
    Logger.verbose('Getting Job', LOG_CONTEXT);
    const job = command.job;
    Logger.debug(`Job contents for job ${job._id}`, job, LOG_CONTEXT);

    if (!job) {
      Logger.warn(
        `Job ${job._id} was null in both the input and search`,
        LOG_CONTEXT
      );

      return;
    }

    Logger.log(
      `Scheduling New Job ${job._id} of type: ${job.type}`,
      LOG_CONTEXT
    );

    let filtered = false;
    let filterVariables: IFilterVariables | undefined;
    if (
      [StepTypeEnum.DELAY, StepTypeEnum.DIGEST].includes(
        job.type as StepTypeEnum
      )
    ) {
      const shouldRun = await this.conditionsFilter.filter(
        ConditionsFilterCommand.create({
          filters: job.step.filters || [],
          environmentId: command.environmentId,
          organizationId: command.organizationId,
          userId: command.userId,
          step: job.step,
          job,
        })
      );

      filterVariables = shouldRun.variables;
      filtered = !shouldRun.passed;
    }

    let digestAmount: number | undefined;
    let digestCreationResult: DigestCreationResultEnum | undefined;
    if (job.type === StepTypeEnum.DIGEST) {
      const chimeraResponse = await this.chimeraConnector.execute<
        AddJobCommand & { variables: IFilterVariables },
        ExecuteOutput<IChimeraDigestResponse>
      >({
        ...command,
        variables: filterVariables,
      });

      validateDigest(job);

      digestAmount = this.calculateDelayService.calculateDelay({
        stepMetadata: job.digest,
        payload: job.payload,
        overrides: job.overrides,
        // TODO: Remove fallback after other digest types are implemented.
        chimeraResponse: chimeraResponse
          ? { type: DigestTypeEnum.REGULAR, ...chimeraResponse.outputs }
          : undefined,
      });

      Logger.debug(`Digest step amount is: ${digestAmount}`, LOG_CONTEXT);

      digestCreationResult = await this.mergeOrCreateDigestUsecase.execute(
        MergeOrCreateDigestCommand.create({
          job,
          filtered,
          chimeraData: chimeraResponse?.outputs,
        })
      );

      if (digestCreationResult === DigestCreationResultEnum.MERGED) {
        Logger.log('Digest was merged, queueing next job', LOG_CONTEXT);

        return;
      }

      if (digestCreationResult === DigestCreationResultEnum.SKIPPED) {
        const nextJobToSchedule = await this.jobRepository.findOne({
          _environmentId: command.environmentId,
          _parentId: job._id,
        });

        if (!nextJobToSchedule) {
          return;
        }

        await this.execute({
          userId: job._userId,
          environmentId: job._environmentId,
          organizationId: command.organizationId,
          jobId: nextJobToSchedule._id,
          job: nextJobToSchedule,
        });

        return;
      }
    }

    let delayAmount: number | undefined = undefined;

    if (job.type === StepTypeEnum.DELAY) {
      const chimeraResponse = await this.chimeraConnector.execute<
        AddJobCommand & { variables: IFilterVariables },
        ExecuteOutput<IChimeraDigestResponse>
      >({
        ...command,
        variables: filterVariables,
      });

      command.chimeraResponse = chimeraResponse;
      delayAmount = await this.addDelayJob.execute(command);

      Logger.debug(`Delay step Amount is: ${delayAmount}`, LOG_CONTEXT);

      if (delayAmount === undefined) {
        Logger.warn(
          `Delay  Amount does not exist on a delay job ${job._id}`,
          LOG_CONTEXT
        );

        return;
      }
    }

    if (digestAmount === undefined && delayAmount === undefined) {
      Logger.verbose(
        `Updating status to queued for job ${job._id}`,
        LOG_CONTEXT
      );
      await this.jobRepository.updateStatus(
        command.environmentId,
        job._id,
        JobStatusEnum.QUEUED
      );
    }

    await this.executionLogRoute.execute(
      ExecutionLogRouteCommand.create({
        ...ExecutionLogRouteCommand.getDetailsFromJob(job),
        detail: DetailEnum.STEP_QUEUED,
        source: ExecutionDetailsSourceEnum.INTERNAL,
        status: ExecutionDetailsStatusEnum.PENDING,
        isTest: false,
        isRetry: false,
      })
    );

    const delay = filtered ? 0 : digestAmount ?? delayAmount;

    if ((digestAmount || delayAmount) && filtered) {
      Logger.verbose(
        `Delay for job ${job._id} will be 0 because job was filtered`,
        LOG_CONTEXT
      );
    }

    await this.queueJob(job, delay);
  }

  public async queueJob(job: JobEntity, delay: number) {
    Logger.verbose(`Adding Job ${job._id} to Queue`, LOG_CONTEXT);
    const stepContainsWebhookFilter = this.stepContainsFilter(job, 'webhook');
    const options: JobsOptions = {
      delay,
    };
    if (stepContainsWebhookFilter) {
      options.backoff = {
        type: BackoffStrategiesEnum.WEBHOOK_FILTER_BACKOFF,
      };
      options.attempts = this.standardQueueService.DEFAULT_ATTEMPTS;
    }

    const jobData = {
      _environmentId: job._environmentId,
      _id: job._id,
      _organizationId: job._organizationId,
      _userId: job._userId,
    };

    Logger.verbose(
      jobData,
      'Going to add a minimal job in Standard Queue',
      LOG_CONTEXT
    );

    await this.standardQueueService.add({
      name: job._id,
      data: jobData,
      groupId: job._organizationId,
      options: options,
    });

    if (delay) {
      const logMessage =
        job.type === StepTypeEnum.DELAY
          ? 'Delay is active, Creating execution details'
          : job.type === StepTypeEnum.DIGEST
          ? 'Digest is active, Creating execution details'
          : 'Unexpected job type, Creating execution details';

      Logger.verbose(logMessage, LOG_CONTEXT);

      await this.executionLogRoute.execute(
        ExecutionLogRouteCommand.create({
          ...ExecutionLogRouteCommand.getDetailsFromJob(job),
          detail:
            job.type === StepTypeEnum.DELAY
              ? DetailEnum.STEP_DELAYED
              : DetailEnum.STEP_DIGESTED,
          source: ExecutionDetailsSourceEnum.INTERNAL,
          status: ExecutionDetailsStatusEnum.PENDING,
          isTest: false,
          isRetry: false,
          raw: JSON.stringify({ delay }),
        })
      );
    }
  }

  private stepContainsFilter(job: JobEntity, onFilter: string) {
    return job.step.filters?.some((filter) => {
      return filter.children?.some((child) => {
        return child.on === onFilter;
      });
    });
  }
}
