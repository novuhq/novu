import { ChatProviderIdEnum } from '@novu/shared';
import { expect } from 'chai';
import { restore, stub } from 'sinon';

import * as photonWebhookClient from '../shared/photon-webhook-client';
import { ConfigurePhotonWebhookCommand } from './configure-photon-webhook.command';
import { ConfigurePhotonWebhook } from './configure-photon-webhook.usecase';

const ENV_ID = 'env-id';
const ORG_ID = 'org-id';
const AGENT_ID = 'agent-mongo-id';
const INTEGRATION_ID = 'integration-mongo-id';
const INTEGRATION_IDENTIFIER = 'photon-int';
const CALLBACK_URL = `https://api.example.com/v1/agents/${AGENT_ID}/webhook/${INTEGRATION_IDENTIFIER}`;
const OTHER_NOVU_WEBHOOK_URL = `https://other-env.example.com/v1/agents/other-agent-id/webhook/other-integration`;
const THIRD_PARTY_WEBHOOK_URL = 'https://third-party-service.example.com/photon-webhook';

function buildCommand(overrides: Partial<ConfigurePhotonWebhookCommand> = {}) {
  return ConfigurePhotonWebhookCommand.create({
    userId: 'user-id',
    environmentId: ENV_ID,
    organizationId: ORG_ID,
    agentIdentifier: 'my-agent',
    integrationIdentifier: INTEGRATION_IDENTIFIER,
    ...overrides,
  });
}

describe('ConfigurePhotonWebhook usecase', () => {
  const env = process.env as Record<string, string | undefined>;
  const originalApiRootUrl = env.API_ROOT_URL;
  const originalAgentApiHostname = env.AGENT_API_HOSTNAME;
  const originalEncryptionKey = env.STORE_ENCRYPTION_KEY;

  let agentRepository: { findOne: sinon.SinonStub };
  let integrationRepository: { findOne: sinon.SinonStub; update: sinon.SinonStub };
  let agentIntegrationRepository: { findOne: sinon.SinonStub };
  let logger: { setContext: sinon.SinonStub; warn: sinon.SinonStub };
  let enableStub: sinon.SinonStub;
  let listStub: sinon.SinonStub;
  let createStub: sinon.SinonStub;
  let deleteStub: sinon.SinonStub;

  function buildUsecase() {
    return new ConfigurePhotonWebhook(
      agentRepository as any,
      integrationRepository as any,
      agentIntegrationRepository as any,
      logger as any
    );
  }

  function stubIntegration(credentials: Record<string, string>) {
    integrationRepository.findOne.resolves({
      _id: INTEGRATION_ID,
      identifier: INTEGRATION_IDENTIFIER,
      providerId: ChatProviderIdEnum.PhotonImessage,
      credentials,
    });
  }

  beforeEach(() => {
    env.API_ROOT_URL = 'https://api.example.com';
    delete env.AGENT_API_HOSTNAME;
    env.STORE_ENCRYPTION_KEY = 'XgVGHwIk^42&8v&xFowz1mp6^P3r*9l0';

    agentRepository = {
      findOne: stub().resolves({ _id: AGENT_ID, identifier: 'my-agent' }),
    };
    integrationRepository = {
      findOne: stub(),
      update: stub().resolves(),
    };
    stubIntegration({ apiKey: 'project-id', secretKey: 'project-secret' });
    agentIntegrationRepository = {
      findOne: stub().resolves({ _id: 'link-id' }),
    };
    logger = {
      setContext: stub(),
      warn: stub(),
    };

    enableStub = stub(photonWebhookClient, 'enablePhotonImessagePlatform').resolves();
    listStub = stub(photonWebhookClient, 'listPhotonWebhooks').resolves([]);
    createStub = stub(photonWebhookClient, 'createPhotonWebhook').resolves({
      id: 'webhook-id',
      webhookUrl: CALLBACK_URL,
      standardSigningSecret: 'whsec_new-secret',
      signingSecret: 'legacy-secret',
    });
    deleteStub = stub(photonWebhookClient, 'deletePhotonWebhooks').resolves();
  });

  afterEach(() => {
    restore();
    env.API_ROOT_URL = originalApiRootUrl;
    env.AGENT_API_HOSTNAME = originalAgentApiHostname;
    env.STORE_ENCRYPTION_KEY = originalEncryptionKey;
  });

  it('returns missing_credentials when Photon credentials are incomplete', async () => {
    stubIntegration({ apiKey: 'project-id' });

    const result = await buildUsecase().execute(buildCommand());

    expect(result.success).to.equal(false);
    expect(result.fallbackToManual).to.equal(true);
    expect(result.reason?.code).to.equal('missing_credentials');
    expect(enableStub.called).to.equal(false);
    expect(createStub.called).to.equal(false);
  });

  it('enables the platform, registers the webhook, and persists the Photon-issued secret', async () => {
    const result = await buildUsecase().execute(buildCommand());

    expect(result.success).to.equal(true);
    expect(result.callbackUrl).to.equal(CALLBACK_URL);
    expect(enableStub.calledOnce).to.equal(true);
    expect(
      createStub.calledOnceWith({ projectId: 'project-id', projectSecret: 'project-secret' }, CALLBACK_URL)
    ).to.equal(true);

    expect(integrationRepository.update.calledOnce).to.equal(true);
    const [, update] = integrationRepository.update.firstCall.args;
    // The Photon-issued secret is stored encrypted, never verbatim.
    expect(update.$set['credentials.token']).to.be.a('string');
    expect(update.$set['credentials.token']).to.not.equal('whsec_new-secret');
  });

  it('keeps an intact registration when the URL is registered and the secret is already stored', async () => {
    stubIntegration({ apiKey: 'project-id', secretKey: 'project-secret', token: 'whsec_existing' });
    listStub.resolves([{ id: 'webhook-id', webhookUrl: CALLBACK_URL }]);

    const result = await buildUsecase().execute(buildCommand());

    expect(result.success).to.equal(true);
    expect(createStub.called).to.equal(false);
    expect(deleteStub.called).to.equal(false);
    expect(integrationRepository.update.called).to.equal(false);
  });

  it('replaces a stale own registration when the stored secret is missing', async () => {
    listStub.resolves([{ id: 'stale-id', webhookUrl: CALLBACK_URL }]);

    const result = await buildUsecase().execute(buildCommand());

    expect(result.success).to.equal(true);
    expect(
      deleteStub.calledOnceWith({ projectId: 'project-id', projectSecret: 'project-secret' }, ['stale-id'])
    ).to.equal(true);
    expect(createStub.calledOnce).to.equal(true);
    expect(integrationRepository.update.calledOnce).to.equal(true);
  });

  it('surfaces other Novu webhook URLs and ignores third-party ones', async () => {
    listStub.resolves([
      { id: 'other-novu-id', webhookUrl: OTHER_NOVU_WEBHOOK_URL },
      { id: 'third-party-id', webhookUrl: THIRD_PARTY_WEBHOOK_URL },
    ]);

    const result = await buildUsecase().execute(buildCommand());

    expect(result.success).to.equal(true);
    expect(result.existingNovuWebhookUrls).to.deep.equal([OTHER_NOVU_WEBHOOK_URL]);
    expect(deleteStub.called).to.equal(false);
  });

  it('falls back to manual configuration when Photon rejects the registration', async () => {
    createStub.rejects(new Error('boom'));

    const result = await buildUsecase().execute(buildCommand());

    expect(result.success).to.equal(false);
    expect(result.fallbackToManual).to.equal(true);
    expect(result.reason?.code).to.equal('photon_rejected');
    expect(result.reason?.message).to.include('boom');
    expect(integrationRepository.update.called).to.equal(false);
  });
});
