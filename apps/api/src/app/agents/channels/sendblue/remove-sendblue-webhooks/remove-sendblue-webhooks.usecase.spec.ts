import { ChatProviderIdEnum } from '@novu/shared';
import { expect } from 'chai';
import { restore, stub } from 'sinon';

import * as sendblueWebhookClient from '../shared/sendblue-webhook-client';
import { RemoveSendblueWebhooksCommand } from './remove-sendblue-webhooks.command';
import { RemoveSendblueWebhooks } from './remove-sendblue-webhooks.usecase';

const ENV_ID = 'env-id';
const ORG_ID = 'org-id';
const AGENT_ID = 'agent-mongo-id';
const INTEGRATION_ID = 'integration-mongo-id';
const NOVU_WEBHOOK_URL = 'https://other-env.example.com/v1/agents/other-agent-id/webhook/other-integration';
const THIRD_PARTY_WEBHOOK_URL = 'https://third-party-service.example.com/sendblue-webhook';

function buildCommand(overrides: Partial<RemoveSendblueWebhooksCommand> = {}) {
  return RemoveSendblueWebhooksCommand.create({
    userId: 'user-id',
    environmentId: ENV_ID,
    organizationId: ORG_ID,
    agentIdentifier: 'my-agent',
    integrationIdentifier: 'sendblue-int',
    webhookUrls: [NOVU_WEBHOOK_URL],
    ...overrides,
  });
}

describe('RemoveSendblueWebhooks usecase', () => {
  const originalApiRootUrl = process.env.API_ROOT_URL;
  const originalAgentApiHostname = process.env.AGENT_API_HOSTNAME;

  let agentRepository: { findOne: sinon.SinonStub };
  let integrationRepository: { findOne: sinon.SinonStub };
  let agentIntegrationRepository: { findOne: sinon.SinonStub };
  let logger: { setContext: sinon.SinonStub; warn: sinon.SinonStub };
  let deleteStub: sinon.SinonStub;

  function buildUsecase() {
    return new RemoveSendblueWebhooks(
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
        identifier: 'sendblue-int',
        providerId: ChatProviderIdEnum.Sendblue,
        credentials: { apiKey: 'key', secretKey: 'secret' },
      }),
    };
    agentIntegrationRepository = {
      findOne: stub().resolves({ _id: 'link-id' }),
    };
    logger = {
      setContext: stub(),
      warn: stub(),
    };

    deleteStub = stub(sendblueWebhookClient, 'deleteSendblueReceiveWebhooks').resolves();
  });

  afterEach(() => {
    restore();
    process.env.API_ROOT_URL = originalApiRootUrl;
    process.env.AGENT_API_HOSTNAME = originalAgentApiHostname;
  });

  it('removes Novu-shaped webhook URLs', async () => {
    const result = await buildUsecase().execute(buildCommand());

    expect(result.success).to.equal(true);
    expect(result.removedWebhookUrls).to.deep.equal([NOVU_WEBHOOK_URL]);
    expect(deleteStub.calledOnceWith({ apiKey: 'key', secretKey: 'secret' }, [NOVU_WEBHOOK_URL])).to.equal(true);
  });

  it('filters out non-Novu-shaped URLs before calling Sendblue', async () => {
    const result = await buildUsecase().execute(
      buildCommand({ webhookUrls: [NOVU_WEBHOOK_URL, THIRD_PARTY_WEBHOOK_URL] })
    );

    expect(result.success).to.equal(true);
    expect(result.removedWebhookUrls).to.deep.equal([NOVU_WEBHOOK_URL]);
    expect(deleteStub.calledOnceWith({ apiKey: 'key', secretKey: 'secret' }, [NOVU_WEBHOOK_URL])).to.equal(true);
  });

  it('rejects when none of the supplied URLs are Novu-shaped', async () => {
    const result = await buildUsecase().execute(buildCommand({ webhookUrls: [THIRD_PARTY_WEBHOOK_URL] }));

    expect(result.success).to.equal(false);
    expect(result.removedWebhookUrls).to.deep.equal([]);
    expect(deleteStub.called).to.equal(false);
  });

  it('returns a failure when credentials are missing', async () => {
    integrationRepository.findOne.resolves({
      _id: INTEGRATION_ID,
      identifier: 'sendblue-int',
      providerId: ChatProviderIdEnum.Sendblue,
      credentials: {},
    });

    const result = await buildUsecase().execute(buildCommand());

    expect(result.success).to.equal(false);
    expect(deleteStub.called).to.equal(false);
  });

  it('surfaces a failure message when Sendblue rejects the deletion', async () => {
    deleteStub.rejects(new Error('Sendblue API error'));

    const result = await buildUsecase().execute(buildCommand());

    expect(result.success).to.equal(false);
    expect(result.message).to.match(/Sendblue API error/);
  });
});
