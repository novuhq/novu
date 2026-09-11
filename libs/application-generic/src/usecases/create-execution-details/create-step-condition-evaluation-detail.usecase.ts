import { Injectable, Logger } from '@nestjs/common';
import { JobEntity } from '@novu/dal';
import {
  ExecutionDetailsSourceEnum,
  ExecutionDetailsStatusEnum,
  FeatureFlagsKeysEnum,
  ICondition,
  SECRET_MASK,
} from '@novu/shared';
import { AdditionalOperation, RulesLogic } from 'json-logic-js';

import { FeatureFlagsService } from '../../services/feature-flags/feature-flags.service';
import { CreateExecutionDetailsCommand } from './create-execution-details.command';
import { CreateExecutionDetails } from './create-execution-details.usecase';
import { DetailEnum } from './types';

const LOG_CONTEXT = 'CreateStepConditionEvaluationDetail';
const MAX_RAW_SIZE = 10_240;

/** Either a v2 json-logic skip rule or v1 legacy filter evaluation results. */
export type StepConditions = RulesLogic<AdditionalOperation> | ICondition[];

/** The parsed shape persisted with step condition evaluation details. */
export interface IStepConditionEvaluationRaw {
  passed: boolean;
  conditions: StepConditions;
  /** Actual values resolved for the variables referenced by a json-logic rule. */
  evaluatedValues?: Record<string, unknown>;
  /** Present when oversized fields were dropped to keep the payload within limits. */
  truncated?: true;
}

export interface ICreateStepConditionEvaluationDetailParams {
  job: JobEntity;
  conditions: StepConditions;
  evaluatedValues?: Record<string, unknown>;
  passed: boolean;
}

/**
 * Persists the outcome of a step's condition evaluation as an execution detail.
 * Tracing is best-effort and never throws because it must never break a send.
 */
@Injectable()
export class CreateStepConditionEvaluationDetail {
  constructor(
    private createExecutionDetails: CreateExecutionDetails,
    private featureFlagsService: FeatureFlagsService
  ) {}

  /**
   * Exposed so callers can avoid expensive preparation, such as fetching a job,
   * when evaluation tracing is disabled.
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
        key: FeatureFlagsKeysEnum.IS_STEP_CONDITIONS_EVALUATION_TRACE_ENABLED,
        defaultValue: false,
        organization: { _id: organizationId },
        environment: { _id: environmentId },
      });
    } catch (error) {
      Logger.error(error, 'Failed to resolve step conditions evaluation trace flag', LOG_CONTEXT);

      return false;
    }
  }

  /**
   * Writes an evaluation detail only when the evaluation trace flag is enabled.
   * Returns whether the detail was written.
   */
  public async execute(params: ICreateStepConditionEvaluationDetailParams): Promise<boolean> {
    const isEnabled = await this.isEnabled({
      organizationId: params.job._organizationId,
      environmentId: params.job._environmentId,
    });
    if (!isEnabled) {
      return false;
    }

    return this.executeAfterEnabledCheck(params);
  }

  /**
   * Writes without rechecking the flag. Use only after `isEnabled` when the
   * caller needs to avoid expensive preparation while tracing is disabled.
   */
  public async executeAfterEnabledCheck({
    job,
    conditions,
    evaluatedValues,
    passed,
  }: ICreateStepConditionEvaluationDetailParams): Promise<boolean> {
    try {
      await this.createExecutionDetails.execute(
        CreateExecutionDetailsCommand.create({
          ...CreateExecutionDetailsCommand.getDetailsFromJob(job),
          detail: passed ? DetailEnum.STEP_CONDITIONS_PASSED : DetailEnum.SKIPPED_STEP_BY_CONDITIONS,
          source: ExecutionDetailsSourceEnum.INTERNAL,
          status: passed ? ExecutionDetailsStatusEnum.SUCCESS : ExecutionDetailsStatusEnum.FAILED,
          isTest: false,
          isRetry: false,
          raw: serializeConditionsRaw({
            passed,
            conditions,
            evaluatedValues: redactEnvironmentValues(evaluatedValues),
          }),
        })
      );

      return true;
    } catch (error) {
      Logger.error(error, 'Failed to create step conditions evaluation detail', LOG_CONTEXT);

      return false;
    }
  }
}

/**
 * Environment variables are decrypted into the evaluation context and can hold
 * secrets (API keys, tokens). Their `isSecret` flag is no longer available at
 * this layer, so every env-sourced value is masked before persisting.
 *
 * Masking is decided by the variable path's root segment: `env` covers direct
 * references, and an empty root covers unscoped paths because json-logic
 * resolves `{"var": ""}` to the entire evaluation context.
 */
function redactEnvironmentValues(
  evaluatedValues: Record<string, unknown> | undefined
): Record<string, unknown> | undefined {
  if (!evaluatedValues) {
    return undefined;
  }

  return Object.fromEntries(
    Object.entries(evaluatedValues).map(([path, value]) => [path, isSensitivePath(path) ? SECRET_MASK : value])
  );
}

function isSensitivePath(path: string): boolean {
  const [root] = path.split('.');

  return root === '' || root === 'env';
}

/**
 * Keeps the persisted payload valid JSON. Oversized payloads progressively
 * drop the largest fields and are marked as truncated.
 */
function serializeConditionsRaw(raw: IStepConditionEvaluationRaw): string {
  const fallbacks: IStepConditionEvaluationRaw[] = [
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
