import { AnalyticsService, FeatureFlagsService } from '@novu/application-generic';
import { IntegrationRepository } from '@novu/dal';
import {
  AgentRuntimeProviderIdEnum,
  ChannelTypeEnum,
  EnvironmentEnum,
  EnvironmentTypeEnum,
  FeatureFlagsKeysEnum,
  InAppProviderIdEnum,
  IntegrationKindEnum,
} from '@novu/shared';
import { expect } from 'chai';
import sinon from 'sinon';

import { CreateIntegration } from '../create-integration/create-integration.usecase';
import { SetIntegrationAsPrimary } from '../set-integration-as-primary/set-integration-as-primary.usecase';
import { CreateNovuIntegrationsCommand } from './create-novu-integrations.command';
import { CreateNovuIntegrations } from './create-novu-integrations.usecase';

describe('CreateNovuIntegrations - in-app HMAC defaults', () => {
  let useCase: CreateNovuIntegrations;
  let createIntegration: sinon.SinonStubbedInstance<CreateIntegration>;
  let integrationRepository: sinon.SinonStubbedInstance<IntegrationRepository>;
  let setIntegrationAsPrimary: sinon.SinonStubbedInstance<SetIntegrationAsPrimary>;
  let featureFlagsService: sinon.SinonStubbedInstance<FeatureFlagsService>;
  let analyticsService: sinon.SinonStubbedInstance<AnalyticsService>;
  let previousManagedClaudeApiKey: string | undefined;

  const baseCommandFields = {
    environmentId: 'env-id',
    organizationId: 'org-id',
    userId: 'user-id',
    name: EnvironmentEnum.PRODUCTION,
    channels: [ChannelTypeEnum.IN_APP],
  } as const;

  const validIntegrationId = '507f1f77bcf86cd799439011';

  beforeEach(() => {
    previousManagedClaudeApiKey = process.env.NOVU_MANAGED_CLAUDE_API_KEY;
    process.env.NOVU_MANAGED_CLAUDE_API_KEY = '';

    createIntegration = sinon.createStubInstance(CreateIntegration);
    integrationRepository = sinon.createStubInstance(IntegrationRepository);
    setIntegrationAsPrimary = sinon.createStubInstance(SetIntegrationAsPrimary);
    featureFlagsService = sinon.createStubInstance(FeatureFlagsService);
    analyticsService = sinon.createStubInstance(AnalyticsService);

    integrationRepository.count.resolves(0);
    featureFlagsService.getFlag.resolves(false);
    createIntegration.execute.resolves({ _id: validIntegrationId } as any);

    useCase = new CreateNovuIntegrations(
      createIntegration as any,
      integrationRepository as any,
      setIntegrationAsPrimary as any,
      featureFlagsService as any,
      analyticsService as any
    );
  });

  afterEach(() => {
    process.env.NOVU_MANAGED_CLAUDE_API_KEY = previousManagedClaudeApiKey;
  });

  it('should enable HMAC by default for the in-app integration when the environment is PROD', async () => {
    await useCase.execute({
      environmentId: 'env-id',
      organizationId: 'org-id',
      userId: 'user-id',
      name: EnvironmentEnum.PRODUCTION,
      channels: [ChannelTypeEnum.IN_APP],
      environmentType: EnvironmentTypeEnum.PROD,
    } as CreateNovuIntegrationsCommand);

    const inAppCall = createIntegration.execute
      .getCalls()
      .find((call) => call.args[0].providerId === InAppProviderIdEnum.Novu);

    expect(inAppCall).to.not.equal(undefined);
    expect(inAppCall?.args[0].credentials).to.deep.equal({ hmac: true });
  });

  it('should NOT enable HMAC by default for the in-app integration when the environment is DEV', async () => {
    await useCase.execute(
      CreateNovuIntegrationsCommand.create({
        ...baseCommandFields,
        name: EnvironmentEnum.DEVELOPMENT,
        environmentType: EnvironmentTypeEnum.DEV,
      })
    );

    expect(createIntegration.execute.calledOnce).to.equal(true);
    const passedCommand = createIntegration.execute.firstCall.args[0];
    expect(passedCommand.credentials).to.equal(undefined);
  });

  it('should NOT enable HMAC when environmentType is omitted (keyless/legacy callers)', async () => {
    await useCase.execute(CreateNovuIntegrationsCommand.create(baseCommandFields));

    expect(createIntegration.execute.calledOnce).to.equal(true);
    const passedCommand = createIntegration.execute.firstCall.args[0];
    expect(passedCommand.credentials).to.equal(undefined);
  });
});

describe('CreateNovuIntegrations - managed Claude demo integration', () => {
  let useCase: CreateNovuIntegrations;
  let createIntegration: sinon.SinonStubbedInstance<CreateIntegration>;
  let integrationRepository: sinon.SinonStubbedInstance<IntegrationRepository>;
  let setIntegrationAsPrimary: sinon.SinonStubbedInstance<SetIntegrationAsPrimary>;
  let featureFlagsService: sinon.SinonStubbedInstance<FeatureFlagsService>;
  let analyticsService: sinon.SinonStubbedInstance<AnalyticsService>;
  let previousApiKey: string | undefined;
  const validIntegrationId = '507f1f77bcf86cd799439011';

  beforeEach(() => {
    previousApiKey = process.env.NOVU_MANAGED_CLAUDE_API_KEY;
    process.env.NOVU_MANAGED_CLAUDE_API_KEY = 'sk-ant-demo';

    createIntegration = sinon.createStubInstance(CreateIntegration);
    integrationRepository = sinon.createStubInstance(IntegrationRepository);
    setIntegrationAsPrimary = sinon.createStubInstance(SetIntegrationAsPrimary);
    featureFlagsService = sinon.createStubInstance(FeatureFlagsService);
    analyticsService = sinon.createStubInstance(AnalyticsService);

    integrationRepository.count.resolves(0);
    featureFlagsService.getFlag.resolves(false);
    createIntegration.execute.resolves({ _id: validIntegrationId } as any);

    useCase = new CreateNovuIntegrations(
      createIntegration as any,
      integrationRepository as any,
      setIntegrationAsPrimary as any,
      featureFlagsService as any,
      analyticsService as any
    );
  });

  afterEach(() => {
    process.env.NOVU_MANAGED_CLAUDE_API_KEY = previousApiKey;
  });

  it('should provision novu-anthropic on Development when feature flag is enabled', async () => {
    featureFlagsService.getFlag.callsFake(
      async ({ key }) => key === FeatureFlagsKeysEnum.IS_DEMO_MANAGED_CLAUDE_ENABLED
    );

    await useCase.execute(
      CreateNovuIntegrationsCommand.create({
        environmentId: 'env-id',
        organizationId: 'org-id',
        userId: 'user-id',
        name: EnvironmentEnum.DEVELOPMENT,
        environmentType: EnvironmentTypeEnum.DEV,
      })
    );

    const managedClaudeCall = createIntegration.execute
      .getCalls()
      .find((call) => call.args[0].providerId === AgentRuntimeProviderIdEnum.NovuAnthropic);

    expect(managedClaudeCall).to.not.equal(undefined);
    expect(managedClaudeCall?.args[0].kind).to.equal(IntegrationKindEnum.AGENT);
    expect(analyticsService.track.calledOnce).to.equal(true);
  });

  it('should NOT provision novu-anthropic on Production', async () => {
    featureFlagsService.getFlag.resolves(true);

    await useCase.execute(
      CreateNovuIntegrationsCommand.create({
        environmentId: 'env-id',
        organizationId: 'org-id',
        userId: 'user-id',
        name: EnvironmentEnum.PRODUCTION,
        environmentType: EnvironmentTypeEnum.PROD,
      })
    );

    const managedClaudeCall = createIntegration.execute
      .getCalls()
      .find((call) => call.args[0].providerId === AgentRuntimeProviderIdEnum.NovuAnthropic);

    expect(managedClaudeCall).to.equal(undefined);
  });
});
