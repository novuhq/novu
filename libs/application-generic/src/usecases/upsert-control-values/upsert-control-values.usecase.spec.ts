import { ControlValuesRepository } from '@novu/dal';
import { ControlValuesLevelEnum, ToolProviderIdEnum } from '@novu/shared';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { UpsertControlValuesCommand } from './upsert-control-values.command';
import { UpsertControlValuesUseCase } from './upsert-control-values.usecase';

describe('UpsertControlValuesUseCase', () => {
  const controlValuesRepository = {
    findOne: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  };
  let usecase: UpsertControlValuesUseCase;

  const baseCommand = {
    organizationId: 'org-id',
    environmentId: 'env-id',
    workflowId: 'workflow-id',
    stepId: 'step-id',
  };

  beforeEach(() => {
    vi.resetAllMocks();
    usecase = new UpsertControlValuesUseCase(controlValuesRepository as unknown as ControlValuesRepository);
  });

  it('looks up and creates integration controls scoped to the provider and integration identifier', async () => {
    controlValuesRepository.findOne.mockResolvedValue(null);

    await usecase.execute(
      UpsertControlValuesCommand.create({
        ...baseCommand,
        level: ControlValuesLevelEnum.STEP_INTEGRATION_CONTROLS,
        providerId: ToolProviderIdEnum.Webhook,
        integrationIdentifier: 'prod-alerts',
        newControlValues: { alert_type: 'incident' },
      })
    );

    expect(controlValuesRepository.findOne.mock.calls[0][0]).toMatchObject({
      _environmentId: 'env-id',
      _organizationId: 'org-id',
      _stepId: 'step-id',
      level: ControlValuesLevelEnum.STEP_INTEGRATION_CONTROLS,
      providerId: ToolProviderIdEnum.Webhook,
      integrationIdentifier: 'prod-alerts',
    });
    expect(controlValuesRepository.create.mock.calls[0][0]).toMatchObject({
      level: ControlValuesLevelEnum.STEP_INTEGRATION_CONTROLS,
      providerId: ToolProviderIdEnum.Webhook,
      integrationIdentifier: 'prod-alerts',
      controls: { alert_type: 'incident' },
    });
  });

  it('updates an existing integration controls doc with its identifier', async () => {
    controlValuesRepository.findOne.mockResolvedValue({ _id: 'doc-id' });

    await usecase.execute(
      UpsertControlValuesCommand.create({
        ...baseCommand,
        level: ControlValuesLevelEnum.STEP_INTEGRATION_CONTROLS,
        providerId: ToolProviderIdEnum.Webhook,
        integrationIdentifier: 'prod-alerts',
        newControlValues: { alert_type: 'test' },
      })
    );

    expect(controlValuesRepository.create).not.toHaveBeenCalled();
    expect(controlValuesRepository.update.mock.calls[0][0]).toEqual({ _id: 'doc-id', _organizationId: 'org-id' });
    expect(controlValuesRepository.update.mock.calls[0][1]).toEqual({
      priority: 0,
      controls: { alert_type: 'test' },
      providerId: ToolProviderIdEnum.Webhook,
      integrationIdentifier: 'prod-alerts',
    });
  });

  it('keeps provider controls unscoped by integration identifier', async () => {
    controlValuesRepository.findOne.mockResolvedValue(null);

    await usecase.execute(
      UpsertControlValuesCommand.create({
        ...baseCommand,
        level: ControlValuesLevelEnum.STEP_PROVIDER_CONTROLS,
        providerId: ToolProviderIdEnum.Webhook,
        newControlValues: { env: 'all' },
      })
    );

    expect(controlValuesRepository.findOne.mock.calls[0][0]).not.toHaveProperty('integrationIdentifier');
    expect(controlValuesRepository.create.mock.calls[0][0]).not.toHaveProperty('integrationIdentifier');
    expect(controlValuesRepository.create.mock.calls[0][0]).toMatchObject({ providerId: ToolProviderIdEnum.Webhook });
  });
});
