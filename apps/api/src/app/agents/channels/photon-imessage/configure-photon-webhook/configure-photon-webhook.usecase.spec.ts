import { ChatProviderIdEnum } from '@novu/shared';
import axios, { AxiosInstance } from 'axios';
import { expect } from 'chai';
import { match, restore, stub } from 'sinon';

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
const PHOTON_AUTH = { username: 'project-id', password: 'project-secret' };

function photonResponse(data: unknown) {
  return { data: { succeed: true, data } };
}

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
  let createClientStub: sinon.SinonStub;
  let photonApi: { patch: sinon.SinonStub; get: sinon.SinonStub; post: sinon.SinonStub; delete: sinon.SinonStub };

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

    photonApi = {
      patch: stub().resolves(photonResponse(null)),
      get: stub().resolves(photonResponse([])),
      post: stub().resolves(
        photonResponse({
          id: 'webhook-id',
          webhookUrl: CALLBACK_URL,
          standardSigningSecret: 'whsec_new-secret',
          signingSecret: 'legacy-secret',
        })
      ),
      delete: stub().resolves(photonResponse(null)),
    };
    createClientStub = stub(axios, 'create').returns(photonApi as unknown as AxiosInstance);
  });

  // Assigning `undefined` to process.env stores the string "undefined" — delete instead.
  const restoreEnv = (key: string, value: string | undefined) => {
    if (value === undefined) delete env[key];
    else env[key] = value;
  };

  afterEach(() => {
    restore();
    restoreEnv('API_ROOT_URL', originalApiRootUrl);
    restoreEnv('AGENT_API_HOSTNAME', originalAgentApiHostname);
    restoreEnv('STORE_ENCRYPTION_KEY', originalEncryptionKey);
  });

  it('returns missing_credentials when Photon credentials are incomplete', async () => {
    stubIntegration({ apiKey: 'project-id' });

    const result = await buildUsecase().execute(buildCommand());

    expect(result.success).to.equal(false);
    expect(result.fallbackToManual).to.equal(true);
    expect(result.reason?.code).to.equal('missing_credentials');
    expect(createClientStub.called).to.equal(false);
  });

  it('enables the platform, registers the webhook, and persists the Photon-issued secret', async () => {
    const result = await buildUsecase().execute(buildCommand());

    expect(result.success).to.equal(true);
    expect(result.callbackUrl).to.equal(CALLBACK_URL);
    expect(createClientStub.alwaysCalledWithMatch({ auth: PHOTON_AUTH })).to.equal(true);
    expect(photonApi.patch.calledOnceWith('/platforms', { platform: 'imessage', enabled: true })).to.equal(true);
    expect(photonApi.post.calledOnceWith('/webhooks', match({ webhookUrl: CALLBACK_URL }))).to.equal(true);

    expect(integrationRepository.update.calledOnce).to.equal(true);
    const [, update] = integrationRepository.update.firstCall.args;
    // The v0 secret (the scheme Spectrum production signs with) is stored encrypted, never verbatim.
    expect(update.$set['credentials.token']).to.be.a('string');
    expect(update.$set['credentials.token']).to.not.equal('legacy-secret');
    expect(update.$set['credentials.token']).to.not.equal('whsec_new-secret');
  });

  it('keeps an intact registration when the URL is registered and the secret is already stored', async () => {
    stubIntegration({ apiKey: 'project-id', secretKey: 'project-secret', token: 'whsec_existing' });
    photonApi.get.resolves(photonResponse([{ id: 'webhook-id', webhookUrl: CALLBACK_URL }]));

    const result = await buildUsecase().execute(buildCommand());

    expect(result.success).to.equal(true);
    expect(photonApi.post.called).to.equal(false);
    expect(photonApi.delete.called).to.equal(false);
    expect(integrationRepository.update.called).to.equal(false);
  });

  it('replaces a stale own registration when the stored secret is missing', async () => {
    photonApi.get.resolves(photonResponse([{ id: 'stale-id', webhookUrl: CALLBACK_URL }]));

    const result = await buildUsecase().execute(buildCommand());

    expect(result.success).to.equal(true);
    expect(photonApi.delete.calledOnceWith('/webhooks/stale-id')).to.equal(true);
    expect(photonApi.post.calledOnce).to.equal(true);
    expect(integrationRepository.update.calledOnce).to.equal(true);
  });

  it('surfaces other Novu webhook URLs and ignores third-party ones', async () => {
    photonApi.get.resolves(
      photonResponse([
        { id: 'other-novu-id', webhookUrl: OTHER_NOVU_WEBHOOK_URL },
        { id: 'third-party-id', webhookUrl: THIRD_PARTY_WEBHOOK_URL },
      ])
    );

    const result = await buildUsecase().execute(buildCommand());

    expect(result.success).to.equal(true);
    expect(result.existingNovuWebhookUrls).to.deep.equal([OTHER_NOVU_WEBHOOK_URL]);
    expect(photonApi.delete.called).to.equal(false);
  });

  it('falls back to manual configuration when Photon rejects the registration', async () => {
    photonApi.post.rejects(new Error('boom'));

    const result = await buildUsecase().execute(buildCommand());

    expect(result.success).to.equal(false);
    expect(result.fallbackToManual).to.equal(true);
    expect(result.reason?.code).to.equal('photon_rejected');
    expect(result.reason?.message).to.include('boom');
    expect(integrationRepository.update.called).to.equal(false);
  });
});
