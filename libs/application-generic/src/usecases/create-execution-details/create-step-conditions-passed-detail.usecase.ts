import { Injectable, Logger } from '@nestjs/common';
import { JobEntity } from '@novu/dal';
import { ExecutionDetailsSourceEnum, ExecutionDetailsStatusEnum, FeatureFlagsKeysEnum, ICondition } from '@novu/shared';
import { AdditionalOperation, RulesLogic } from 'json-logic-js';

import { FeatureFlagsService } from '../../services';
import { CreateExecutionDetailsCommand } from './create-execution-details.command';
import { CreateExecutionDetails } from './create-execution-details.usecase';
import { DetailEnum } from './types';

const LOG_CONTEXT = 'CreateStepConditionsPassedDetail';
const MAX_RAW_SIZE = 10_240;

/** Either a v2 json-logic skip rule or v1 legacy filter evaluation results. */
export type StepConditions = RulesLogic<AdditionalOperation> | ICondition[];

/** The parsed shape of the `raw` payload persisted with STEP_CONDITIONS_PASSED details. */
export interface IStepConditionsPassedRaw {
  passed: true;
  conditions: StepConditions;
  /** Actual values resolved for the variables referenced by a json-logic rule. */
  evaluatedValues?: Record<string, unknown>;
  /** Present when oversized fields were dropped to keep the payload within limits. */
  truncated?: true;
}

export interface ICreateStepConditionsPassedDetailParams {
  job: JobEntity;
  conditions: StepConditions;
  evaluatedValues?: Record<string, unknown>;
}

/**
 * Persists a STEP_CONDITIONS_PASSED execution detail when a step's conditions
 * matched and the step will execute. Owns the feature-flag gate, the raw
 * payload shape, size limiting, and the failure policy: the trace is
 * best-effort and never throws, because tracing must never break a send.
 */
@Injectable()
export class CreateStepConditionsPassedDetail {
  constructor(
    private createExecutionDetails: CreateExecutionDetails,
    private featureFlagsService: FeatureFlagsService
  ) {}

  /**
   * Exposed for callers that want to avoid extra work (e.g. a job fetch)
   * when the trace is disabled. `execute` re-checks the flag itself.
   */
  public async isEnabled({
    organizationId,
    environmentId,
  }: {
    organizationId: string;
    environmentId: string;
  }): Promise<boolean> {
    try {
      return await this.featureFlagsService.getFlag({
        key: FeatureFlagsKeysEnum.IS_STEP_CONDITIONS_PASSED_TRACE_ENABLED,
        defaultValue: false,
        organization: { _id: organizationId },
        environment: { _id: environmentId },
      });
    } catch (error) {
      Logger.error(error, 'Failed to resolve step conditions passed trace flag', LOG_CONTEXT);

      return false;
    }
  }

  public async execute({ job, conditions, evaluatedValues }: ICreateStepConditionsPassedDetailParams): Promise<void> {
    try {
      const isEnabled = await this.isEnabled({
        organizationId: job._organizationId,
        environmentId: job._environmentId,
      });
      if (!isEnabled) {
        return;
      }

      await this.createExecutionDetails.execute(
        CreateExecutionDetailsCommand.create({
          ...CreateExecutionDetailsCommand.getDetailsFromJob(job),
          detail: DetailEnum.STEP_CONDITIONS_PASSED,
          source: ExecutionDetailsSourceEnum.INTERNAL,
          status: ExecutionDetailsStatusEnum.SUCCESS,
          isTest: false,
          isRetry: false,
          raw: serializeConditionsRaw({ passed: true, conditions, evaluatedValues }),
        })
      );
    } catch (error) {
      Logger.error(error, 'Failed to create step conditions passed execution detail', LOG_CONTEXT);
    }
  }
}

/**
 * Keeps the persisted payload valid JSON: instead of slicing the serialized
 * string (which would corrupt it for consumers), oversized payloads
 * progressively drop the largest fields and are marked as truncated.
 */
function serializeConditionsRaw(raw: IStepConditionsPassedRaw): string {
  const fallbacks: IStepConditionsPassedRaw[] = [
    raw,
    { passed: raw.passed, conditions: raw.conditions, truncated: true },
    { passed: raw.passed, conditions: [], truncated: true },
  ];

  for (const candidate of fallbacks) {
    const serialized = JSON.stringify(candidate);
    if (serialized.length <= MAX_RAW_SIZE) {
      return serialized;
    }
  }

  return JSON.stringify({ passed: raw.passed, conditions: [], truncated: true });
}
