import { forwardRef, Inject, Injectable, Logger } from '@nestjs/common';
import {
  ComputeJobWaitDurationService,
  ConditionsFilter,
  ConditionsFilterCommand,
  CreateExecutionDetails,
  CreateExecutionDetailsCommand,
  DetailEnum,
  FeatureFlagsService,
  getDigestType,
  getNestedValue,
  IFilterVariables,
  InstrumentUsecase,
  isLookBackDigestOutput,
  isRegularDigestOutput,
  isTimedDigestOutput,
  JobsOptions,
  LogDecorator,
  NormalizeVariables,
  NormalizeVariablesCommand,
  RedisThrottleService,
  StandardQueueService,
  StepRunRepository,
  StepRunStatus,
  TierRestrictionsValidateCommand,
  TierRestrictionsValidateUsecase,
  WorkflowRunStatusEnum,
} from '@novu/application-generic';
import { JobEntity, JobRepository, JobStatusEnum, SubscriberRepository } from '@novu/dal';
import { DigestOutput, ExecuteOutput } from '@novu/framework/internal';
import {
  castUnitToDigestUnitEnum,
  DeliveryLifecycleStatus,
  DigestCreationResultEnum,
  DigestTypeEnum,
  ExecutionDetailsSourceEnum,
  ExecutionDetailsStatusEnum,
  IDigestBaseMetadata,
  IDigestRegularMetadata,
  IDigestTimedMetadata,
  IWorkflowStepMetadata,
  StepTypeEnum,
} from '@novu/shared';
import { parseExpression as parseCronExpression } from 'cron-parser';
import { differenceInMilliseconds } from 'date-fns';
import _ from 'lodash';
import { ExecuteBridgeJob, ExecuteBridgeJobCommand } from '../execute-bridge-job';
import { AddDelayJob } from './add-delay-job.usecase';
import { AddJobCommand } from './add-job.command';
import { MergeOrCreateDigestCommand } from './merge-or-create-digest.command';
import { MergeOrCreateDigest } from './merge-or-create-digest.usecase';
import { validateDigest } from './validation';

export enum BackoffStrategiesEnum {
  WEBHOOK_FILTER_BACKOFF = 'webhookFilterBackoff',
}

/*
 * @description: This is the result of the add job usecase
 *
 * Returns undefined when the end result is not determined yet
 */
type AddJobResult = {
  workflowStatus: WorkflowRunStatusEnum | null;
  deliveryLifecycleStatus: DeliveryLifecycleStatus | null;
  stepStatus?: StepRunStatus;
};

const LOG_CONTEXT = 'AddJob';

@Injectable()
export class AddJob {
  constructor(
    private jobRepository: JobRepository,
    @Inject(forwardRef(() => StandardQueueService))
    private standardQueueService: StandardQueueService,
    @Inject(forwardRef(() => CreateExecutionDetails))
    private createExecutionDetails: CreateExecutionDetails,
    private mergeOrCreateDigestUsecase: MergeOrCreateDigest,
    private addDelayJob: AddDelayJob,
    @Inject(forwardRef(() => ComputeJobWaitDurationService))
    private computeJobWaitDurationService: ComputeJobWaitDurationService,
    @Inject(forwardRef(() => ConditionsFilter))
    private conditionsFilter: ConditionsFilter,
    private normalizeVariablesUsecase: NormalizeVariables,
    private tierRestrictionsValidateUsecase: TierRestrictionsValidateUsecase,
    private executeBridgeJob: ExecuteBridgeJob,
    private stepRunRepository: StepRunRepository,
    private subscriberRepository: SubscriberRepository,
    private redisThrottleService: RedisThrottleService
  ) {}

  @InstrumentUsecase()
  @LogDecorator()
  public async execute(command: AddJobCommand): Promise<AddJobResult> {
    Logger.verbose('Getting Job', LOG_CONTEXT);
    const { job } = command;
    Logger.debug(`Job contents for job ${job._id}`, job, LOG_CONTEXT);

    if (!job) {
      Logger.warn(`Job was null in both the input and search`, LOG_CONTEXT);

      return {
        workflowStatus: null,
        deliveryLifecycleStatus: null,
      };
    }

    Logger.log(`Scheduling New Job ${job._id} of type: ${job.type}`, LOG_CONTEXT);
    await this.createExecutionDetails.execute(
      CreateExecutionDetailsCommand.create({
        ...CreateExecutionDetailsCommand.getDetailsFromJob(job),
        detail: DetailEnum.STEP_QUEUED,
        source: ExecutionDetailsSourceEnum.INTERNAL,
        status: ExecutionDetailsStatusEnum.PENDING,
        isTest: false,
        isRetry: false,
      })
    );

    const result = isJobDeferredType(job.type)
      ? await this.executeDeferredJob(command)
      : await this.executeNoneDeferredJob(command);

    return result;
  }

  private async executeDeferredJob(command: AddJobCommand): Promise<AddJobResult> {
    const { job } = command;

    let digestAmount: number | undefined;
    let delayAmount: number | undefined;

    const variables = await this.normalizeVariablesUsecase.execute(
      NormalizeVariablesCommand.create({
        filters: command.job.step.filters || [],
        environmentId: command.environmentId,
        organizationId: command.organizationId,
        userId: command.userId,
        step: job.step,
        job,
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
    const bridgeResponse = await this.fetchBridgeData(command, filterVariables);

    if (filtered || bridgeResponse?.options?.skip) {
      return {
        workflowStatus: null,
        deliveryLifecycleStatus: null,
        stepStatus: JobStatusEnum.SKIPPED,
      };
    }

    let digestResult: {
      digestAmount: number;
      digestCreationResult: DigestCreationResultEnum;
      cronExpression?: string;
    } | null = null;

    if (job.type === StepTypeEnum.DIGEST) {
      digestResult = await this.handleDigest(command, job, digestAmount, bridgeResponse);

      if (isShouldHaltJobExecution(digestResult.digestCreationResult)) {
        if (digestResult.digestCreationResult === DigestCreationResultEnum.MERGED) {
          return {
            workflowStatus: WorkflowRunStatusEnum.COMPLETED,
            deliveryLifecycleStatus: DeliveryLifecycleStatus.MERGED,
          };
        }

        if (digestResult.digestCreationResult === DigestCreationResultEnum.SKIPPED) {
          return {
            workflowStatus: WorkflowRunStatusEnum.COMPLETED,
            deliveryLifecycleStatus: DeliveryLifecycleStatus.SKIPPED,
          };
        }
      }

      digestAmount = digestResult.digestAmount;
    }

    if (job.type === StepTypeEnum.THROTTLE) {
      try {
        const throttleResult = await this.handleThrottle(command, job, bridgeResponse);

        if (throttleResult.shouldSkip) {
          await this.handleThrottleSkip(
            command,
            job,
            throttleResult as { shouldSkip: boolean; executionCount: number; threshold: number; throttledUntil: string }
          );

          return {
            workflowStatus: WorkflowRunStatusEnum.COMPLETED,
            deliveryLifecycleStatus: DeliveryLifecycleStatus.SKIPPED,
          };
        }
      } catch (error) {
        Logger.error(`Throttle validation failed for job ${job._id}: ${error.message}`, LOG_CONTEXT);

        // Update job status to failed
        await this.jobRepository.updateOne(
          { _id: job._id, _environmentId: command.environmentId },
          {
            $set: {
              status: JobStatusEnum.FAILED,
              error: {
                message: error.message,
                name: error.name,
                stack: error.stack,
              },
            },
          }
        );

        // Create step run record
        await this.stepRunRepository.create(job, {
          status: JobStatusEnum.FAILED,
        });

        return {
          workflowStatus: WorkflowRunStatusEnum.ERROR,
          deliveryLifecycleStatus: DeliveryLifecycleStatus.ERRORED,
        };
      }
    }

    if (job.type === StepTypeEnum.DELAY) {
      delayAmount = await this.handleDelay(command, bridgeResponse);

      if (delayAmount === undefined) {
        Logger.warn(`Delay  Amount does not exist on a delay job ${job._id}`, LOG_CONTEXT);

        return {
          workflowStatus: null,
          deliveryLifecycleStatus: null,
        };
      }
    }

    if ((digestAmount || delayAmount) && filtered) {
      Logger.verbose(`Delay for job ${job._id} will be 0 because job was filtered`, LOG_CONTEXT);
    }

    const delay = this.getExecutionDelayAmount(filtered, digestAmount, delayAmount);

    const valid = await this.validateDeferDuration(delay, job, command, digestResult?.cronExpression);

    if (!valid) {
      throw new Error('Defer duration limit exceeded');
    }

    await this.stepRunRepository.create(command.job, {
      status: JobStatusEnum.DELAYED,
    });

    await this.queueJob(job, delay);

    return {
      workflowStatus: null,
      deliveryLifecycleStatus: null,
    };
  }

  private async validateDeferDuration(
    delay: number,
    job: JobEntity,
    command: AddJobCommand,
    cronExpression?: string
  ): Promise<boolean> {
    const errors = await this.tierRestrictionsValidateUsecase.execute(
      TierRestrictionsValidateCommand.create({
        deferDurationMs: delay,
        stepType: job.type,
        organizationId: command.organizationId,
        cron: cronExpression,
      })
    );

    if (errors.length > 0) {
      const uniqueErrors = _.uniq(errors.map((error) => error.message));
      Logger.warn({ errors, jobId: job._id }, uniqueErrors, LOG_CONTEXT);

      await this.createExecutionDetails.execute(
        CreateExecutionDetailsCommand.create({
          ...CreateExecutionDetailsCommand.getDetailsFromJob(job),
          detail: DetailEnum.DEFER_DURATION_LIMIT_EXCEEDED,
          source: ExecutionDetailsSourceEnum.INTERNAL,
          status: ExecutionDetailsStatusEnum.FAILED,
          isTest: false,
          isRetry: false,
          raw: JSON.stringify({ errors: uniqueErrors }),
        })
      );

      return false;
    }

    return true;
  }

  private async executeNoneDeferredJob(command: AddJobCommand): Promise<AddJobResult> {
    const { job } = command;

    Logger.verbose(`Updating status to queued for job ${job._id}`, LOG_CONTEXT);
    await this.jobRepository.updateStatus(command.environmentId, job._id, JobStatusEnum.QUEUED);

    await this.stepRunRepository.create(job, {
      status: JobStatusEnum.QUEUED,
    });

    await this.queueJob(job, 0);

    return {
      workflowStatus: null,
      deliveryLifecycleStatus: null,
    };
  }

  private async handleDelay(command: AddJobCommand, bridgeResponse: ExecuteOutput | null) {
    let metadata: IWorkflowStepMetadata;
    if (bridgeResponse) {
      // Assign V2 metadata from Bridge response
      metadata = await this.updateMetadata(bridgeResponse, command);
    } else {
      // Assign V1 metadata from known values
      metadata = command.job.step.metadata as IWorkflowStepMetadata;
    }

    const delayAmount = await this.addDelayJob.execute(
      AddJobCommand.create({
        ...command,
        job: {
          ...command.job,
          step: {
            ...command.job.step,
            metadata,
          },
        },
      })
    );

    Logger.debug(`Delay step Amount is: ${delayAmount}`, LOG_CONTEXT);

    return delayAmount;
  }

  private async fetchBridgeData(
    command: AddJobCommand,
    filterVariables: IFilterVariables
  ): Promise<ExecuteOutput | null> {
    const response = await this.executeBridgeJob.execute(
      ExecuteBridgeJobCommand.create({
        identifier: command.job.identifier,
        ...command,
        variables: filterVariables,
      })
    );

    if (!response) {
      return null;
    }

    return response;
  }
  private async updateMetadata(response: ExecuteOutput, command: AddJobCommand) {
    let metadata = {} as IWorkflowStepMetadata;
    const digest = command.job.digest as IDigestBaseMetadata;

    const outputs = response.outputs as DigestOutput;
    // digest value is pre-computed by framework and passed as digestKey
    const outputDigestValue = outputs?.digestKey;
    const digestType = getDigestType(outputs);

    if (isTimedDigestOutput(outputs)) {
      metadata = {
        type: DigestTypeEnum.TIMED,
        digestValue: outputDigestValue || 'No-Value-Provided',
        digestKey: digest.digestKey || 'No-Key-Provided',
        timed: { cronExpression: outputs?.cron },
      } as IDigestTimedMetadata;
      await this.jobRepository.updateOne(
        {
          _id: command.job._id,
          _environmentId: command.environmentId,
        },
        {
          $set: {
            'digest.type': metadata.type,
            'digest.digestValue': metadata.digestValue,
            'digest.digestKey': metadata.digestKey,
            'digest.amount': metadata.amount,
            'digest.unit': metadata.unit,
            'digest.timed.cronExpression': metadata.timed?.cronExpression,
          },
        }
      );
    }

    if (isLookBackDigestOutput(outputs)) {
      metadata = {
        type: digestType,
        amount: outputs?.amount,
        digestValue: outputDigestValue || 'No-Value-Provided',
        digestKey: digest.digestKey || 'No-Key-Provided',
        unit: outputs.unit ? castUnitToDigestUnitEnum(outputs?.unit) : undefined,
        backoff: digestType === DigestTypeEnum.BACKOFF,
        backoffAmount: outputs.lookBackWindow?.amount,
        backoffUnit: outputs.lookBackWindow?.unit ? castUnitToDigestUnitEnum(outputs.lookBackWindow.unit) : undefined,
      } as IDigestRegularMetadata;

      await this.jobRepository.updateOne(
        {
          _id: command.job._id,
          _environmentId: command.environmentId,
        },
        {
          $set: {
            'digest.type': metadata.type,
            'digest.digestValue': metadata.digestValue,
            'digest.digestKey': metadata.digestKey,
            'digest.amount': metadata.amount,
            'digest.unit': metadata.unit,
            'digest.backoff': metadata.backoff,
            'digest.backoffAmount': metadata.backoffAmount,
            'digest.backoffUnit': metadata.backoffUnit,
          },
        }
      );
    }

    if (isRegularDigestOutput(outputs)) {
      if (!outputs.amount && !outputs.unit) {
        outputs.amount = 0;
        outputs.unit = 'seconds';
      }

      metadata = {
        type: digestType,
        amount: outputs?.amount,
        digestKey: digest.digestKey || 'No-Key-Provided',
        digestValue: outputDigestValue || 'No-Value-Provided',
        unit: outputs.unit ? castUnitToDigestUnitEnum(outputs?.unit) : undefined,
      } as IDigestRegularMetadata;

      await this.jobRepository.updateOne(
        {
          _id: command.job._id,
          _environmentId: command.environmentId,
        },
        {
          $set: {
            'digest.type': metadata.type,
            'digest.digestKey': metadata.digestKey,
            'digest.digestValue': metadata.digestValue,
            'digest.amount': metadata.amount,
            'digest.unit': metadata.unit,
          },
        }
      );
    }

    return metadata;
  }

  private async handleDigest(
    command: AddJobCommand,
    job: JobEntity,
    digestAmount: number | undefined,
    bridgeResponse: ExecuteOutput | null
  ) {
    let metadata: IWorkflowStepMetadata;
    if (bridgeResponse) {
      metadata = await this.updateMetadata(bridgeResponse, command);
    } else {
      metadata = job.digest || ({} as IWorkflowStepMetadata);
    }

    // Update the job digest directly to avoid an extra database call
    command.job.digest = { ...command.job.digest, ...metadata } as IWorkflowStepMetadata;

    const subscriber = await this.subscriberRepository.findOne(
      {
        _id: job._subscriberId,
        _environmentId: job._environmentId,
      },
      'timezone',
      { readPreference: 'secondaryPreferred' }
    );

    const bridgeAmount = this.mapBridgeTimedDigestAmount(bridgeResponse, subscriber?.timezone);

    validateDigest(job);

    digestAmount =
      bridgeAmount ??
      this.computeJobWaitDurationService.calculateDelay({
        stepMetadata: metadata,
        payload: job.payload,
        overrides: job.overrides,
        timezone: subscriber?.timezone,
      });

    Logger.debug(`Digest step amount is: ${digestAmount}`, LOG_CONTEXT);

    const digestCreationResult = await this.mergeOrCreateDigestUsecase.execute(
      MergeOrCreateDigestCommand.create({
        job,
      })
    );

    if (digestCreationResult === DigestCreationResultEnum.MERGED) {
      this.handleDigestMerged();
    }

    if (digestCreationResult === DigestCreationResultEnum.SKIPPED) {
      await this.handleDigestSkip(command, job);
    }

    return { digestAmount, digestCreationResult, cronExpression: bridgeResponse?.outputs?.cron as string | undefined };
  }

  private async handleThrottle(
    command: AddJobCommand,
    job: JobEntity,
    bridgeResponse: ExecuteOutput | null
  ): Promise<{ shouldSkip: boolean; executionCount?: number; threshold?: number; throttledUntil?: string }> {
    // Get throttle configuration from bridge response or job step
    const throttleConfig = bridgeResponse?.outputs || {};
    const { type = 'fixed', threshold = 1, throttleKey } = throttleConfig;

    let windowMs: number;

    if (type === 'fixed') {
      const { amount, unit } = throttleConfig;
      if (!amount || !unit) {
        Logger.warn(`Fixed throttle configuration missing amount or unit for job ${job._id}`, LOG_CONTEXT);
        return { shouldSkip: false };
      }
      windowMs = this.convertToMilliseconds(amount as number, unit as string);
    } else if (type === 'dynamic') {
      const { dynamicKey } = throttleConfig;
      if (!dynamicKey) {
        Logger.warn(`Dynamic throttle configuration missing dynamicKey for job ${job._id}`, LOG_CONTEXT);
        return { shouldSkip: false };
      }

      // Parse dynamic window value
      const dynamicValue = this.parseDynamicThrottleValue(job, dynamicKey as string);
      if (!dynamicValue) {
        Logger.warn(`Could not parse dynamic throttle value for job ${job._id}, key: ${dynamicKey}`, LOG_CONTEXT);
        return { shouldSkip: false };
      }

      windowMs = dynamicValue.windowMs;
    } else {
      Logger.warn(`Unknown throttle type '${type}' for job ${job._id}`, LOG_CONTEXT);
      return { shouldSkip: false };
    }

    const nowMs = Date.now();

    // Validate throttle window duration
    await this.validateThrottleWindow(command, job, windowMs, type);

    if (!job.step.stepId) {
      throw new Error('Step ID is required for throttle reservation');
    }

    const throttleValue = throttleKey ? getNestedValue(job.payload, throttleKey as string) : 'default';

    const throttleJobId = `${job._id}:${Date.now()}`;

    const reservationResult = await this.redisThrottleService.reserveThrottleSlot({
      environmentId: command.environmentId,
      subscriberId: job._subscriberId,
      workflowId: job._templateId,
      stepId: job.step.stepId,
      jobId: throttleJobId,
      windowMs,
      limit: threshold as number,
      nowMs,
      throttleKey: (throttleKey as string) || 'default',
      throttleValue: throttleValue,
    });

    Logger.debug(
      {
        jobId: job._id,
        reservationResult,
        threshold,
        windowMs,
        type,
      },
      'Redis throttle reservation result',
      LOG_CONTEXT
    );

    if (!reservationResult.granted) {
      return {
        shouldSkip: true,
        executionCount: reservationResult.count,
        threshold: threshold as number,
        throttledUntil: new Date(reservationResult.windowStartMs + windowMs).toISOString(),
      };
    }

    // Slot reserved successfully, proceed with execution
    return {
      shouldSkip: false,
      executionCount: reservationResult.count,
      threshold: threshold as number,
      throttledUntil: new Date(reservationResult.windowStartMs + windowMs).toISOString(),
    };
  }

  private parseDynamicThrottleValue(
    job: JobEntity,
    dynamicKey: string
  ): { windowMs: number; identifier: string } | null {
    const keyPath = dynamicKey?.replace('payload.', '');
    const value = getNestedValue(job.payload, keyPath);

    if (!value) {
      Logger.debug(`Dynamic throttle key '${dynamicKey}' not found in payload data`, LOG_CONTEXT);
      return null;
    }

    // Handle ISO-8601 timestamp
    if (typeof value === 'string' && this.isISO8601(value)) {
      const targetTime = new Date(value).getTime();
      const now = Date.now();

      return {
        windowMs: targetTime - now,
        identifier: value, // Use the timestamp as identifier
      };
    }

    // Handle relative duration object
    if (typeof value === 'object' && value !== null && 'unit' in value && 'amount' in value) {
      const durationObj = value as { unit: string; amount: number };
      const windowMs = this.convertToMilliseconds(durationObj.amount, durationObj.unit);

      return {
        windowMs,
        identifier: `${durationObj.amount}:${durationObj.unit}`,
      };
    }

    Logger.warn(`Dynamic throttle value '${JSON.stringify(value)}' is not a valid format`, LOG_CONTEXT);
    return null;
  }

  private isISO8601(value: string): boolean {
    // Basic ISO-8601 validation - allow flexible milliseconds (1-3 digits)
    const iso8601Regex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,3})?Z?$/;
    if (!iso8601Regex.test(value)) {
      return false;
    }

    // Check if it's a valid date
    const date = new Date(value);
    return !Number.isNaN(date.getTime());
  }

  private convertToMilliseconds(amount: number, unit: string): number {
    const unitMap: Record<string, number> = {
      minutes: 60 * 1000,
      hours: 60 * 60 * 1000,
      days: 24 * 60 * 60 * 1000,
    };

    if (!unitMap[unit]) {
      Logger.warn(
        `Invalid throttle unit '${unit}', falling back to minutes. Supported units: minutes, hours, days`,
        LOG_CONTEXT
      );
      return amount * unitMap.minutes;
    }

    return amount * unitMap[unit];
  }

  private mapBridgeTimedDigestAmount(bridgeResponse: ExecuteOutput | null, timezone?: string): number | null {
    let bridgeAmount: number | null = null;
    const outputs = bridgeResponse?.outputs as DigestOutput;

    if (!isTimedDigestOutput(outputs)) {
      return null;
    }

    const bridgeAmountExpression = parseCronExpression(outputs?.cron, { tz: timezone });
    const bridgeAmountDate = bridgeAmountExpression.next();

    bridgeAmount = differenceInMilliseconds(bridgeAmountDate.toDate(), new Date());

    return bridgeAmount;
  }

  private handleDigestMerged() {
    Logger.log('Digest was merged, queueing next job', LOG_CONTEXT);
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
  }

  private async handleThrottleSkip(
    command: AddJobCommand,
    job: JobEntity,
    throttleResult: { shouldSkip: boolean; executionCount: number; threshold: number; throttledUntil: string }
  ) {
    Logger.log(
      `Job ${job._id} throttled: ${throttleResult.executionCount} executions exceed threshold ${throttleResult.threshold as number}`,
      LOG_CONTEXT
    );

    await this.jobRepository.updateOne(
      { _id: job._id, _environmentId: command.environmentId },
      {
        $set: {
          status: JobStatusEnum.SKIPPED,
          stepOutput: {
            throttled: true,
            executionCount: throttleResult.executionCount,
            threshold: throttleResult.threshold as number,
            throttledUntil: throttleResult.throttledUntil,
          },
        },
      }
    );

    await this.stepRunRepository.create(job, {
      status: JobStatusEnum.SKIPPED,
    });

    const childJobsUpdated = await this.jobRepository.updateAllChildJobStatus(job, JobStatusEnum.SKIPPED, job._id);

    if (childJobsUpdated.length > 0) {
      await this.stepRunRepository.createMany(childJobsUpdated, {
        status: JobStatusEnum.SKIPPED,
      });

      await this.createExecutionDetails.execute(
        CreateExecutionDetailsCommand.create({
          ...CreateExecutionDetailsCommand.getDetailsFromJob(job),
          detail: DetailEnum.THROTTLE_LIMIT_EXCEEDED,
          source: ExecutionDetailsSourceEnum.INTERNAL,
          status: ExecutionDetailsStatusEnum.SUCCESS,
          isTest: false,
          isRetry: false,
          raw: JSON.stringify({ ...throttleResult }),
        })
      );
    }
  }

  private getExecutionDelayAmount(
    filtered: boolean,
    digestAmount: number | undefined,
    delayAmount: undefined | number
  ) {
    return (filtered ? 0 : (digestAmount ?? delayAmount)) ?? 0;
  }

  public async queueJob(job: JobEntity, delay: number) {
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
      options,
    });

    if (delay) {
      const logMessage =
        job.type === StepTypeEnum.DELAY
          ? 'Delay is active, Creating execution details'
          : job.type === StepTypeEnum.DIGEST
            ? 'Digest is active, Creating execution details'
            : 'Unexpected job type, Creating execution details';

      Logger.verbose(logMessage, LOG_CONTEXT);

      await this.createExecutionDetails.execute(
        CreateExecutionDetailsCommand.create({
          ...CreateExecutionDetailsCommand.getDetailsFromJob(job),
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

  private async validateThrottleWindow(
    command: AddJobCommand,
    job: JobEntity,
    windowMs: number,
    throttleType: string
  ): Promise<void> {
    // For dynamic throttles, validate that the window is in the future
    if (throttleType === 'dynamic' && windowMs <= 0) {
      Logger.error(
        `Dynamic throttle window must be in the future. windowMs: ${windowMs}, jobId: ${job._id}`,
        LOG_CONTEXT
      );

      await this.createExecutionDetails.execute(
        CreateExecutionDetailsCommand.create({
          ...CreateExecutionDetailsCommand.getDetailsFromJob(job),
          detail: DetailEnum.THROTTLE_WINDOW_IN_PAST,
          source: ExecutionDetailsSourceEnum.INTERNAL,
          status: ExecutionDetailsStatusEnum.FAILED,
          isTest: false,
          isRetry: false,
        })
      );

      throw new Error(`Dynamic throttle window must be in the future. windowMs: ${windowMs}`);
    }

    // Validate against tier restrictions
    const tierValidationErrors = await this.tierRestrictionsValidateUsecase.execute(
      TierRestrictionsValidateCommand.create({
        organizationId: command.organizationId,
        environmentId: command.environmentId,
        stepType: StepTypeEnum.THROTTLE,
        amount: Math.floor(windowMs / 1000 / 60), // Convert to minutes for validation
        unit: 'minutes',
      })
    );

    if (tierValidationErrors && tierValidationErrors.length > 0) {
      const errorMessage = tierValidationErrors[0].message;
      Logger.error(`Throttle window exceeds tier limits: ${errorMessage}, jobId: ${job._id}`, LOG_CONTEXT);

      await this.createExecutionDetails.execute(
        CreateExecutionDetailsCommand.create({
          ...CreateExecutionDetailsCommand.getDetailsFromJob(job),
          detail: DetailEnum.DEFER_DURATION_LIMIT_EXCEEDED,
          source: ExecutionDetailsSourceEnum.INTERNAL,
          status: ExecutionDetailsStatusEnum.FAILED,
          isTest: false,
          isRetry: false,
          raw: JSON.stringify({ errorMessage }),
        })
      );

      throw new Error(`Throttle window exceeds tier limits: ${errorMessage}`);
    }
  }
}

function isJobDeferredType(jobType: StepTypeEnum | undefined) {
  if (!jobType) return false;

  return [StepTypeEnum.DELAY, StepTypeEnum.DIGEST, StepTypeEnum.THROTTLE].includes(jobType);
}

function isShouldHaltJobExecution(digestCreationResult: DigestCreationResultEnum) {
  return [DigestCreationResultEnum.MERGED, DigestCreationResultEnum.SKIPPED].includes(digestCreationResult);
}
