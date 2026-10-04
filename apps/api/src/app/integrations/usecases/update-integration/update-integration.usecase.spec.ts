import { ConflictException } from '@nestjs/common';
import { AnalyticsService, PinoLogger } from '@novu/application-generic';
import { ControlValuesRepository, EnvironmentRepository, IntegrationEntity, IntegrationRepository } from '@novu/dal';
import { ChannelTypeEnum, ControlValuesLevelEnum, ToolProviderIdEnum } from '@novu/shared';
import { expect } from 'chai';
import sinon from 'sinon';
import { UpdateIntegrationCommand } from './update-integration.command';
import { UpdateIntegration } from './update-integration.usecase';

const ENVIRONMENT_ID = '507f1f77bcf86cd799439011';
const ORGANIZATION_ID = '507f1f77bcf86cd799439012';
const INTEGRATION_ID = '507f1f77bcf86cd799439013';
const OLD_IDENTIFIER = 'prod-alerts';
const NEW_IDENTIFIER = 'prod-alerts-v2';

const existingIntegration = {
  _id: INTEGRATION_ID,
  _environmentId: ENVIRONMENT_ID,
  _organizationId: ORGANIZATION_ID,
  identifier: OLD_IDENTIFIER,
  providerId: ToolProviderIdEnum.Webhook,
  channel: ChannelTypeEnum.TOOL,
  active: true,
  primary: false,
  priority: 0,
} as IntegrationEntity;

const integrationOverridesScope = {
  _environmentId: ENVIRONMENT_ID,
  _organizationId: ORGANIZATION_ID,
  level: ControlValuesLevelEnum.STEP_INTEGRATION_CONTROLS,
  providerId: ToolProviderIdEnum.Webhook,
};

describe('UpdateIntegration - step integration overrides', () => {
  let useCase: UpdateIntegration;
  let integrationRepository: sinon.SinonStubbedInstance<IntegrationRepository>;
  let controlValuesRepository: sinon.SinonStubbedInstance<ControlValuesRepository>;

  beforeEach(() => {
    integrationRepository = sinon.createStubInstance(IntegrationRepository);
    controlValuesRepository = sinon.createStubInstance(ControlValuesRepository);

    integrationRepository.findOne.callsFake(async (query) =>
      'identifier' in query ? null : ({ ...existingIntegration } as IntegrationEntity)
    );
    integrationRepository.update.resolves({ matched: 1, modified: 1 });
    controlValuesRepository.find.resolves([{ _stepId: 'step-a' }, { _stepId: 'step-b' }] as never);
    controlValuesRepository.delete.resolves({ acknowledged: true, deletedCount: 0 });
    controlValuesRepository.update.resolves({ matched: 2, modified: 2 });

    useCase = new UpdateIntegration(
      integrationRepository as unknown as IntegrationRepository,
      sinon.createStubInstance(AnalyticsService) as unknown as AnalyticsService,
      sinon.createStubInstance(EnvironmentRepository) as unknown as EnvironmentRepository,
      { setContext: sinon.stub(), trace: sinon.stub() } as unknown as PinoLogger,
      controlValuesRepository as unknown as ControlValuesRepository
    );
  });

  function execute(fields: Partial<UpdateIntegrationCommand>) {
    return useCase.execute({
      userId: 'user-id',
      organizationId: ORGANIZATION_ID,
      integrationId: INTEGRATION_ID,
      ...fields,
    } as UpdateIntegrationCommand);
  }

  it('re-keys the integration\u2019s step overrides to the new identifier, scoped to its environment and organization', async () => {
    await execute({ identifier: NEW_IDENTIFIER });

    expect(controlValuesRepository.update.calledOnce).to.equal(true);
    expect(controlValuesRepository.update.firstCall.args.slice(0, 2)).to.deep.equal([
      { ...integrationOverridesScope, integrationIdentifier: OLD_IDENTIFIER },
      { $set: { integrationIdentifier: NEW_IDENTIFIER } },
    ]);
    expect(controlValuesRepository.update.calledAfter(integrationRepository.update)).to.equal(true);
  });

  it('drops overrides left under the new identifier on the same steps, so the renamed integration\u2019s win', async () => {
    await execute({ identifier: NEW_IDENTIFIER });

    expect(controlValuesRepository.find.firstCall.args[0]).to.deep.equal({
      ...integrationOverridesScope,
      integrationIdentifier: OLD_IDENTIFIER,
    });
    expect(controlValuesRepository.delete.calledOnce).to.equal(true);
    expect(controlValuesRepository.delete.firstCall.args[0]).to.deep.equal({
      ...integrationOverridesScope,
      integrationIdentifier: NEW_IDENTIFIER,
      _stepId: { $in: ['step-a', 'step-b'] },
    });
    expect(controlValuesRepository.delete.calledBefore(controlValuesRepository.update)).to.equal(true);
  });

  it('writes nothing to step overrides when the integration has none', async () => {
    controlValuesRepository.find.resolves([]);

    await execute({ identifier: NEW_IDENTIFIER });

    expect(controlValuesRepository.delete.called).to.equal(false);
    expect(controlValuesRepository.update.called).to.equal(false);
  });

  it('leaves step overrides alone when the identifier is unchanged', async () => {
    await execute({ name: 'Prod alerts', identifier: OLD_IDENTIFIER });
    await execute({ name: 'Prod alerts' });

    expect(controlValuesRepository.find.called).to.equal(false);
    expect(controlValuesRepository.delete.called).to.equal(false);
    expect(controlValuesRepository.update.called).to.equal(false);
  });

  it('leaves step overrides alone when the new identifier is already taken', async () => {
    integrationRepository.findOne.callsFake(async () => ({ ...existingIntegration }) as IntegrationEntity);

    const error = await execute({ identifier: NEW_IDENTIFIER }).catch((caught: unknown) => caught);

    expect(error).to.be.instanceOf(ConflictException);
    expect(controlValuesRepository.update.called).to.equal(false);
  });
});
