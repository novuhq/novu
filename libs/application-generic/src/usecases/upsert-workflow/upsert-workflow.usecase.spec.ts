import { NotificationTemplateEntity } from '@novu/dal';
import {
  ChatProviderIdEnum,
  ControlValuesLevelEnum,
  ResourceOriginEnum,
  StepTypeEnum,
  ToolProviderIdEnum,
  UserSessionData,
} from '@novu/shared';
import type { PinoLogger } from 'nestjs-pino';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { UpsertStepDataCommand, UpsertWorkflowCommand } from './upsert-workflow.command';
import { UpsertWorkflowUseCase } from './upsert-workflow.usecase';

const WORKFLOW_ID = '64b7f0c2a1b2c3d4e5f60718';
const STEP_TEMPLATE_ID = '64b7f0c2a1b2c3d4e5f60719';

describe('UpsertWorkflowUseCase integration overrides', () => {
  const user = { _id: 'user-id', environmentId: 'env-id', organizationId: 'org-id' } as UserSessionData;
  const existingWorkflow = {
    _id: WORKFLOW_ID,
    _environmentId: 'env-id',
    origin: ResourceOriginEnum.NOVU_CLOUD,
    triggers: [{ identifier: 'alerts' }],
    steps: [
      {
        _id: STEP_TEMPLATE_ID,
        _templateId: STEP_TEMPLATE_ID,
        stepId: 'tool-step',
        name: 'Tool',
        template: { type: StepTypeEnum.TOOL },
      },
    ],
  } as unknown as NotificationTemplateEntity;
  const stepQuery = {
    _environmentId: 'env-id',
    _organizationId: 'org-id',
    _workflowId: WORKFLOW_ID,
    _stepId: STEP_TEMPLATE_ID,
  };

  const getWorkflowByIdsUseCase = { execute: vi.fn() };
  const updateWorkflowV0Usecase = { execute: vi.fn() };
  const getWorkflowUseCase = { execute: vi.fn() };
  const buildStepIssuesUsecase = { execute: vi.fn() };
  const controlValuesRepository = { find: vi.fn(), deleteMany: vi.fn() };
  const upsertControlValuesUseCase = { execute: vi.fn() };
  const analyticsService = { mixpanelTrack: vi.fn(), track: vi.fn() };
  const sendWebhookMessage = { execute: vi.fn() };
  let usecase: UpsertWorkflowUseCase;

  beforeEach(() => {
    vi.resetAllMocks();
    getWorkflowByIdsUseCase.execute.mockResolvedValue(existingWorkflow);
    updateWorkflowV0Usecase.execute.mockResolvedValue(existingWorkflow);
    getWorkflowUseCase.execute.mockResolvedValue({ workflowId: 'alerts', name: 'Alerts' });
    buildStepIssuesUsecase.execute.mockResolvedValue({});
    controlValuesRepository.find.mockResolvedValue([]);

    // biome-ignore lint/plugin: the constructor takes a dozen collaborators; only the ones this flow touches are stubbed
    usecase = new (UpsertWorkflowUseCase as unknown as new (...args: unknown[]) => UpsertWorkflowUseCase)(
      {},
      updateWorkflowV0Usecase,
      {},
      getWorkflowByIdsUseCase,
      getWorkflowUseCase,
      buildStepIssuesUsecase,
      controlValuesRepository,
      upsertControlValuesUseCase,
      {},
      {},
      analyticsService,
      { warn: vi.fn() } as unknown as PinoLogger,
      sendWebhookMessage
    );
  });

  const upsertStep = (step: Partial<UpsertStepDataCommand>) =>
    usecase.execute({
      user,
      workflowIdOrInternalId: WORKFLOW_ID,
      workflowDto: {
        name: 'Alerts',
        origin: ResourceOriginEnum.NOVU_CLOUD,
        steps: [{ _id: STEP_TEMPLATE_ID, name: 'Tool', type: StepTypeEnum.TOOL, ...step }],
      },
    } as UpsertWorkflowCommand);

  const integrationLevelCalls = (mock: ReturnType<typeof vi.fn>) =>
    mock.mock.calls.filter(([query]) => query.level === ControlValuesLevelEnum.STEP_INTEGRATION_CONTROLS);

  it('leaves stored integration overrides untouched when the step omits them', async () => {
    await upsertStep({});

    expect(integrationLevelCalls(controlValuesRepository.find)).toHaveLength(0);
    expect(controlValuesRepository.deleteMany).not.toHaveBeenCalled();
    expect(upsertControlValuesUseCase.execute).not.toHaveBeenCalled();
  });

  it('deletes every integration override of the step when the request sends null', async () => {
    await upsertStep({ integrationOverrides: null });

    expect(controlValuesRepository.deleteMany).toHaveBeenCalledTimes(1);
    expect(controlValuesRepository.deleteMany.mock.calls[0][0]).toEqual({
      ...stepQuery,
      level: ControlValuesLevelEnum.STEP_INTEGRATION_CONTROLS,
    });
    expect(upsertControlValuesUseCase.execute).not.toHaveBeenCalled();
  });

  it('replaces the stored set: drops removed pairs and upserts the requested ones', async () => {
    controlValuesRepository.find.mockImplementation(async (query) =>
      query.level === ControlValuesLevelEnum.STEP_INTEGRATION_CONTROLS
        ? [
            { _id: 'doc-prod', providerId: ToolProviderIdEnum.Webhook, integrationIdentifier: 'prod-alerts' },
            { _id: 'doc-staging', providerId: ToolProviderIdEnum.Webhook, integrationIdentifier: 'staging-alerts' },
            { _id: 'doc-slack', providerId: ChatProviderIdEnum.Slack, integrationIdentifier: 'prod-alerts' },
          ]
        : []
    );

    await upsertStep({
      integrationOverrides: {
        [ToolProviderIdEnum.Webhook]: { 'prod-alerts': { alert_type: 'incident' }, 'new-alerts': {}, '': {} },
        'not-a-provider': { 'prod-alerts': { foo: 'bar' } },
      } as UpsertStepDataCommand['integrationOverrides'],
    });

    expect(integrationLevelCalls(controlValuesRepository.find)[0][0]).toEqual({
      ...stepQuery,
      level: ControlValuesLevelEnum.STEP_INTEGRATION_CONTROLS,
    });
    expect(controlValuesRepository.deleteMany).toHaveBeenCalledTimes(1);
    expect(controlValuesRepository.deleteMany.mock.calls[0][0]).toEqual({
      ...stepQuery,
      level: ControlValuesLevelEnum.STEP_INTEGRATION_CONTROLS,
      _id: { $in: ['doc-staging', 'doc-slack'] },
    });

    const upserts = upsertControlValuesUseCase.execute.mock.calls.map(([command]) => ({
      level: command.level,
      stepId: command.stepId,
      workflowId: command.workflowId,
      providerId: command.providerId,
      integrationIdentifier: command.integrationIdentifier,
      newControlValues: command.newControlValues,
    }));
    expect(upserts).toEqual([
      {
        level: ControlValuesLevelEnum.STEP_INTEGRATION_CONTROLS,
        stepId: STEP_TEMPLATE_ID,
        workflowId: WORKFLOW_ID,
        providerId: ToolProviderIdEnum.Webhook,
        integrationIdentifier: 'prod-alerts',
        newControlValues: { alert_type: 'incident' },
      },
      {
        level: ControlValuesLevelEnum.STEP_INTEGRATION_CONTROLS,
        stepId: STEP_TEMPLATE_ID,
        workflowId: WORKFLOW_ID,
        providerId: ToolProviderIdEnum.Webhook,
        integrationIdentifier: 'new-alerts',
        newControlValues: {},
      },
    ]);
  });

  it('does not delete anything when the requested set already matches the stored one', async () => {
    controlValuesRepository.find.mockImplementation(async (query) =>
      query.level === ControlValuesLevelEnum.STEP_INTEGRATION_CONTROLS
        ? [{ _id: 'doc-prod', providerId: ToolProviderIdEnum.Webhook, integrationIdentifier: 'prod-alerts' }]
        : []
    );

    await upsertStep({
      integrationOverrides: { [ToolProviderIdEnum.Webhook]: { 'prod-alerts': { alert_type: 'test' } } },
    });

    expect(controlValuesRepository.deleteMany).not.toHaveBeenCalled();
    expect(upsertControlValuesUseCase.execute).toHaveBeenCalledTimes(1);
  });

  it('reconciles provider overrides through the same path, keyed by providerId alone', async () => {
    controlValuesRepository.find.mockImplementation(async (query) =>
      query.level === ControlValuesLevelEnum.STEP_PROVIDER_CONTROLS
        ? [
            { _id: 'doc-webhook', providerId: ToolProviderIdEnum.Webhook },
            { _id: 'doc-pagerduty', providerId: ToolProviderIdEnum.PagerDuty },
          ]
        : []
    );

    await upsertStep({ providerOverrides: { [ToolProviderIdEnum.Webhook]: { env: 'all' } } });

    expect(controlValuesRepository.deleteMany).toHaveBeenCalledTimes(1);
    expect(controlValuesRepository.deleteMany.mock.calls[0][0]).toEqual({
      ...stepQuery,
      level: ControlValuesLevelEnum.STEP_PROVIDER_CONTROLS,
      _id: { $in: ['doc-pagerduty'] },
    });
    expect(upsertControlValuesUseCase.execute).toHaveBeenCalledTimes(1);
    expect(upsertControlValuesUseCase.execute.mock.calls[0][0]).toMatchObject({
      level: ControlValuesLevelEnum.STEP_PROVIDER_CONTROLS,
      providerId: ToolProviderIdEnum.Webhook,
      integrationIdentifier: undefined,
      newControlValues: { env: 'all' },
    });
  });

  it('writes overrides sent alongside a null controlValues only after the cascade delete', async () => {
    const order: string[] = [];
    controlValuesRepository.deleteMany.mockImplementation(async (query) => {
      await new Promise((resolve) => setTimeout(resolve, 5));
      order.push(`delete:${JSON.stringify(query.level)}`);
    });
    upsertControlValuesUseCase.execute.mockImplementation(async (command) => {
      order.push(`upsert:${command.level}`);
    });

    await upsertStep({
      controlValues: null,
      integrationOverrides: { [ToolProviderIdEnum.Webhook]: { 'prod-alerts': { env: 'prod' } } },
    });

    expect(order[0]).toMatch(/^delete:/);
    expect(order.at(-1)).toBe(`upsert:${ControlValuesLevelEnum.STEP_INTEGRATION_CONTROLS}`);
  });

  it('preloads integration controls and validates the requested integration overrides', async () => {
    const integrationOverrides = { [ToolProviderIdEnum.Webhook]: { 'prod-alerts': { alert_type: 'incident' } } };

    await upsertStep({ integrationOverrides });

    const [preloadQuery, preloadProjection] = controlValuesRepository.find.mock.calls[0];
    expect(preloadQuery.level).toEqual({
      $in: [
        ControlValuesLevelEnum.STEP_CONTROLS,
        ControlValuesLevelEnum.STEP_PROVIDER_CONTROLS,
        ControlValuesLevelEnum.STEP_INTEGRATION_CONTROLS,
      ],
    });
    expect(preloadProjection).toMatchObject({ providerId: 1, integrationIdentifier: 1 });
    expect(buildStepIssuesUsecase.execute.mock.calls[0][0].integrationOverridesDto).toEqual(integrationOverrides);
  });

  it('cascades integration controls when the step controls are deleted', async () => {
    await upsertStep({ controlValues: null });

    expect(controlValuesRepository.deleteMany.mock.calls[0][0]).toEqual({
      ...stepQuery,
      level: {
        $in: [
          ControlValuesLevelEnum.STEP_CONTROLS,
          ControlValuesLevelEnum.STEP_PROVIDER_CONTROLS,
          ControlValuesLevelEnum.STEP_INTEGRATION_CONTROLS,
        ],
      },
    });
  });

  it('never persists integrationOverrides nested inside the main step controls', async () => {
    await upsertStep({
      controlValues: { body: 'hello', integrationOverrides: { [ToolProviderIdEnum.Webhook]: { prod: {} } } },
    });

    const stepControlsUpsert = upsertControlValuesUseCase.execute.mock.calls.find(
      ([command]) => command.level === ControlValuesLevelEnum.STEP_CONTROLS
    );
    expect(stepControlsUpsert?.[0].newControlValues).toEqual({ body: 'hello' });
  });
});
