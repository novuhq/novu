import { JobEntity } from '@novu/dal';
import { ExecutionDetailsStatusEnum, FeatureFlagsKeysEnum, SECRET_MASK, StepTypeEnum } from '@novu/shared';

import { FeatureFlagsService } from '../../services/feature-flags/feature-flags.service';
import { CreateExecutionDetails } from './create-execution-details.usecase';
import {
  CreateStepConditionEvaluationDetail,
  ICreateStepConditionEvaluationDetailParams,
} from './create-step-condition-evaluation-detail.usecase';
import { DetailEnum } from './types';

jest.mock('../../services/feature-flags/feature-flags.service', () => ({
  FeatureFlagsService: class FeatureFlagsService {},
}));
jest.mock('./create-execution-details.usecase', () => ({
  CreateExecutionDetails: class CreateExecutionDetails {},
}));

const SECRET_VALUE = 'sk_live_super_secret_value_123';

const job = {
  _id: 'job-id',
  _environmentId: 'environment-id',
  _organizationId: 'organization-id',
  _notificationId: 'notification-id',
  _subscriberId: 'subscriber-id',
  _templateId: 'template-id',
  _userId: 'user-id',
  subscriberId: 'subscriber-external-id',
  transactionId: 'transaction-id',
  type: StepTypeEnum.IN_APP,
  step: {},
  identifier: 'workflow-identifier',
} as unknown as JobEntity;

type CapturedCommand = { raw?: string; detail?: string; status?: string };

function buildUsecase(isEnabled = true) {
  const executedCommands: CapturedCommand[] = [];
  const requestedFlagKeys: FeatureFlagsKeysEnum[] = [];
  const createExecutionDetails = {
    execute: async (command: CapturedCommand) => {
      executedCommands.push(command);
    },
  } as unknown as CreateExecutionDetails;
  const featureFlagsService = {
    getFlag: async ({ key }: { key: FeatureFlagsKeysEnum }) => {
      requestedFlagKeys.push(key);

      return isEnabled;
    },
  } as unknown as FeatureFlagsService;

  return {
    usecase: new CreateStepConditionEvaluationDetail(createExecutionDetails, featureFlagsService),
    executedCommands,
    requestedFlagKeys,
  };
}

function createParams(
  overrides: Partial<ICreateStepConditionEvaluationDetailParams> = {}
): ICreateStepConditionEvaluationDetailParams {
  return {
    job,
    conditions: { '==': [{ var: 'payload.tier' }, 'pro'] },
    passed: true,
    ...overrides,
  };
}

describe('CreateStepConditionEvaluationDetail', () => {
  it('should record a matched detail when the conditions passed', async () => {
    const { usecase, executedCommands, requestedFlagKeys } = buildUsecase();

    const wasWritten = await usecase.execute(createParams());

    expect(wasWritten).toEqual(true);
    expect(requestedFlagKeys).toEqual([FeatureFlagsKeysEnum.IS_STEP_CONDITIONS_EVALUATION_TRACE_ENABLED]);
    expect(executedCommands).toHaveLength(1);
    expect(executedCommands[0].detail).toEqual(DetailEnum.STEP_CONDITIONS_PASSED);
    expect(executedCommands[0].status).toEqual(ExecutionDetailsStatusEnum.SUCCESS);
    expect(JSON.parse(executedCommands[0].raw as string).passed).toEqual(true);
  });

  it('should record a skipped detail when the conditions did not pass', async () => {
    const { usecase, executedCommands } = buildUsecase();

    const wasWritten = await usecase.execute(
      createParams({
        evaluatedValues: { 'payload.tier': 'free' },
        passed: false,
      })
    );

    expect(wasWritten).toEqual(true);
    expect(executedCommands).toHaveLength(1);
    expect(executedCommands[0].detail).toEqual(DetailEnum.SKIPPED_STEP_BY_CONDITIONS);
    expect(executedCommands[0].status).toEqual(ExecutionDetailsStatusEnum.FAILED);
    const raw = JSON.parse(executedCommands[0].raw as string);
    expect(raw.passed).toEqual(false);
    expect(raw.evaluatedValues).toEqual({ 'payload.tier': 'free' });
  });

  it('should not record a detail when the evaluation flag is disabled', async () => {
    const { usecase, executedCommands } = buildUsecase(false);

    const wasWritten = await usecase.execute(createParams());

    expect(wasWritten).toEqual(false);
    expect(executedCommands).toHaveLength(0);
  });

  it('should write after the caller has already checked the flag', async () => {
    const { usecase, executedCommands, requestedFlagKeys } = buildUsecase(false);

    const wasWritten = await usecase.executeAfterEnabledCheck(createParams({ passed: false }));

    expect(wasWritten).toEqual(true);
    expect(requestedFlagKeys).toHaveLength(0);
    expect(executedCommands[0].detail).toEqual(DetailEnum.SKIPPED_STEP_BY_CONDITIONS);
  });

  it('should mask env-scoped evaluated values', async () => {
    const { usecase, executedCommands } = buildUsecase();

    await usecase.execute(
      createParams({
        conditions: { '!=': [{ var: 'env.STRIPE_API_KEY' }, ''] },
        evaluatedValues: { 'env.STRIPE_API_KEY': SECRET_VALUE, 'payload.tier': 'pro' },
      })
    );

    expect(executedCommands).toHaveLength(1);
    expect(executedCommands[0].raw).not.toContain(SECRET_VALUE);
    const raw = JSON.parse(executedCommands[0].raw as string);
    expect(raw.evaluatedValues).toEqual({ 'env.STRIPE_API_KEY': SECRET_MASK, 'payload.tier': 'pro' });
  });

  it('should mask unscoped evaluated values that resolve to the whole evaluation context', async () => {
    const { usecase, executedCommands } = buildUsecase();
    const wholeContext = {
      payload: { tier: 'pro' },
      subscriber: { subscriberId: 'subscriber-external-id' },
      env: { STRIPE_API_KEY: SECRET_VALUE },
    };

    await usecase.execute(
      createParams({
        conditions: { '!=': [{ var: '' }, ''] },
        evaluatedValues: { '': wholeContext },
      })
    );

    expect(executedCommands).toHaveLength(1);
    expect(executedCommands[0].raw).not.toContain(SECRET_VALUE);
    const raw = JSON.parse(executedCommands[0].raw as string);
    expect(raw.evaluatedValues).toEqual({ '': SECRET_MASK });
  });
});
