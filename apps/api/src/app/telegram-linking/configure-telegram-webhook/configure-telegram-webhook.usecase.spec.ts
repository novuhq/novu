import { BadGatewayException } from '@nestjs/common';
import { ChatProviderIdEnum } from '@novu/shared';
import Axios from 'axios';
import { expect } from 'chai';
import sinon from 'sinon';

import type { ResolvedTelegramAgent } from '../telegram-agent-link.resolver';
import { ConfigureTelegramWebhookCommand } from './configure-telegram-webhook.command';
import { ConfigureTelegramWebhook } from './configure-telegram-webhook.usecase';

const RELAY_AGENT: ResolvedTelegramAgent = {
  agentId: 'agent-1',
  agentIdentifier: 'human-relay',
  agentName: 'Deploy bot',
  agentRuntime: 'human_relay',
};

function buildCommand(): ConfigureTelegramWebhookCommand {
  return {
    userId: 'user-1',
    environmentId: 'env-1',
    organizationId: 'org-1',
    integrationIdentifier: 'telegram',
  } as ConfigureTelegramWebhookCommand;
}

describe('ConfigureTelegramWebhook', () => {
  const savedEncryptionKey = process.env.STORE_ENCRYPTION_KEY;
  const savedApiHostname = process.env.AGENT_API_HOSTNAME;
  let setWebhook: sinon.SinonStub;
  let getMe: sinon.SinonStub;

  function setup(agent: ResolvedTelegramAgent | null = RELAY_AGENT) {
    const integrationRepository = {
      findOne: sinon.stub().resolves({
        _id: 'integration-1',
        identifier: 'telegram',
        providerId: ChatProviderIdEnum.Telegram,
        credentials: { apiToken: 'bot-token' },
      }),
      update: sinon.stub().resolves(),
    };
    const agentLinkResolver = { resolveOptional: sinon.stub().resolves(agent) };
    const botProfile = { apply: sinon.stub().resolves() };
    const usecase = new ConfigureTelegramWebhook(
      integrationRepository as never,
      agentLinkResolver as never,
      botProfile as never
    );

    return { usecase, integrationRepository, botProfile };
  }

  beforeEach(() => {
    process.env.STORE_ENCRYPTION_KEY = '12345678901234567890123456789012';
    process.env.AGENT_API_HOSTNAME = 'https://api.example.com';
    setWebhook = sinon.stub(Axios, 'post').resolves({ data: { ok: true } });
    getMe = sinon.stub(Axios, 'get').resolves({ data: { ok: true, result: { username: 'atlas_bot' } } });
  });

  afterEach(() => {
    sinon.restore();
    for (const [name, value] of [
      ['STORE_ENCRYPTION_KEY', savedEncryptionKey],
      ['AGENT_API_HOSTNAME', savedApiHostname],
    ] as const) {
      if (value === undefined) {
        delete process.env[name];
      } else {
        process.env[name] = value;
      }
    }
  });

  it('changes nothing when Telegram refuses the bot', async () => {
    getMe.resolves({ data: { ok: false, description: 'Unauthorized' } });
    const { usecase, integrationRepository, botProfile } = setup();

    const failure = await usecase.execute(buildCommand()).catch((err: unknown) => err);

    expect(failure).to.be.instanceOf(BadGatewayException);
    expect(setWebhook.called).to.equal(false);
    expect(botProfile.apply.called).to.equal(false);
    expect(integrationRepository.update.called).to.equal(false);
  });

  it('saves the webhook secret last', async () => {
    const { usecase, integrationRepository, botProfile } = setup();

    const result = await usecase.execute(buildCommand());

    expect(result.botUsername).to.equal('atlas_bot');
    sinon.assert.callOrder(getMe, setWebhook, botProfile.apply, integrationRepository.update);
  });

  it('saves no secret when the webhook fails', async () => {
    setWebhook.resolves({ data: { ok: false, description: 'Bad Request' } });
    const { usecase, integrationRepository } = setup();

    const failure = await usecase.execute(buildCommand()).catch((err: unknown) => err);

    expect(failure).to.be.instanceOf(BadGatewayException);
    expect(integrationRepository.update.called).to.equal(false);
  });

  it('gives the bot of a Human agent with no picture the default one, if the bot has no photo', async () => {
    const { usecase, botProfile } = setup();

    await usecase.execute(buildCommand());

    expect(botProfile.apply.firstCall.args).to.deep.equal([
      'bot-token',
      { name: 'Deploy bot', picture: 'default-if-none' },
    ]);
  });

  it('gives the bot of a Human agent its own picture', async () => {
    const picture = { storageKey: 'key', contentType: 'image/png', version: 'v1' };
    const { usecase, botProfile } = setup({ ...RELAY_AGENT, agentPicture: picture });

    await usecase.execute(buildCommand());

    expect(botProfile.apply.firstCall.args[1].picture).to.deep.equal(picture);
  });

  it('leaves the profile of any other agent’s bot alone', async () => {
    const { usecase, botProfile } = setup({ ...RELAY_AGENT, agentRuntime: 'self-hosted' });

    await usecase.execute(buildCommand());

    expect(botProfile.apply.called).to.equal(false);
  });

  it('leaves the profile of a bot with no agent alone', async () => {
    const { usecase, botProfile } = setup(null);

    await usecase.execute(buildCommand());

    expect(botProfile.apply.called).to.equal(false);
  });
});
