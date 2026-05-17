import { FeatureFlagsService } from '@novu/application-generic';
import { IntegrationRepository } from '@novu/dal';
import { ChannelTypeEnum, EnvironmentEnum, EnvironmentTypeEnum, InAppProviderIdEnum } from '@novu/shared';
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

  const baseCommandFields = {
    environmentId: 'env-id',
    organizationId: 'org-id',
    userId: 'user-id',
    name: EnvironmentEnum.PRODUCTION,
    channels: [ChannelTypeEnum.IN_APP],
  } as const;

  beforeEach(() => {
    createIntegration = sinon.createStubInstance(CreateIntegration);
    integrationRepository = sinon.createStubInstance(IntegrationRepository);
    setIntegrationAsPrimary = sinon.createStubInstance(SetIntegrationAsPrimary);
    featureFlagsService = sinon.createStubInstance(FeatureFlagsService);

    integrationRepository.count.resolves(0);
    featureFlagsService.getFlag.resolves(false);
    createIntegration.execute.resolves({ _id: 'integration-id' } as any);

    useCase = new CreateNovuIntegrations(
      createIntegration as any,
      integrationRepository as any,
      setIntegrationAsPrimary as any,
      featureFlagsService as any
    );
  });

  it('should enable HMAC by default for the in-app integration when the environment is PROD', async () => {
    await useCase.execute(
      CreateNovuIntegrationsCommand.create({
        ...baseCommandFields,
        environmentType: EnvironmentTypeEnum.PROD,
      })
    );

    expect(createIntegration.execute.calledOnce).to.equal(true);
    const passedCommand = createIntegration.execute.firstCall.args[0];
    expect(passedCommand.providerId).to.equal(InAppProviderIdEnum.Novu);
    expect(passedCommand.channel).to.equal(ChannelTypeEnum.IN_APP);
    expect(passedCommand.credentials).to.deep.equal({ hmac: true });
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
