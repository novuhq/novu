import { forwardRef, Inject, Injectable, Logger } from '@nestjs/common';
import {
  ComputeJobWaitDurationService,
  ConditionsFilter,
  ConditionsFilterCommand,
  CreateExecutionDetails,
  CreateExecutionDetailsCommand,
  DetailEnum,
  getDigestType,
  IFilterVariables,
  InstrumentUsecase,
  isLookBackDigestOutput,
  isRegularOutput,
  isTimedOutput,
  JobsOptions,
  LogDecorator,
  NormalizeVariables,
  NormalizeVariablesCommand,
  StandardQueueService,
  StepRunRepository,
  StepRunStatus,
  TierRestrictionsValidateCommand,
  TierRestrictionsValidateUsecase,
  WorkflowRunStatusEnum,
} from '@novu/application-generic';
import { JobEntity, JobRepository, JobStatusEnum, SubscriberRepository } from '@novu/dal';
import { DelayOutput, DigestOutput, ExecuteOutput } from '@novu/framework/internal';
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
import { formatInTimeZone } from 'date-fns-tz';
import _ from 'lodash';
import { ExecuteBridgeJob, ExecuteBridgeJobCommand } from '../execute-bridge-job';
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
    @Inject(forwardRef(() => ComputeJobWaitDurationService))
    private computeJobWaitDurationService: ComputeJobWaitDurationService,
    @Inject(forwardRef(() => ConditionsFilter))
    private conditionsFilter: ConditionsFilter,
    private normalizeVariablesUsecase: NormalizeVariables,
    private tierRestrictionsValidateUsecase: TierRestrictionsValidateUsecase,
    private executeBridgeJob: ExecuteBridgeJob,
    private stepRunRepository: StepRunRepository,
    private subscriberRepository: SubscriberRepository
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

    const result = isJobDeferredType(job.type)
      ? await this.executeDeferredJob(command)
      : await this.executeNoneDeferredJob(command);

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

    const subscriber = await this.subscriberRepository.findOne(
      {
        _id: job._subscriberId,
        _environmentId: job._environmentId,
      },
      'timezone',
      { readPreference: 'secondaryPreferred' }
    );
    const bridgeDelayAmountDate = this.getBridgeNextCronDate(bridgeResponse, subscriber?.timezone);
    const bridgeDelayAmount = bridgeDelayAmountDate
      ? differenceInMilliseconds(bridgeDelayAmountDate, new Date())
      : undefined;

    if (job.type === StepTypeEnum.DIGEST) {
      digestResult = await this.handleDigest({
        command,
        job,
        bridgeResponse,
        bridgeDelayAmountDate,
        bridgeDelayAmount,
        timezone: subscriber?.timezone,
      });

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

    if (job.type === StepTypeEnum.DELAY) {
      delayAmount = await this.handleDelay({
        command,
        job,
        bridgeResponse,
        bridgeDelayAmountDate,
        bridgeDelayAmount,
        timezone: subscriber?.timezone,
      });

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

    const updatedJob = await this.jobRepository.findOne({
      _id: job._id,
      _environmentId: job._environmentId,
    });

    if (!updatedJob) {
      throw new Error(`Job with id ${job._id} not found`);
    }

    await this.stepRunRepository.create(updatedJob, {
      status: JobStatusEnum.DELAYED,
    });

    await this.queueJob({ job, delay, untilDate: bridgeDelayAmountDate, timezone: subscriber?.timezone });

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

    await this.queueJob({ job, delay: 0, untilDate: null });

    return {
      workflowStatus: null,
      deliveryLifecycleStatus: null,
    };
  }

  private async handleDelay({
    command,
    job,
    bridgeResponse,
    bridgeDelayAmountDate,
    bridgeDelayAmount,
    timezone,
  }: {
    command: AddJobCommand;
    job: JobEntity;
    bridgeResponse: ExecuteOutput | null;
    bridgeDelayAmountDate: Date | null;
    bridgeDelayAmount: number | undefined;
    timezone: string | undefined;
  }) {
    let metadata: IWorkflowStepMetadata;
    if (bridgeResponse) {
      // Assign V2 metadata from Bridge response
      metadata = await this.updateMetadata(bridgeResponse, command, bridgeDelayAmountDate);
    } else {
      // Assign V1 metadata from known values
      metadata = command.job.step.metadata as IWorkflowStepMetadata;
    }

    const delayAmount =
      bridgeDelayAmount ??
      (await this.computeJobWaitDurationService.calculateDelay({
        stepMetadata: metadata,
        payload: job.payload,
        overrides: job.overrides,
        timezone,
      }));

    await this.jobRepository.updateStatus(command.environmentId, job._id, JobStatusEnum.DELAYED);

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

  private async updateMetadata(response: ExecuteOutput, command: AddJobCommand, untilDate?: Date | null) {
    let metadata = {} as IWorkflowStepMetadata;
    const digest = command.job.digest as IDigestBaseMetadata;

    const outputs = response.outputs as DigestOutput;
    // digest value is pre-computed by framework and passed as digestKey
    const outputDigestValue = outputs?.digestKey;
    const digestType = getDigestType(outputs);

    if (isTimedOutput(outputs)) {
      metadata = {
        type: DigestTypeEnum.TIMED,
        digestValue: outputDigestValue || 'No-Value-Provided',
        digestKey: digest.digestKey || 'No-Key-Provided',
        timed: { cronExpression: outputs?.cron, untilDate: untilDate?.toISOString() },
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
            'digest.timed.untilDate': metadata.timed?.untilDate,
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

    if (isRegularOutput(outputs)) {
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

  private async handleDigest({
    command,
    job,
    bridgeResponse,
    bridgeDelayAmountDate,
    bridgeDelayAmount,
    timezone,
  }: {
    command: AddJobCommand;
    job: JobEntity;
    bridgeResponse: ExecuteOutput | null;
    bridgeDelayAmountDate: Date | null;
    bridgeDelayAmount: number | undefined;
    timezone: string | undefined;
  }) {
    let metadata: IWorkflowStepMetadata;
    if (bridgeResponse) {
      metadata = await this.updateMetadata(bridgeResponse, command, bridgeDelayAmountDate);
    } else {
      metadata = job.digest || ({} as IWorkflowStepMetadata);
    }

    // Update the job digest directly to avoid an extra database call
    command.job.digest = { ...command.job.digest, ...metadata } as IWorkflowStepMetadata;

    validateDigest(job);

    const digestAmount =
      bridgeDelayAmount ??
      this.computeJobWaitDurationService.calculateDelay({
        stepMetadata: metadata,
        payload: job.payload,
        overrides: job.overrides,
        timezone,
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

  private getBridgeNextCronDate(bridgeResponse: ExecuteOutput | null, timezone?: string): Date | null {
    const outputs = bridgeResponse?.outputs as DigestOutput | DelayOutput;
    if (!isTimedOutput(outputs)) {
      return null;
    }

    const bridgeAmountExpression = parseCronExpression(outputs?.cron, { tz: timezone });
    const bridgeAmountDate = bridgeAmountExpression.next();

    return bridgeAmountDate.toDate();
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

  private getExecutionDelayAmount(
    filtered: boolean,
    digestAmount: number | undefined,
    delayAmount: undefined | number
  ) {
    return (filtered ? 0 : (digestAmount ?? delayAmount)) ?? 0;
  }

  public async queueJob({
    job,
    delay,
    untilDate,
    timezone,
  }: {
    job: JobEntity;
    delay: number;
    untilDate: Date | null;
    timezone?: string;
  }) {
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
          raw: JSON.stringify({
            delay,
            ...(untilDate && {
              untilDate: timezone
                ? formatInTimeZone(untilDate, timezone, 'yyyy-MM-dd HH:mm:ss zzz')
                : untilDate.toISOString(),
            }),
          }),
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
