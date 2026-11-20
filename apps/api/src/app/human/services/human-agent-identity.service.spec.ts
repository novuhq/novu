import { ChatProviderIdEnum } from '@novu/shared';
import { expect } from 'chai';
import sinon from 'sinon';
import { HumanAgentIdentityService } from './human-agent-identity.service';

describe('HumanAgentIdentityService', () => {
  const agent = {
    _id: 'relay1',
    identifier: 'human-relay',
    name: 'Human',
    _environmentId: 'env1',
    _organizationId: 'org1',
  };

  function setup() {
    const agentRepository = { updateOne: sinon.stub().resolves() };
    /** The links of other agents to the integrations asked about: none unless a test says so. */
    const otherAgentLinks: { _integrationId: string }[] = [];
    const agentIntegrationRepository = {
      find: sinon
        .stub()
        .callsFake(async (query: { _agentId: unknown }) =>
          typeof query._agentId === 'object' ? otherAgentLinks : [{ _integrationId: 'tg1' }]
        ),
    };
    const integrationRepository = {
      find: sinon
        .stub()
        .resolves([{ providerId: ChatProviderIdEnum.Telegram, credentials: { apiToken: 'bot-token' } }]),
    };
    const syncAgentEmailSenderName = { execute: sinon.stub().resolves() };
    const telegramBotProfile = { apply: sinon.stub().resolves() };
    const whatsAppBusinessProfile = { apply: sinon.stub().resolves() };
    const service = new HumanAgentIdentityService(
      agentRepository as never,
      agentIntegrationRepository as never,
      integrationRepository as never,
      syncAgentEmailSenderName as never,
      telegramBotProfile as never,
      whatsAppBusinessProfile as never
    );

    return {
      service,
      otherAgentLinks,
      agentRepository,
      integrationRepository,
      syncAgentEmailSenderName,
      telegramBotProfile,
      whatsAppBusinessProfile,
    };
  }

  it('saves a new name and carries it to the emails and the Telegram bot', async () => {
    const { service, agentRepository, integrationRepository, syncAgentEmailSenderName, telegramBotProfile } = setup();

    const updated = await service.apply(agent as never, { name: ' Deploy bot ' });

    expect(updated.name).to.equal('Deploy bot');
    expect(agentRepository.updateOne.firstCall.args[1]).to.deep.equal({ $set: { name: 'Deploy bot' } });
    expect(syncAgentEmailSenderName.execute.firstCall.args[1]).to.equal('Deploy bot');
    expect(integrationRepository.find.firstCall.args[0].providerId).to.deep.equal({
      $in: [ChatProviderIdEnum.Telegram, ChatProviderIdEnum.WhatsAppBusiness],
    });
    expect(telegramBotProfile.apply.firstCall.args[1]).to.deep.equal({ name: 'Deploy bot' });
  });

  it('leaves the name unsaved when the emails could not be updated, so the same change can be sent again', async () => {
    const { service, agentRepository, syncAgentEmailSenderName } = setup();
    syncAgentEmailSenderName.execute.onFirstCall().rejects(new Error('database is away'));

    let failed = false;
    try {
      await service.apply(agent as never, { name: 'Deploy bot' });
    } catch {
      failed = true;
    }

    expect(failed).to.equal(true);
    expect(agentRepository.updateOne.called).to.equal(false);

    await service.apply(agent as never, { name: 'Deploy bot' });

    expect(syncAgentEmailSenderName.execute.callCount).to.equal(2);
    expect(agentRepository.updateOne.calledOnce).to.equal(true);
  });

  it('changes nothing when the name and description are the ones it has', async () => {
    const { service, agentRepository, telegramBotProfile } = setup();

    const updated = await service.apply(agent as never, { name: 'Human', description: '' });

    expect(updated).to.equal(agent);
    expect(agentRepository.updateOne.called).to.equal(false);
    expect(telegramBotProfile.apply.called).to.equal(false);
  });

  it('keeps the name when given a blank one, and leaves the email sender alone', async () => {
    const { service, agentRepository, syncAgentEmailSenderName } = setup();

    await service.apply(agent as never, { name: '   ', description: 'Ships the app.' });

    expect(agentRepository.updateOne.firstCall.args[1]).to.deep.equal({ $set: { description: 'Ships the app.' } });
    expect(syncAgentEmailSenderName.execute.called).to.equal(false);
  });

  it('clears a description with an empty one', async () => {
    const { service, agentRepository } = setup();

    await service.apply({ ...agent, description: 'Ships the app.' } as never, { description: '' });

    expect(agentRepository.updateOne.firstCall.args[1]).to.deep.equal({ $set: { description: '' } });
  });

  it('carries a description and picture to a WhatsApp business number, but never the name', async () => {
    const { service, integrationRepository, telegramBotProfile, whatsAppBusinessProfile } = setup();
    integrationRepository.find.resolves([
      {
        _id: 'wa1',
        providerId: ChatProviderIdEnum.WhatsAppBusiness,
        credentials: { apiToken: 'meta-token', phoneNumberIdentification: 'phone1', isNovuManaged: true },
      },
    ]);
    const picture = { storageKey: 'org1/env1/agents/relay1/picture-1.png', contentType: 'image/png' };

    await service.updateChannelProfiles(agent as never, { name: 'Deploy bot', description: 'Ships it.', picture });

    expect(telegramBotProfile.apply.called).to.equal(false);
    expect(whatsAppBusinessProfile.apply.firstCall.args).to.deep.equal([
      { accessToken: 'meta-token', phoneNumberId: 'phone1', isNovuManaged: true },
      { description: 'Ships it.', picture },
    ]);
  });

  it('leaves a WhatsApp integration alone until its number is connected', async () => {
    const { service, integrationRepository, whatsAppBusinessProfile } = setup();
    integrationRepository.find.resolves([{ providerId: ChatProviderIdEnum.WhatsAppBusiness, credentials: {} }]);

    await service.updateChannelProfiles(agent as never, { description: 'Ships it.' });

    expect(whatsAppBusinessProfile.apply.called).to.equal(false);
  });

  it('leaves alone a WhatsApp number another agent speaks through too', async () => {
    const { service, integrationRepository, otherAgentLinks, whatsAppBusinessProfile } = setup();
    integrationRepository.find.resolves([
      {
        _id: 'wa1',
        providerId: ChatProviderIdEnum.WhatsAppBusiness,
        credentials: { apiToken: 'meta-token', phoneNumberIdentification: 'phone1' },
      },
    ]);
    otherAgentLinks.push({ _integrationId: 'wa1' });

    await service.updateChannelProfiles(agent as never, { description: 'Ships it.' });

    expect(whatsAppBusinessProfile.apply.called).to.equal(false);
  });
});
