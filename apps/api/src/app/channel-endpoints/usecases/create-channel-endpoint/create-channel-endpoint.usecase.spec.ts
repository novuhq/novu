import {
  ChannelConnectionRepository,
  ChannelEndpointRepository,
  ContextRepository,
  IntegrationRepository,
  SubscriberRepository,
} from '@novu/dal';
import { ChatProviderIdEnum, ENDPOINT_TYPES } from '@novu/shared';
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

function createHarness() {
  const channelEndpointRepository = sinon.createStubInstance(ChannelEndpointRepository);
  const channelConnectionRepository = sinon.createStubInstance(ChannelConnectionRepository);
  const integrationRepository = sinon.createStubInstance(IntegrationRepository);
  const subscriberRepository = sinon.createStubInstance(SubscriberRepository);
  const contextRepository = sinon.createStubInstance(ContextRepository);
  const confirmLinkedAuthCards = sinon.createStubInstance(ConfirmLinkedAuthCards);
  const moduleRef = { get: sinon.stub().returns(confirmLinkedAuthCards) };
  const logger = { setContext: sinon.stub(), warn: sinon.stub(), info: sinon.stub(), debug: sinon.stub() };

  integrationRepository.findOne.resolves(buildMockIntegration());
  channelEndpointRepository.findOne.resolves(null as any);
  channelEndpointRepository.create.resolves({ identifier: 'chendp_test' } as any);
  subscriberRepository.findOne.resolves({ subscriberId: MOCK_SUBSCRIBER_ID } as any);

  const usecase = new CreateChannelEndpoint(
    channelEndpointRepository as any,
    channelConnectionRepository as any,
    integrationRepository as any,
    subscriberRepository as any,
    contextRepository as any,
    moduleRef as any,
    logger as any
  );

  return { usecase, confirmLinkedAuthCards, moduleRef };
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
