import { ChatProviderIdEnum } from '@novu/shared';
import axios from 'axios';
import { expect } from 'chai';
import sinon from 'sinon';
import { SlackQuickSetupCommand } from './slack-quick-setup.command';
import { SlackQuickSetup } from './slack-quick-setup.usecase';

const MOCK_INTEGRATION_ID = '69f84d848bed9b0a73216d96';
const MOCK_AGENT_ID = '69f84d848bed9b0a73216d97';
const MOCK_ENVIRONMENT_ID = '69f84d848bed9b0a73216d98';
const MOCK_ORGANIZATION_ID = '69f84d848bed9b0a73216d99';

function buildHarness() {
  const integrationRepository = {
    findOne: sinon.stub().resolves({
      _id: MOCK_INTEGRATION_ID,
      _environmentId: MOCK_ENVIRONMENT_ID,
      _organizationId: MOCK_ORGANIZATION_ID,
      providerId: ChatProviderIdEnum.Slack,
      identifier: 'slack-integration',
      name: 'My Bot',
    }),
    update: sinon.stub().resolves({}),
  };
  const agentIntegrationRepository = {
    findOne: sinon.stub().resolves(null),
    createOrReviveLink: sinon.stub().resolves({}),
  };
  const agentRepository = { findOne: sinon.stub().resolves({ _id: MOCK_AGENT_ID, runtime: 'self-hosted' }) };
  const logger = { setContext: sinon.stub(), info: sinon.stub(), warn: sinon.stub() };

  const usecase = new SlackQuickSetup(
    integrationRepository as any,
    agentIntegrationRepository as any,
    agentRepository as any,
    logger as any
  );

  return { usecase, integrationRepository, agentRepository, logger };
}

function buildCommand(overrides: Partial<SlackQuickSetupCommand> = {}): SlackQuickSetupCommand {
  return {
    environmentId: MOCK_ENVIRONMENT_ID,
    organizationId: MOCK_ORGANIZATION_ID,
    userId: 'system',
    integrationId: MOCK_INTEGRATION_ID,
    agentId: MOCK_AGENT_ID,
    configToken: 'xoxe.xoxp-1-config-token',
    ...overrides,
  } as SlackQuickSetupCommand;
}

function parseSentManifest(axiosPost: sinon.SinonStub): Record<string, any> {
  const body = axiosPost.firstCall.args[1] as string;
  const manifest = new URLSearchParams(body).get('manifest');

  return JSON.parse(manifest as string);
}

function sentIconParams(axiosPost: sinon.SinonStub): Record<string, string> {
  return Object.fromEntries(new URLSearchParams(axiosPost.secondCall.args[1] as string));
}

describe('SlackQuickSetup', () => {
  let axiosPost: sinon.SinonStub;
  const originalEncryptionKey = process.env.STORE_ENCRYPTION_KEY;
  const originalDashboardUrl = process.env.HUMAN_DASHBOARD_URL;

  beforeEach(() => {
    if (!process.env.STORE_ENCRYPTION_KEY) {
      process.env.STORE_ENCRYPTION_KEY = '12345678901234567890123456789012';
    }
    process.env.HUMAN_DASHBOARD_URL = 'https://www.agentinbox.md/';

    axiosPost = sinon.stub(axios, 'post').resolves({
      data: {
        ok: true,
        app_id: 'A123',
        credentials: {
          client_id: 'client-id',
          client_secret: 'client-secret',
          verification_token: 'verification-token',
          signing_secret: 'signing-secret',
        },
      },
    });
  });

  afterEach(() => {
    sinon.restore();
    if (originalEncryptionKey === undefined) {
      delete process.env.STORE_ENCRYPTION_KEY;
    } else {
      process.env.STORE_ENCRYPTION_KEY = originalEncryptionKey;
    }
    if (originalDashboardUrl === undefined) {
      delete process.env.HUMAN_DASHBOARD_URL;
    } else {
      process.env.HUMAN_DASHBOARD_URL = originalDashboardUrl;
    }
  });

  it('always enables token rotation in the manifest', async () => {
    const { usecase } = buildHarness();

    await usecase.execute(buildCommand());

    const manifest = parseSentManifest(axiosPost);
    expect(manifest.settings.token_rotation_enabled).to.equal(true);
  });

  it("describes a Human agent's app with the description its operator gave it", async () => {
    const { usecase, agentRepository } = buildHarness();
    agentRepository.findOne.resolves({
      _id: MOCK_AGENT_ID,
      runtime: 'human_relay',
      description: 'Asks before it ships.',
    });

    await usecase.execute(buildCommand());

    const manifest = parseSentManifest(axiosPost);
    expect(manifest.display_information.description).to.equal('Asks before it ships.');
    expect(manifest.features.agent_view.agent_description).to.equal('Asks before it ships.');
  });

  it('uses Agent Inbox fallbacks when a Human agent has no description or usable name', async () => {
    const { usecase, integrationRepository, agentRepository } = buildHarness();
    integrationRepository.findOne.resolves({
      _id: MOCK_INTEGRATION_ID,
      _environmentId: MOCK_ENVIRONMENT_ID,
      _organizationId: MOCK_ORGANIZATION_ID,
      providerId: ChatProviderIdEnum.Slack,
      identifier: 'slack-integration',
      name: 'Slack',
    });
    agentRepository.findOne.resolves({ _id: MOCK_AGENT_ID, runtime: 'human_relay' });

    await usecase.execute(buildCommand());

    const manifest = parseSentManifest(axiosPost);
    expect(manifest.display_information.name).to.equal('Agent');
    expect(manifest.display_information.description).to.equal('AI agent');
    expect(manifest.features.bot_user.display_name).to.equal('Agent');
    expect(manifest.features.agent_view.agent_description).to.equal('AI agent');
  });

  it('keeps the default description for any other agent', async () => {
    const { usecase, agentRepository } = buildHarness();
    agentRepository.findOne.resolves({ _id: MOCK_AGENT_ID, runtime: 'self-hosted', description: 'Mine.' });

    await usecase.execute(buildCommand());

    expect(parseSentManifest(axiosPost).display_information.description).to.equal('Agent built with Novu');
  });

  describe('app icon', () => {
    const picture = { storageKey: 'key', contentType: 'image/png', version: 'v1' };

    it('makes no extra call for any other agent, even one with a picture', async () => {
      const { usecase, agentRepository } = buildHarness();
      agentRepository.findOne.resolves({ _id: MOCK_AGENT_ID, runtime: 'self-hosted', picture });

      await usecase.execute(buildCommand());

      expect(axiosPost.calledOnce).to.equal(true);
    });

    it('makes no extra call when the agent is not found', async () => {
      const { usecase, agentRepository } = buildHarness();
      agentRepository.findOne.resolves(null);

      await usecase.execute(buildCommand());

      expect(axiosPost.calledOnce).to.equal(true);
    });

    it("gives a Human agent's app the default picture when the agent has none", async () => {
      const { usecase, agentRepository, logger } = buildHarness();
      agentRepository.findOne.resolves({ _id: MOCK_AGENT_ID, runtime: 'human_relay' });

      await usecase.execute(buildCommand());

      expect(axiosPost.callCount).to.equal(2);
      expect(axiosPost.secondCall.args[0]).to.equal('https://slack.com/api/apps.icon.set');
      expect(sentIconParams(axiosPost)).to.deep.equal({
        token: 'xoxe.xoxp-1-config-token',
        app_id: 'A123',
        url: 'https://www.agentinbox.md/brand/agent-avatar.png',
      });
      expect(logger.warn.called).to.equal(false);
    });

    it("gives a Human agent's app its own picture", async () => {
      const { usecase, agentRepository } = buildHarness();
      agentRepository.findOne.resolves({ _id: MOCK_AGENT_ID, runtime: 'human_relay', picture });

      await usecase.execute(buildCommand());

      expect(sentIconParams(axiosPost).url).to.equal(
        `https://www.agentinbox.md/api/v1/agent-pictures/${MOCK_ENVIRONMENT_ID}/${MOCK_AGENT_ID}/v1`
      );
    });

    it('reads the picture of the agent', async () => {
      const { usecase, agentRepository } = buildHarness();

      await usecase.execute(buildCommand());

      expect(agentRepository.findOne.firstCall.args[1]).to.include('picture');
    });

    it('sets the icon once the credentials are saved, with a short wait', async () => {
      const { usecase, integrationRepository, agentRepository } = buildHarness();
      agentRepository.findOne.resolves({ _id: MOCK_AGENT_ID, runtime: 'human_relay' });

      await usecase.execute(buildCommand());

      expect(integrationRepository.update.firstCall.calledBefore(axiosPost.secondCall)).to.equal(true);
      expect(axiosPost.secondCall.args[2].timeout).to.be.at.most(3000);
    });

    it('takes a refusal from Slack in its stride and tries only once', async () => {
      const { usecase, integrationRepository, agentRepository, logger } = buildHarness();
      agentRepository.findOne.resolves({ _id: MOCK_AGENT_ID, runtime: 'human_relay', picture });
      axiosPost.onSecondCall().resolves({ data: { ok: false, error: 'invalid_icon_size' } });

      expect(await usecase.execute(buildCommand())).to.deep.equal({});

      expect(axiosPost.callCount).to.equal(2);
      expect(integrationRepository.update.calledOnce).to.equal(true);
      expect(JSON.stringify(logger.warn.firstCall.args)).to.contain('invalid_icon_size');
    });

    it('never fails the setup when Slack cannot be reached, and never logs the token', async () => {
      const { usecase, agentRepository, logger } = buildHarness();
      agentRepository.findOne.resolves({ _id: MOCK_AGENT_ID, runtime: 'human_relay' });
      const failure = Object.assign(new Error('timeout of 3000ms exceeded'), {
        config: { data: 'token=xoxe.xoxp-1-config-token' },
      });
      axiosPost.onSecondCall().rejects(failure);

      expect(await usecase.execute(buildCommand())).to.deep.equal({});

      expect(logger.warn.calledOnce).to.equal(true);
      expect(JSON.stringify(logger.warn.args)).to.contain('timeout of 3000ms exceeded');
      expect(JSON.stringify(logger.warn.args)).to.not.contain('xoxe.xoxp-1-config-token');
    });
  });
});
