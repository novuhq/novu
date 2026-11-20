import { ChatProviderIdEnum } from '@novu/shared';
import axios, { AxiosInstance } from 'axios';
import { expect } from 'chai';
import { restore, stub } from 'sinon';

import { RemovePhotonWebhooksCommand } from './remove-photon-webhooks.command';
import { RemovePhotonWebhooks } from './remove-photon-webhooks.usecase';

const ENV_ID = 'env-id';
const ORG_ID = 'org-id';
const AGENT_ID = 'agent-mongo-id';
const INTEGRATION_IDENTIFIER = 'photon-int';
const STALE_NOVU_WEBHOOK_URL = 'https://other-env.example.com/v1/agents/other-agent/webhook/other-integration';
const THIRD_PARTY_WEBHOOK_URL = 'https://third-party-service.example.com/photon-webhook';

function photonResponse(data: unknown) {
  return { data: { succeed: true, data } };
}

function buildCommand(webhookUrls: string[]) {
  return RemovePhotonWebhooksCommand.create({
    userId: 'user-id',
    environmentId: ENV_ID,
    organizationId: ORG_ID,
    agentIdentifier: 'my-agent',
    integrationIdentifier: INTEGRATION_IDENTIFIER,
    webhookUrls,
  });
}

describe('RemovePhotonWebhooks usecase', () => {
  const env = process.env as Record<string, string | undefined>;
  const originalApiRootUrl = env.API_ROOT_URL;

  let agentRepository: { findOne: sinon.SinonStub };
  let integrationRepository: { findOne: sinon.SinonStub };
  let agentIntegrationRepository: { findOne: sinon.SinonStub };
  let logger: { setContext: sinon.SinonStub; warn: sinon.SinonStub };
  let createClientStub: sinon.SinonStub;
  let photonApi: { get: sinon.SinonStub; delete: sinon.SinonStub };

  function buildUsecase() {
    return new RemovePhotonWebhooks(
      agentRepository as any,
      integrationRepository as any,
      agentIntegrationRepository as any,
      logger as any
    );
  }

  beforeEach(() => {
    env.API_ROOT_URL = 'https://api.example.com';

    agentRepository = {
      findOne: stub().resolves({ _id: AGENT_ID, identifier: 'my-agent' }),
    };
    integrationRepository = {
      findOne: stub().resolves({
        _id: 'integration-mongo-id',
        identifier: INTEGRATION_IDENTIFIER,
        providerId: ChatProviderIdEnum.PhotonImessage,
        credentials: { apiKey: 'project-id', secretKey: 'project-secret' },
      }),
    };
    agentIntegrationRepository = {
      findOne: stub().resolves({ _id: 'link-id' }),
    };
    logger = {
      setContext: stub(),
      warn: stub(),
    };

    photonApi = {
      get: stub().resolves(
        photonResponse([
          { id: 'stale-id', webhookUrl: STALE_NOVU_WEBHOOK_URL },
          { id: 'third-party-id', webhookUrl: THIRD_PARTY_WEBHOOK_URL },
        ])
      ),
      delete: stub().resolves(photonResponse(null)),
    };
    createClientStub = stub(axios, 'create').returns(photonApi as unknown as AxiosInstance);
  });

  afterEach(() => {
    restore();
    // Assigning `undefined` to process.env stores the string "undefined" — delete instead.
    if (originalApiRootUrl === undefined) delete env.API_ROOT_URL;
    else env.API_ROOT_URL = originalApiRootUrl;
  });

  it('refuses to remove URLs that are not Novu agent webhooks', async () => {
    const result = await buildUsecase().execute(buildCommand([THIRD_PARTY_WEBHOOK_URL]));

    expect(result.success).to.equal(false);
    expect(result.removedWebhookUrls).to.deep.equal([]);
    expect(photonApi.delete.called).to.equal(false);
  });

  it('resolves supplied URLs to webhook ids and removes them', async () => {
    const result = await buildUsecase().execute(buildCommand([STALE_NOVU_WEBHOOK_URL, THIRD_PARTY_WEBHOOK_URL]));

    expect(result.success).to.equal(true);
    expect(result.removedWebhookUrls).to.deep.equal([STALE_NOVU_WEBHOOK_URL]);
    expect(
      createClientStub.alwaysCalledWithMatch({ auth: { username: 'project-id', password: 'project-secret' } })
    ).to.equal(true);
    expect(photonApi.delete.calledOnceWith('/webhooks/stale-id')).to.equal(true);
  });

  it('returns a failure message when Photon rejects the deletion', async () => {
    photonApi.delete.rejects(new Error('boom'));

    const result = await buildUsecase().execute(buildCommand([STALE_NOVU_WEBHOOK_URL]));

    expect(result.success).to.equal(false);
    expect(result.message).to.include('boom');
  });
});
