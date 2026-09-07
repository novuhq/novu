import { ChatProviderIdEnum } from '@novu/shared';
import { expect } from 'chai';
import { restore, stub } from 'sinon';

import * as sendblueWebhookClient from '../shared/sendblue-webhook-client';
import { ConfigureSendblueWebhookCommand } from './configure-sendblue-webhook.command';
import { ConfigureSendblueWebhook } from './configure-sendblue-webhook.usecase';

const ENV_ID = 'env-id';
const ORG_ID = 'org-id';
const AGENT_ID = 'agent-mongo-id';
const INTEGRATION_ID = 'integration-mongo-id';
const INTEGRATION_IDENTIFIER = 'sendblue-int';
const CALLBACK_URL = `https://api.example.com/v1/agents/${AGENT_ID}/webhook/${INTEGRATION_IDENTIFIER}`;
const OTHER_NOVU_WEBHOOK_URL = `https://other-env.example.com/v1/agents/other-agent-id/webhook/other-integration`;
const THIRD_PARTY_WEBHOOK_URL = 'https://third-party-service.example.com/sendblue-webhook';

function buildCommand(overrides: Partial<ConfigureSendblueWebhookCommand> = {}) {
  return ConfigureSendblueWebhookCommand.create({
    userId: 'user-id',
    environmentId: ENV_ID,
    organizationId: ORG_ID,
    agentIdentifier: 'my-agent',
    integrationIdentifier: INTEGRATION_IDENTIFIER,
    ...overrides,
  });
}

describe('ConfigureSendblueWebhook usecase', () => {
  const originalApiRootUrl = process.env.API_ROOT_URL;
  const originalAgentApiHostname = process.env.AGENT_API_HOSTNAME;

  let agentRepository: { findOne: sinon.SinonStub };
  let integrationRepository: { findOne: sinon.SinonStub; update: sinon.SinonStub };
  let agentIntegrationRepository: { findOne: sinon.SinonStub };
  let logger: { setContext: sinon.SinonStub; warn: sinon.SinonStub };
  let listStub: sinon.SinonStub;
  let createStub: sinon.SinonStub;
  let deleteStub: sinon.SinonStub;

  function buildUsecase() {
    return new ConfigureSendblueWebhook(
      agentRepository as any,
      integrationRepository as any,
      agentIntegrationRepository as any,
      logger as any
    );
  }

  beforeEach(() => {
    process.env.API_ROOT_URL = 'https://api.example.com';
    delete process.env.AGENT_API_HOSTNAME;

    agentRepository = {
      findOne: stub().resolves({ _id: AGENT_ID, identifier: 'my-agent' }),
    };
    integrationRepository = {
      findOne: stub().resolves({
        _id: INTEGRATION_ID,
        identifier: INTEGRATION_IDENTIFIER,
        providerId: ChatProviderIdEnum.Sendblue,
        credentials: {
          apiKey: 'key',
          secretKey: 'secret',
          // Pre-provisioned so the usecase doesn't need to encrypt/persist a fresh one.
          token: 'existing-signing-secret',
        },
      }),
      update: stub().resolves(),
    };
    agentIntegrationRepository = {
      findOne: stub().resolves({ _id: 'link-id' }),
    };
    logger = {
      setContext: stub(),
      warn: stub(),
    };

    listStub = stub(sendblueWebhookClient, 'listSendblueReceiveWebhooks').resolves([]);
    createStub = stub(sendblueWebhookClient, 'createSendblueReceiveWebhook').resolves();
    deleteStub = stub(sendblueWebhookClient, 'deleteSendblueReceiveWebhooks').resolves();
  });

  afterEach(() => {
    restore();
    process.env.API_ROOT_URL = originalApiRootUrl;
    process.env.AGENT_API_HOSTNAME = originalAgentApiHostname;
  });

  it('returns missing_credentials when Sendblue credentials are incomplete', async () => {
    integrationRepository.findOne.resolves({
      _id: INTEGRATION_ID,
      identifier: INTEGRATION_IDENTIFIER,
      providerId: ChatProviderIdEnum.Sendblue,
      credentials: { apiKey: 'key' },
    });

    const result = await buildUsecase().execute(buildCommand());

    expect(result.success).to.equal(false);
    expect(result.reason?.code).to.equal('missing_credentials');
    expect(listStub.called).to.equal(false);
  });

  it('registers a fresh webhook when none exist yet', async () => {
    const result = await buildUsecase().execute(buildCommand());

    expect(result.success).to.equal(true);
    expect(result.callbackUrl).to.equal(CALLBACK_URL);
    expect(result.existingNovuWebhookUrls).to.equal(undefined);
    expect(deleteStub.called).to.equal(false);
    expect(
      createStub.calledOnceWith(
        { apiKey: 'key', secretKey: 'secret' },
        { url: CALLBACK_URL, secret: 'existing-signing-secret' }
      )
    ).to.equal(true);
  });

  it('detects other Novu agent webhooks already registered on the account', async () => {
    listStub.resolves([{ url: OTHER_NOVU_WEBHOOK_URL }]);

    const result = await buildUsecase().execute(buildCommand());

    expect(result.success).to.equal(true);
    expect(result.existingNovuWebhookUrls).to.deep.equal([OTHER_NOVU_WEBHOOK_URL]);
    // Only this integration's own stale entry is ever deleted automatically — other integrations'
    // webhooks are surfaced for the user to remove explicitly, not deleted silently.
    expect(deleteStub.called).to.equal(false);
  });

  it('replaces (delete+create) its own previous registration instead of appending a duplicate', async () => {
    listStub.resolves([{ url: CALLBACK_URL, secret: 'existing-signing-secret' }]);

    const result = await buildUsecase().execute(buildCommand());

    expect(result.success).to.equal(true);
    expect(result.existingNovuWebhookUrls).to.equal(undefined);
    expect(deleteStub.calledOnceWith({ apiKey: 'key', secretKey: 'secret' }, [CALLBACK_URL])).to.equal(true);
    expect(createStub.calledOnce).to.equal(true);
    expect(deleteStub.calledBefore(createStub)).to.equal(true);
  });

  it('ignores unrelated third-party webhooks (does not flag or delete them)', async () => {
    listStub.resolves([{ url: THIRD_PARTY_WEBHOOK_URL }]);

    const result = await buildUsecase().execute(buildCommand());

    expect(result.success).to.equal(true);
    expect(result.existingNovuWebhookUrls).to.equal(undefined);
    expect(deleteStub.called).to.equal(false);
  });

  it('falls back to manual configuration when Sendblue rejects the request', async () => {
    createStub.rejects(new Error('Sendblue API error'));

    const result = await buildUsecase().execute(buildCommand());

    expect(result.success).to.equal(false);
    expect(result.fallbackToManual).to.equal(true);
    expect(result.reason?.code).to.equal('sendblue_rejected');
  });
});
