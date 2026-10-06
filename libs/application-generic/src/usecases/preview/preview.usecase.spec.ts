import {
  INTEGRATION_OVERRIDES_OUTPUT_KEY,
  ResourceOriginEnum,
  StepTypeEnum,
  ToolProviderIdEnum,
  UserSessionData,
} from '@novu/shared';
import type { PinoLogger } from 'nestjs-pino';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ControlValueSanitizerService } from '../../services/control-value-sanitizer.service';
import { PreviewCommand } from './preview.command';
import { PreviewUsecase } from './preview.usecase';

describe('PreviewUsecase integration overrides', () => {
  const user = { _id: 'user-id', environmentId: 'env-id', organizationId: 'org-id' } as UserSessionData;
  const logger = { error: vi.fn(), warn: vi.fn(), debug: vi.fn() } as unknown as PinoLogger;
  const providerOverrides = { [ToolProviderIdEnum.Webhook]: { env: 'all' } };
  const integrationOverrides = { [ToolProviderIdEnum.Webhook]: { 'prod-alerts': { alert_type: 'incident' } } };
  const stepData = {
    _id: 'template-1',
    stepId: 'tool-step',
    workflowId: 'alerts',
    type: StepTypeEnum.TOOL,
    origin: ResourceOriginEnum.NOVU_CLOUD,
    controls: { values: { body: 'hello' } },
    providerOverrides,
    integrationOverrides,
    variables: { type: 'object', properties: {} },
  };

  const previewStepUsecase = { execute: vi.fn() };
  const buildStepDataUsecase = { execute: vi.fn() };
  const getWorkflowByIdsUseCase = { execute: vi.fn() };
  const createVariablesObject = { execute: vi.fn() };
  const payloadMerger = { mergePayloadExample: vi.fn() };
  const payloadProcessor = {
    enhanceEventCountValue: vi.fn(),
    cleanPreviewExamplePayload: vi.fn(),
    buildState: vi.fn(),
  };
  const environmentVariableRepository = { findByEnvironment: vi.fn() };
  const environmentRepository = { findByIdAndOrganization: vi.fn() };
  let usecase: PreviewUsecase;

  beforeEach(() => {
    vi.resetAllMocks();
    buildStepDataUsecase.execute.mockResolvedValue(stepData);
    getWorkflowByIdsUseCase.execute.mockResolvedValue({ origin: ResourceOriginEnum.NOVU_CLOUD });
    createVariablesObject.execute.mockResolvedValue({});
    payloadMerger.mergePayloadExample.mockResolvedValue({ payload: {} });
    payloadProcessor.enhanceEventCountValue.mockImplementation((payload) => payload);
    payloadProcessor.cleanPreviewExamplePayload.mockImplementation((payload) => payload);
    payloadProcessor.buildState.mockReturnValue([]);
    environmentVariableRepository.findByEnvironment.mockResolvedValue([]);
    environmentRepository.findByIdAndOrganization.mockResolvedValue({ name: 'Development' });
    previewStepUsecase.execute.mockResolvedValue({
      outputs: { body: 'hello' },
      providers: {
        [ToolProviderIdEnum.Webhook]: {
          env: 'all',
          [INTEGRATION_OVERRIDES_OUTPUT_KEY]: { 'prod-alerts': { alert_type: 'incident' } },
        },
      },
    });

    // biome-ignore lint/plugin: the constructor takes a dozen collaborators; only the ones this flow touches are stubbed
    usecase = new (PreviewUsecase as unknown as new (...args: unknown[]) => PreviewUsecase)(
      previewStepUsecase,
      buildStepDataUsecase,
      getWorkflowByIdsUseCase,
      createVariablesObject,
      new ControlValueSanitizerService(logger),
      payloadMerger,
      payloadProcessor,
      {},
      {},
      logger,
      environmentVariableRepository,
      environmentRepository
    );
  });

  const preview = (controlValues?: Record<string, unknown>) =>
    usecase.execute({
      user,
      workflowIdOrInternalId: 'alerts',
      stepIdOrInternalId: 'tool-step',
      generatePreviewRequestDto: controlValues ? { controlValues } : {},
    } as PreviewCommand);

  it('stitches persisted integration overrides into the controls sent to the bridge', async () => {
    await preview();

    const { controls } = previewStepUsecase.execute.mock.calls[0][0];
    expect(controls.providerOverrides).toEqual(providerOverrides);
    expect(controls.integrationOverrides).toEqual(integrationOverrides);
  });

  it('forwards integration overrides nested in the editor control values', async () => {
    const editorIntegrationOverrides = { [ToolProviderIdEnum.Webhook]: { 'staging-alerts': { alert_type: 'test' } } };

    await preview({ body: 'from editor', integrationOverrides: editorIntegrationOverrides });

    const { controls } = previewStepUsecase.execute.mock.calls[0][0];
    expect(controls.integrationOverrides).toEqual(editorIntegrationOverrides);
    expect(controls).not.toHaveProperty('providerOverrides');
  });

  it('returns rendered integration overrides separately from provider overrides', async () => {
    const response = await preview();

    expect(response.result.preview).toEqual({
      body: 'hello',
      providerOverrides: { [ToolProviderIdEnum.Webhook]: { env: 'all' } },
      integrationOverrides: { [ToolProviderIdEnum.Webhook]: { 'prod-alerts': { alert_type: 'incident' } } },
    });
  });
});
