import { IntegrationRepository } from '@novu/dal';
import { ChannelTypeEnum, SmsProviderIdEnum } from '@novu/shared';
import { UserSession } from '@novu/testing';
import { expect } from 'chai';
import { deactivateMisconfiguredInfobipSmsIntegrations } from './deactivate-misconfigured-infobip-sms-integrations.migration';

describe('Deactivate misconfigured Infobip SMS integrations', () => {
  const integrationRepository = new IntegrationRepository();

  it('deactivates active Infobip SMS integrations with missing baseUrl', async () => {
    const session = new UserSession();
    await session.initialize();

    await pruneIntegrations(integrationRepository, session);

    const integration = await integrationRepository.create({
      _environmentId: session.environment._id,
      _organizationId: session.organization._id,
      providerId: SmsProviderIdEnum.Infobip,
      channel: ChannelTypeEnum.SMS,
      credentials: { apiKey: 'test-key' },
      active: true,
    });

    await deactivateMisconfiguredInfobipSmsIntegrations();

    const updated = await integrationRepository.findOne({
      _id: integration._id,
      _environmentId: session.environment._id,
    });

    expect(updated?.active).to.equal(false);
  });

  it('keeps active Infobip SMS integrations with a valid baseUrl', async () => {
    const session = new UserSession();
    await session.initialize();

    await pruneIntegrations(integrationRepository, session);

    const integration = await integrationRepository.create({
      _environmentId: session.environment._id,
      _organizationId: session.organization._id,
      providerId: SmsProviderIdEnum.Infobip,
      channel: ChannelTypeEnum.SMS,
      credentials: {
        apiKey: 'test-key',
        baseUrl: 'https://abc123.api.infobip.com',
      },
      active: true,
    });

    await deactivateMisconfiguredInfobipSmsIntegrations();

    const updated = await integrationRepository.findOne({
      _id: integration._id,
      _environmentId: session.environment._id,
    });

    expect(updated?.active).to.equal(true);
  });
});

async function pruneIntegrations(integrationRepository: IntegrationRepository, session: UserSession) {
  const existing = await integrationRepository.find({
    _environmentId: session.environment._id,
    _organizationId: session.organization._id,
    providerId: SmsProviderIdEnum.Infobip,
  });

  for (const integration of existing) {
    await integrationRepository.delete({ _id: integration._id });
  }
}
