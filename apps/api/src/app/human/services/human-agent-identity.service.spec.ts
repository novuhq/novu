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
    const agentIntegrationRepository = { find: sinon.stub().resolves([{ _integrationId: 'tg1' }]) };
    const integrationRepository = { find: sinon.stub().resolves([{ credentials: { apiToken: 'bot-token' } }]) };
    const syncAgentEmailSenderName = { execute: sinon.stub().resolves() };
    const telegramBotProfile = { apply: sinon.stub().resolves() };
    const service = new HumanAgentIdentityService(
      agentRepository as never,
      agentIntegrationRepository as never,
      integrationRepository as never,
      syncAgentEmailSenderName as never,
      telegramBotProfile as never
    );

    return { service, agentRepository, integrationRepository, syncAgentEmailSenderName, telegramBotProfile };
  }

  it('saves a new name and carries it to the emails and the Telegram bot', async () => {
    const { service, agentRepository, integrationRepository, syncAgentEmailSenderName, telegramBotProfile } = setup();

    const updated = await service.apply(agent as never, { name: ' Deploy bot ' });

    expect(updated.name).to.equal('Deploy bot');
    expect(agentRepository.updateOne.firstCall.args[1]).to.deep.equal({ $set: { name: 'Deploy bot' } });
    expect(syncAgentEmailSenderName.execute.firstCall.args[1]).to.equal('Deploy bot');
    expect(integrationRepository.find.firstCall.args[0].providerId).to.equal(ChatProviderIdEnum.Telegram);
    expect(telegramBotProfile.apply.firstCall.args[1]).to.deep.equal({ name: 'Deploy bot' });
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
});
