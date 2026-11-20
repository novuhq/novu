import { ControlValuesRepository, NotificationTemplateEntity, PreferencesRepository } from '@novu/dal';
import { ControlValuesLevelEnum, ResourceOriginEnum, StepTypeEnum, ToolProviderIdEnum } from '@novu/shared';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { WorkflowDataContainer } from './workflow-data.container';

describe('WorkflowDataContainer', () => {
  const workflow = {
    _id: 'workflow-id',
    _environmentId: 'env-id',
    _organizationId: 'org-id',
    name: 'Alerts',
    origin: ResourceOriginEnum.NOVU_CLOUD,
    triggers: [{ identifier: 'alerts' }],
    tags: [],
    steps: [
      {
        _id: 'template-1',
        _templateId: 'template-1',
        stepId: 'tool-step',
        name: 'Tool',
        template: { type: StepTypeEnum.TOOL },
      },
    ],
  } as unknown as NotificationTemplateEntity;

  const controlValuesRepository = { find: vi.fn() };
  const preferencesRepository = { find: vi.fn() };
  let container: WorkflowDataContainer;

  beforeEach(() => {
    vi.resetAllMocks();
    preferencesRepository.find.mockResolvedValue([]);
    controlValuesRepository.find.mockImplementation(async (query) =>
      query.level === ControlValuesLevelEnum.STEP_CONTROLS
        ? [
            {
              _workflowId: 'workflow-id',
              _environmentId: 'env-id',
              _stepId: 'template-1',
              level: ControlValuesLevelEnum.STEP_CONTROLS,
              controls: { body: 'hello' },
            },
          ]
        : [
            {
              _workflowId: 'workflow-id',
              _environmentId: 'env-id',
              _stepId: 'template-1',
              level: ControlValuesLevelEnum.STEP_PROVIDER_CONTROLS,
              providerId: ToolProviderIdEnum.Webhook,
              controls: { env: 'all' },
            },
            {
              _workflowId: 'workflow-id',
              _environmentId: 'env-id',
              _stepId: 'template-1',
              level: ControlValuesLevelEnum.STEP_INTEGRATION_CONTROLS,
              providerId: ToolProviderIdEnum.Webhook,
              integrationIdentifier: 'prod-alerts',
              controls: { alert_type: 'incident' },
            },
          ]
    );
    container = new WorkflowDataContainer(
      controlValuesRepository as unknown as ControlValuesRepository,
      preferencesRepository as unknown as PreferencesRepository
    );
  });

  it('preloads provider and integration overrides in one query and exposes them on the step dtos', async () => {
    await container.loadWorkflowsWithControlValues([workflow], 'env-id', 'org-id', 'target-env-id');

    const overrideQueries = controlValuesRepository.find.mock.calls.filter(
      ([query]) => query.level !== ControlValuesLevelEnum.STEP_CONTROLS
    );
    expect(overrideQueries).toHaveLength(1);
    expect(overrideQueries[0][0]).toEqual({
      _environmentId: { $in: ['env-id', 'target-env-id'] },
      _organizationId: 'org-id',
      _workflowId: { $in: ['workflow-id'] },
      level: {
        $in: [ControlValuesLevelEnum.STEP_PROVIDER_CONTROLS, ControlValuesLevelEnum.STEP_INTEGRATION_CONTROLS],
      },
    });

    const step = container.getStepData('alerts', 'template-1', 'env-id');
    expect(step?.controlValues).toEqual({ body: 'hello' });
    expect(step?.providerOverrides).toEqual({ [ToolProviderIdEnum.Webhook]: { env: 'all' } });
    expect(step?.integrationOverrides).toEqual({
      [ToolProviderIdEnum.Webhook]: { 'prod-alerts': { alert_type: 'incident' } },
    });
    expect(container.getWorkflowDto('alerts', 'env-id')?.steps[0].integrationOverrides).toEqual(
      step?.integrationOverrides
    );
    expect(container.getWorkflowData('alerts', 'env-id')?.overridesByStep.get('template-1')).toEqual({
      providerOverrides: step?.providerOverrides,
      integrationOverrides: step?.integrationOverrides,
    });
  });
});
