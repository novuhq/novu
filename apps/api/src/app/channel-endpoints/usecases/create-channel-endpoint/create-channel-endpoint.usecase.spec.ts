import {
  ChannelConnectionRepository,
  ChannelEndpointRepository,
  ContextRepository,
  IntegrationRepository,
  SubscriberRepository,
} from '@novu/dal';
import { ChatProviderIdEnum, ENDPOINT_TYPES, ToolProviderIdEnum } from '@novu/shared';
import { expect } from 'chai';
import sinon from 'sinon';
import { ConfirmLinkedAuthCards } from '../../../agents/conversation-runtime/link/confirm-linked-auth-cards.usecase';
import { CreateChannelEndpointCommand } from './create-channel-endpoint.command';
import { CreateChannelEndpoint } from './create-channel-endpoint.usecase';

const MOCK_ENVIRONMENT_ID = 'env-id-123';
const MOCK_ORGANIZATION_ID = 'org-id-456';
const MOCK_INTEGRATION_IDENTIFIER = 'slack-integration';
const MOCK_SUBSCRIBER_ID = 'subscriber-attacker';
const MOCK_VICTIM_SLACK_USER_ID = 'U_VICTIM';
const MOCK_TOOL_WEBHOOK_INTEGRATION_IDENTIFIER = 'tool-webhook-integration';

function buildMockIntegration() {
  return {
    _id: 'integration-id',
    _environmentId: MOCK_ENVIRONMENT_ID,
    _organizationId: MOCK_ORGANIZATION_ID,
    identifier: MOCK_INTEGRATION_IDENTIFIER,
    providerId: ChatProviderIdEnum.Slack,
    channel: 'chat',
  } as any;
}

function buildMockToolWebhookIntegration(routingMode: 'static' | 'dynamic' = 'dynamic') {
  return {
    _id: 'tool-webhook-integration-id',
    _environmentId: MOCK_ENVIRONMENT_ID,
    _organizationId: MOCK_ORGANIZATION_ID,
    identifier: MOCK_TOOL_WEBHOOK_INTEGRATION_IDENTIFIER,
    providerId: ToolProviderIdEnum.Webhook,
    channel: 'tool',
    credentials: { routingMode },
  } as any;
}

function createHarness() {
  const channelEndpointRepository = sinon.createStubInstance(ChannelEndpointRepository);
  const channelConnectionRepository = sinon.createStubInstance(ChannelConnectionRepository);
  const integrationRepository = sinon.createStubInstance(IntegrationRepository);
  const subscriberRepository = sinon.createStubInstance(SubscriberRepository);
  const contextRepository = sinon.createStubInstance(ContextRepository);
  const createOrUpdateSubscriber = { execute: sinon.stub().resolves() };
  const confirmLinkedAuthCards = sinon.createStubInstance(ConfirmLinkedAuthCards);
  const moduleRef = { get: sinon.stub().returns(confirmLinkedAuthCards) };
  const logger = { setContext: sinon.stub(), warn: sinon.stub(), info: sinon.stub(), debug: sinon.stub() };

  integrationRepository.findOne.resolves(buildMockIntegration());
  channelEndpointRepository.findOne.resolves(null as any);
  channelEndpointRepository.create.resolves({ identifier: 'chendp_test' } as any);
  channelConnectionRepository.create.resolves({ identifier: 'chconn_test' } as any);
  subscriberRepository.findOne.resolves({ subscriberId: MOCK_SUBSCRIBER_ID } as any);

  const usecase = new CreateChannelEndpoint(
    channelEndpointRepository as any,
    channelConnectionRepository as any,
    integrationRepository as any,
    subscriberRepository as any,
    contextRepository as any,
    createOrUpdateSubscriber as any,
    moduleRef as any,
    logger as any
  );

  return {
    usecase,
    confirmLinkedAuthCards,
    moduleRef,
    channelEndpointRepository,
    channelConnectionRepository,
    integrationRepository,
  };
}

function buildSlackUserCommand(platformIdentityVerified?: boolean) {
  return CreateChannelEndpointCommand.create({
    environmentId: MOCK_ENVIRONMENT_ID,
    organizationId: MOCK_ORGANIZATION_ID,
    integrationIdentifier: MOCK_INTEGRATION_IDENTIFIER,
    subscriberId: MOCK_SUBSCRIBER_ID,
    type: ENDPOINT_TYPES.SLACK_USER,
    endpoint: { userId: MOCK_VICTIM_SLACK_USER_ID },
    platformIdentityVerified,
  });
}

// Fire-and-forget confirmation runs synchronously up to its first await; flush the
// microtask queue so any invocation is observable before assertions.
async function flushMicrotasks(): Promise<void> {
  await new Promise((resolve) => setImmediate(resolve));
}

describe('CreateChannelEndpoint — auth card confirmation gating', () => {
  afterEach(() => {
    sinon.restore();
  });

  it('should NOT confirm auth cards for a slack_user endpoint when platformIdentityVerified is unset (public API path)', async () => {
    const { usecase, confirmLinkedAuthCards, moduleRef } = createHarness();

    await usecase.execute(buildSlackUserCommand());
    await flushMicrotasks();

    expect(moduleRef.get.called).to.be.false;
    expect(confirmLinkedAuthCards.execute.called).to.be.false;
  });

  it('should NOT confirm auth cards when platformIdentityVerified is explicitly false', async () => {
    const { usecase, confirmLinkedAuthCards } = createHarness();

    await usecase.execute(buildSlackUserCommand(false));
    await flushMicrotasks();

    expect(confirmLinkedAuthCards.execute.called).to.be.false;
  });

  it('should confirm auth cards only when the caller marks the platform identity verified', async () => {
    const { usecase, confirmLinkedAuthCards } = createHarness();

    await usecase.execute(buildSlackUserCommand(true));
    await flushMicrotasks();

    expect(confirmLinkedAuthCards.execute.calledOnce).to.be.true;
    const confirmArg = confirmLinkedAuthCards.execute.firstCall.args[0];
    expect(confirmArg.platformUserId).to.equal(MOCK_VICTIM_SLACK_USER_ID);
  });
});

function buildToolWebhookCommand(
  subscriberId: string,
  endpoint: { url: string; headers?: Record<string, string>; method?: 'POST' | 'PUT' | 'PATCH' }
) {
  return CreateChannelEndpointCommand.create({
    environmentId: MOCK_ENVIRONMENT_ID,
    organizationId: MOCK_ORGANIZATION_ID,
    integrationIdentifier: MOCK_TOOL_WEBHOOK_INTEGRATION_IDENTIFIER,
    subscriberId,
    type: ENDPOINT_TYPES.TOOL_WEBHOOK,
    endpoint,
  });
}

describe('CreateChannelEndpoint — tool_webhook connection-backed create', () => {
  const previousEncryptionKey = process.env.STORE_ENCRYPTION_KEY;

  before(() => {
    process.env.STORE_ENCRYPTION_KEY = previousEncryptionKey || 'XgVGHwIk^42&8v&xFowz1mp6^P3r*9l0';
  });

  after(() => {
    if (previousEncryptionKey === undefined) {
      delete process.env.STORE_ENCRYPTION_KEY;
    } else {
      process.env.STORE_ENCRYPTION_KEY = previousEncryptionKey;
    }
  });

  afterEach(() => {
    sinon.restore();
  });

  it('should create the connection first (encrypted auth) then the endpoint (empty document), and hydrate the response', async () => {
    const { usecase, integrationRepository, channelConnectionRepository, channelEndpointRepository } = createHarness();
    integrationRepository.findOne.resolves(buildMockToolWebhookIntegration());
    channelConnectionRepository.create.callsFake((doc: any) => Promise.resolve(doc));
    channelEndpointRepository.create.resolves({ identifier: 'chendp_webhook', endpoint: {} } as any);

    const result = await usecase.execute(
      buildToolWebhookCommand(MOCK_SUBSCRIBER_ID, { url: 'https://example.com/tools/incoming' })
    );

    expect(channelConnectionRepository.create.calledOnce).to.be.true;
    const connectionArg = channelConnectionRepository.create.firstCall.args[0] as any;
    expect(connectionArg.auth).to.not.deep.equal({ url: 'https://example.com/tools/incoming' });

    const endpointArg = channelEndpointRepository.create.firstCall.args[0] as any;
    expect(endpointArg.endpoint).to.deep.equal({});
    expect(endpointArg.connectionIdentifier).to.equal(connectionArg.identifier);

    expect((result.endpoint as { url: string }).url).to.equal('https://example.com/tools/incoming');
  });

  it('should reject creation when the integration is not a Tool webhook integration', async () => {
    const { usecase, integrationRepository } = createHarness();
    integrationRepository.findOne.resolves(buildMockIntegration());

    let caughtError: Error | undefined;
    try {
      await usecase.execute(buildToolWebhookCommand(MOCK_SUBSCRIBER_ID, { url: 'https://example.com/tools/incoming' }));
    } catch (err) {
      caughtError = err as Error;
    }

    expect(caughtError?.message).to.include('requires a Tool webhook integration');
  });

  it('should reject creation when the Tool webhook integration is not in dynamic routing mode', async () => {
    const { usecase, integrationRepository } = createHarness();
    integrationRepository.findOne.resolves(buildMockToolWebhookIntegration('static'));

    let caughtError: Error | undefined;
    try {
      await usecase.execute(buildToolWebhookCommand(MOCK_SUBSCRIBER_ID, { url: 'https://example.com/tools/incoming' }));
    } catch (err) {
      caughtError = err as Error;
    }

    expect(caughtError?.message).to.include('dynamic routingMode');
  });

  it('should allow creating multiple tool_webhook endpoints for the same subscriber and integration', async () => {
    const { usecase, integrationRepository, channelConnectionRepository } = createHarness();
    integrationRepository.findOne.resolves(buildMockToolWebhookIntegration());

    await usecase.execute(buildToolWebhookCommand(MOCK_SUBSCRIBER_ID, { url: 'https://example.com/tools/first' }));
    await usecase.execute(buildToolWebhookCommand(MOCK_SUBSCRIBER_ID, { url: 'https://example.com/tools/second' }));

    expect(channelConnectionRepository.create.calledTwice).to.be.true;
  });
});
