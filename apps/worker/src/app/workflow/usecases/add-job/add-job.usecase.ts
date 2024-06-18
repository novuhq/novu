import { forwardRef, Inject, Injectable, Logger } from '@nestjs/common';
import { parseExpression as parseCronExpression } from 'cron-parser';
import { differenceInMilliseconds } from 'date-fns';

import { JobEntity, JobRepository, JobStatusEnum } from '@novu/dal';
import {
  castUnitToDigestUnitEnum,
  DigestCreationResultEnum,
  DigestTypeEnum,
  ExecutionDetailsSourceEnum,
  ExecutionDetailsStatusEnum,
  IWorkflowStepMetadata,
  StepTypeEnum,
} from '@novu/shared';

import { AddDelayJob } from './add-delay-job.usecase';
import { MergeOrCreateDigestCommand } from './merge-or-create-digest.command';
import { MergeOrCreateDigest } from './merge-or-create-digest.usecase';
import { AddJobCommand } from './add-job.command';
import { validateDigest } from './validation';
import { ModuleRef } from '@nestjs/core';
import {
  ComputeJobWaitDurationService,
  ConditionsFilter,
  ConditionsFilterCommand,
  DetailEnum,
  ExecutionLogRoute,
  ExecutionLogRouteCommand,
  IBridgeDigestResponse,
  IFilterVariables,
  InstrumentUsecase,
  IUseCaseInterfaceInline,
  JobsOptions,
  LogDecorator,
  requireInject,
  StandardQueueService,
  ExecuteOutput,
  NormalizeVariablesCommand,
  NormalizeVariables,
  getDigestType,
} from '@novu/application-generic';

export enum BackoffStrategiesEnum {
  WEBHOOK_FILTER_BACKOFF = 'webhookFilterBackoff',
}

const LOG_CONTEXT = 'AddJob';

@Injectable()
export class AddJob {
  private resonateUsecase: IUseCaseInterfaceInline;

  constructor(
    private jobRepository: JobRepository,
    @Inject(forwardRef(() => StandardQueueService))
    private standardQueueService: StandardQueueService,
    @Inject(forwardRef(() => ExecutionLogRoute))
    private executionLogRoute: ExecutionLogRoute,
    private mergeOrCreateDigestUsecase: MergeOrCreateDigest,
    private addDelayJob: AddDelayJob,
    @Inject(forwardRef(() => ComputeJobWaitDurationService))
    private computeJobWaitDurationService: ComputeJobWaitDurationService,
    @Inject(forwardRef(() => ConditionsFilter))
    private conditionsFilter: ConditionsFilter,
    private normalizeVariablesUsecase: NormalizeVariables,
    private moduleRef: ModuleRef
  ) {
    this.resonateUsecase = requireInject('resonate', this.moduleRef);
  }

  @InstrumentUsecase()
  @LogDecorator()
  public async execute(command: AddJobCommand): Promise<void> {
    Logger.verbose('Getting Job', LOG_CONTEXT);
    const job = command.job;
    Logger.debug(`Job contents for job ${job._id}`, job, LOG_CONTEXT);

    if (!job) {
      Logger.warn(`Job was null in both the input and search`, LOG_CONTEXT);

      return;
    }

    Logger.log(`Scheduling New Job ${job._id} of type: ${job.type}`, LOG_CONTEXT);

    if (isJobDeferredType(job.type)) {
      await this.executeDeferredJob(command);
    } else {
      await this.executeNoneDeferredJob(command);
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
  }

  private async executeDeferredJob(command: AddJobCommand): Promise<void> {
    const job = command.job;

    let digestAmount: number | undefined;
    let delayAmount: number | undefined = undefined;

    const variables = await this.normalizeVariablesUsecase.execute(
      NormalizeVariablesCommand.create({
        filters: command.job.step.filters || [],
        environmentId: command.environmentId,
        organizationId: command.organizationId,
        userId: command.userId,
        step: job.step,
        job: job,
      })
    );

    const shouldRun = await this.conditionsFilter.filter(
      ConditionsFilterCommand.create({
        filters: job.step.filters || [],
        environmentId: command.environmentId,
        organizationId: command.organizationId,
        userId: command.userId,
        step: job.step,
        job,
        variables,
      })
    );

    const filterVariables = shouldRun.variables;
    const filtered = !shouldRun.passed;

    if (job.type === StepTypeEnum.DIGEST) {
      const digestResult = await this.handleDigest(command, filterVariables, job, digestAmount, filtered);

      if (isShouldHaltJobExecution(digestResult.digestCreationResult)) {
        return;
      }

      digestAmount = digestResult.digestAmount;
    }

    if (job.type === StepTypeEnum.DELAY) {
      delayAmount = await this.handleDelay(command, filterVariables, delayAmount);

      if (delayAmount === undefined) {
        Logger.warn(`Delay  Amount does not exist on a delay job ${job._id}`, LOG_CONTEXT);

        return;
      }
    }

    if ((digestAmount || delayAmount) && filtered) {
      Logger.verbose(`Delay for job ${job._id} will be 0 because job was filtered`, LOG_CONTEXT);
    }

    const delay = this.getExecutionDelayAmount(filtered, digestAmount, delayAmount);

    await this.queueJob(job, delay);
  }

  private async executeNoneDeferredJob(command: AddJobCommand): Promise<void> {
    const job = command.job;

    Logger.verbose(`Updating status to queued for job ${job._id}`, LOG_CONTEXT);
    await this.jobRepository.updateStatus(command.environmentId, job._id, JobStatusEnum.QUEUED);

    await this.queueJob(job, 0);
  }

  private async handleDelay(
    command: AddJobCommand,
    filterVariables: IFilterVariables,
    delayAmount: number | undefined
  ) {
    await this.fetchResonateData(command, filterVariables);
    delayAmount = await this.addDelayJob.execute(command);

    Logger.debug(`Delay step Amount is: ${delayAmount}`, LOG_CONTEXT);

    return delayAmount;
  }

  private async fetchResonateData(command: AddJobCommand, filterVariables: IFilterVariables) {
    const response = await this.resonateUsecase.execute<
      AddJobCommand & { variables: IFilterVariables },
      ExecuteOutput<IBridgeDigestResponse> | null
    >({
      ...command,
      variables: filterVariables,
    });

    if (!response) {
      return null;
    }

    const digestType = getDigestType(response.outputs);

    const jobDigest = {
      type: digestType,
      amount: response?.outputs?.amount,
      digestKey: response?.outputs?.digestKey,
      unit: response.outputs.unit ? castUnitToDigestUnitEnum(response?.outputs?.unit) : undefined,
      timed: { cronExpression: response?.outputs?.cron },
      backoff: digestType === DigestTypeEnum.BACKOFF,
      backoffAmount: response.outputs.lookBackWindow?.amount,
      backoffUnit: response.outputs.lookBackWindow?.unit
        ? castUnitToDigestUnitEnum(response.outputs.lookBackWindow.unit)
        : undefined,
    };

    await this.jobRepository.updateOne(
      {
        _id: command.job._id,
        _environmentId: command.environmentId,
      },
      {
        $set: {
          'digest.type': jobDigest.type,
          'digest.digestKey': jobDigest.digestKey,
          'digest.amount': jobDigest.amount,
          'digest.unit': jobDigest.unit,
          'digest.timed.cronExpression': jobDigest.timed.cronExpression,
          'digest.backoff': jobDigest.backoff,
          'digest.backoffAmount': jobDigest.backoffAmount,
          'digest.backoffUnit': jobDigest.backoffUnit,
        },
      }
    );

    // Update the job digest directly to avoid an extra database call
    command.job.digest = { ...command.job.digest, ...jobDigest } as IWorkflowStepMetadata;

    return response;
  }

  private async handleDigest(
    command: AddJobCommand,
    filterVariables: IFilterVariables,
    job,
    digestAmount: number | undefined,
    filtered: boolean
  ) {
    const resonateResponse = await this.fetchResonateData(command, filterVariables);

    const bridgeAmount = this.mapBridgeTimedDigestAmount(resonateResponse);

    validateDigest(job);

    digestAmount =
      bridgeAmount ??
      this.computeJobWaitDurationService.calculateDelay({
        stepMetadata: job.digest,
        payload: job.payload,
        overrides: job.overrides,
      });

    Logger.debug(`Digest step amount is: ${digestAmount}`, LOG_CONTEXT);

    const digestCreationResult = await this.mergeOrCreateDigestUsecase.execute(
      MergeOrCreateDigestCommand.create({
        job,
        filtered,
      })
    );

    if (digestCreationResult === DigestCreationResultEnum.MERGED) {
      this.handleDigestMerged();
    }

    if (digestCreationResult === DigestCreationResultEnum.SKIPPED) {
      await this.handleDigestSkip(command, job);
    }

    return { digestAmount, digestCreationResult };
  }

  private mapBridgeTimedDigestAmount(resonateResponse: ExecuteOutput<IBridgeDigestResponse> | null) {
    let bridgeAmount: number | undefined = undefined;

    if (!resonateResponse?.outputs?.cron) {
      return undefined;
    }

    if (getDigestType(resonateResponse.outputs) !== DigestTypeEnum.TIMED) {
      return undefined;
    }

    const bridgeAmountExpression = parseCronExpression(resonateResponse?.outputs?.cron);
    const bridgeAmountDate = bridgeAmountExpression.next();
    bridgeAmount = differenceInMilliseconds(bridgeAmountDate.toDate(), new Date());

    return bridgeAmount;
  }

  private handleDigestMerged() {
    Logger.log('Digest was merged, queueing next job', LOG_CONTEXT);

    return;
  }

  private async handleDigestSkip(command: AddJobCommand, job) {
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

  private getExecutionDelayAmount(
    filtered: boolean,
    digestAmount: number | undefined,
    delayAmount: undefined | number
  ) {
    return (filtered ? 0 : digestAmount ?? delayAmount) ?? 0;
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

    Logger.verbose(jobData, 'Going to add a minimal job in Standard Queue', LOG_CONTEXT);

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
          detail: job.type === StepTypeEnum.DELAY ? DetailEnum.STEP_DELAYED : DetailEnum.STEP_DIGESTED,
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

function isJobDeferredType(jobType: StepTypeEnum | undefined) {
  if (!jobType) return false;

  return [StepTypeEnum.DELAY, StepTypeEnum.DIGEST].includes(jobType);
}

function isShouldHaltJobExecution(digestCreationResult: DigestCreationResultEnum) {
  return [DigestCreationResultEnum.MERGED, DigestCreationResultEnum.SKIPPED].includes(digestCreationResult);
}
