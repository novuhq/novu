import { ChatProviderIdEnum } from '@novu/shared';
import { expect } from 'chai';
import { restore, stub } from 'sinon';

import * as photonWebhookClient from '../shared/photon-webhook-client';
import { RemovePhotonWebhooksCommand } from './remove-photon-webhooks.command';
import { RemovePhotonWebhooks } from './remove-photon-webhooks.usecase';

const ENV_ID = 'env-id';
const ORG_ID = 'org-id';
const AGENT_ID = 'agent-mongo-id';
const INTEGRATION_IDENTIFIER = 'photon-int';
const STALE_NOVU_WEBHOOK_URL = 'https://other-env.example.com/v1/agents/other-agent/webhook/other-integration';
const THIRD_PARTY_WEBHOOK_URL = 'https://third-party-service.example.com/photon-webhook';

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
  let deleteStub: sinon.SinonStub;

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

    stub(photonWebhookClient, 'listPhotonWebhooks').resolves([
      { id: 'stale-id', webhookUrl: STALE_NOVU_WEBHOOK_URL },
      { id: 'third-party-id', webhookUrl: THIRD_PARTY_WEBHOOK_URL },
    ]);
    deleteStub = stub(photonWebhookClient, 'deletePhotonWebhooks').resolves();
  });

  afterEach(() => {
    restore();
    env.API_ROOT_URL = originalApiRootUrl;
  });

  it('refuses to remove URLs that are not Novu agent webhooks', async () => {
    const result = await buildUsecase().execute(buildCommand([THIRD_PARTY_WEBHOOK_URL]));

    expect(result.success).to.equal(false);
    expect(result.removedWebhookUrls).to.deep.equal([]);
    expect(deleteStub.called).to.equal(false);
  });

  it('resolves supplied URLs to webhook ids and removes them', async () => {
    const result = await buildUsecase().execute(buildCommand([STALE_NOVU_WEBHOOK_URL, THIRD_PARTY_WEBHOOK_URL]));

    expect(result.success).to.equal(true);
    expect(result.removedWebhookUrls).to.deep.equal([STALE_NOVU_WEBHOOK_URL]);
    expect(
      deleteStub.calledOnceWith({ projectId: 'project-id', projectSecret: 'project-secret' }, ['stale-id'])
    ).to.equal(true);
  });

  it('returns a failure message when Photon rejects the deletion', async () => {
    deleteStub.rejects(new Error('boom'));

    const result = await buildUsecase().execute(buildCommand([STALE_NOVU_WEBHOOK_URL]));

    expect(result.success).to.equal(false);
    expect(result.message).to.include('boom');
  });
});
