import { JobEntity } from '@novu/dal';
import { SECRET_MASK, StepTypeEnum } from '@novu/shared';

import { FeatureFlagsService } from '../../services';
import { CreateExecutionDetails } from './create-execution-details.usecase';
import { CreateStepConditionsPassedDetail } from './create-step-conditions-passed-detail.usecase';

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

function buildUsecase() {
  const executedCommands: { raw?: string }[] = [];
  const createExecutionDetails = {
    execute: async (command: { raw?: string }) => {
      executedCommands.push(command);
    },
  } as unknown as CreateExecutionDetails;
  const featureFlagsService = {
    getFlag: async () => true,
  } as unknown as FeatureFlagsService;

  return {
    usecase: new CreateStepConditionsPassedDetail(createExecutionDetails, featureFlagsService),
    executedCommands,
  };
}

describe('CreateStepConditionsPassedDetail', () => {
  it('should mask env-scoped evaluated values', async () => {
    const { usecase, executedCommands } = buildUsecase();

    await usecase.execute({
      job,
      conditions: { '!=': [{ var: 'env.STRIPE_API_KEY' }, ''] },
      evaluatedValues: { 'env.STRIPE_API_KEY': SECRET_VALUE, 'payload.tier': 'pro' },
    });

    expect(executedCommands).toHaveLength(1);
    expect(executedCommands[0].raw).not.toContain(SECRET_VALUE);
    const raw = JSON.parse(executedCommands[0].raw as string);
    expect(raw.evaluatedValues).toEqual({ 'env.STRIPE_API_KEY': SECRET_MASK, 'payload.tier': 'pro' });
  });

  it('should mask unscoped evaluated values that resolve to the whole evaluation context', async () => {
    const { usecase, executedCommands } = buildUsecase();

    // json-logic resolves `{"var": ""}` to the entire evaluation context,
    // which contains the decrypted env object with all secrets.
    const wholeContext = {
      payload: { tier: 'pro' },
      subscriber: { subscriberId: 'subscriber-external-id' },
      env: { STRIPE_API_KEY: SECRET_VALUE },
    };

    await usecase.execute({
      job,
      conditions: { '!=': [{ var: '' }, ''] },
      evaluatedValues: { '': wholeContext },
    });

    expect(executedCommands).toHaveLength(1);
    expect(executedCommands[0].raw).not.toContain(SECRET_VALUE);
    const raw = JSON.parse(executedCommands[0].raw as string);
    expect(raw.evaluatedValues).toEqual({ '': SECRET_MASK });
  });
});
