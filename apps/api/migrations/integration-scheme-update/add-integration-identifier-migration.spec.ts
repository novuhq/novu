import { expect } from 'chai';
import { UserSession } from '@novu/testing';

import { IntegrationRepository, EnvironmentRepository } from '@novu/dal';
import { ChannelTypeEnum, EmailProviderIdEnum, InAppProviderIdEnum, SmsProviderIdEnum } from '@novu/shared';

import {
  addIntegrationIdentifierMigration,
  addIntegrationIdentifierMigrationBatched,
  genIntegrationIdentificationDetails,
} from './add-integration-identifier-migration';

describe('Add default identifier and name to integration entity', function () {
  let session: UserSession;
  const integrationRepository = new IntegrationRepository();
  const environmentRepository = new EnvironmentRepository();

  beforeEach(async () => {
    session = new UserSession();
    await session.initialize();
    await pruneIntegration(integrationRepository);
  });

  it('should identifier and name to integration entity', async function () {
    await integrationRepository.create({
      _environmentId: session.environment._id,
      _organizationId: session.organization._id,
      channel: ChannelTypeEnum.EMAIL,
      providerId: EmailProviderIdEnum.SendGrid,
      active: true,
    });

    await integrationRepository.create({
      _environmentId: session.environment._id,
      _organizationId: session.organization._id,
      channel: ChannelTypeEnum.SMS,
      providerId: SmsProviderIdEnum.SNS,
      active: true,
    });

    await integrationRepository.create({
      _environmentId: session.environment._id,
      _organizationId: session.organization._id,
      channel: ChannelTypeEnum.IN_APP,
      providerId: InAppProviderIdEnum.Novu,
      active: true,
    });

    const createdIntegrations = await integrationRepository.find({
      _environmentId: session.environment._id,
      _organizationId: session.organization._id,
    } as any);

    expect(createdIntegrations.length).to.equal(3);

    for (const integration of createdIntegrations) {
      expect(integration.name).to.not.exist;
      expect(integration.identifier).to.not.exist;
    }

    await addIntegrationIdentifierMigration();

    const updatedIntegration = await integrationRepository.find({
      _environmentId: session.environment._id,
      _organizationId: session.organization._id,
    } as any);

    for (const integration of updatedIntegration) {
      const { name, identifier } = genIntegrationIdentificationDetails({ providerId: integration.providerId });

      expect(integration.name).to.equal(name);
      expect(integration.identifier).to.contain(identifier.split('-')[0]);
    }
  });

  it('should identifier and name to integration entity (batched)', async function () {
    await integrationRepository.create({
      _environmentId: session.environment._id,
      _organizationId: session.organization._id,
      channel: ChannelTypeEnum.EMAIL,
      providerId: EmailProviderIdEnum.SendGrid,
      active: true,
    });

    await integrationRepository.create({
      _environmentId: session.environment._id,
      _organizationId: session.organization._id,
      channel: ChannelTypeEnum.SMS,
      providerId: SmsProviderIdEnum.SNS,
      active: true,
    });

    await integrationRepository.create({
      _environmentId: session.environment._id,
      _organizationId: session.organization._id,
      channel: ChannelTypeEnum.IN_APP,
      providerId: InAppProviderIdEnum.Novu,
      active: true,
    });

    const createdIntegrations = await integrationRepository.find({
      _environmentId: session.environment._id,
      _organizationId: session.organization._id,
    } as any);

    expect(createdIntegrations.length).to.equal(3);

    for (const integration of createdIntegrations) {
      expect(integration.name).to.not.exist;
      expect(integration.identifier).to.not.exist;
    }

    await addIntegrationIdentifierMigrationBatched();

    const updatedIntegration = await integrationRepository.find({
      _environmentId: session.environment._id,
      _organizationId: session.organization._id,
    } as any);

    for (const integration of updatedIntegration) {
      const { name, identifier } = genIntegrationIdentificationDetails({ providerId: integration.providerId });

      expect(integration.name).to.equal(name);
      expect(integration.identifier).to.contain(identifier.split('-')[0]);
    }
  });
});

async function pruneIntegration(integrationRepository) {
  const old = await integrationRepository.find({});

  for (const integration of old) {
    await integrationRepository.delete({ _id: integration._id, _environmentId: integration._environmentId });
  }
}
