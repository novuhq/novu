import { encryptCredentials } from '@novu/application-generic';
import {
  AgentIntegrationRepository,
  AgentRepository,
  ChannelConnectionRepository,
  ChannelEndpointRepository,
  ConversationActivityRepository,
  ConversationRepository,
  ConversationStatusEnum,
  IntegrationRepository,
} from '@novu/dal';
import { ChannelTypeEnum, ChatProviderIdEnum, ENDPOINT_TYPES } from '@novu/shared';
import { UserSession } from '@novu/testing';

const SIGNING_SECRET = 'test-slack-signing-secret';
const BOT_TOKEN = 'xoxb-fake-bot-token-for-e2e';

export interface AgentTestContext {
  session: UserSession;
  agentId: string;
  agentIdentifier: string;
  integrationId: string;
  integrationIdentifier: string;
  signingSecret: string;
}

export interface ReplyTestContext extends AgentTestContext {
  conversationId: string;
}

export const conversationRepository = new ConversationRepository();
export const activityRepository = new ConversationActivityRepository();
export const channelEndpointRepository = new ChannelEndpointRepository();

const integrationRepository = new IntegrationRepository();
const agentIntegrationRepository = new AgentIntegrationRepository();
const channelConnectionRepository = new ChannelConnectionRepository();

export async function setupAgentTestContext(): Promise<AgentTestContext> {
  const session = new UserSession();
  await session.initialize();

  const agentIdentifier = `e2e-wh-agent-${Date.now()}`;
  const createRes = await session.testAgent.post('/v1/agents').send({
    name: 'Webhook E2E Agent',
    identifier: agentIdentifier,
  });
  const agentId = createRes.body.data._id as string;

  const integration = await integrationRepository.create({
    _environmentId: session.environment._id,
    _organizationId: session.organization._id,
    providerId: ChatProviderIdEnum.Slack,
    channel: ChannelTypeEnum.CHAT,
    credentials: encryptCredentials({ signingSecret: SIGNING_SECRET }),
    active: true,
    name: 'Slack Agent E2E',
    identifier: `slack-agent-e2e-${Date.now()}`,
    priority: 1,
    primary: false,
    deleted: false,
  });

  await agentIntegrationRepository.create({
    _agentId: agentId,
    _integrationId: integration._id,
    _environmentId: session.environment._id,
    _organizationId: session.organization._id,
  });

  await channelConnectionRepository.create({
    identifier: `conn-e2e-${Date.now()}`,
    _environmentId: session.environment._id,
    _organizationId: session.organization._id,
    integrationIdentifier: integration.identifier,
    providerId: ChatProviderIdEnum.Slack,
    channel: ChannelTypeEnum.CHAT,
    contextKeys: [],
    workspace: { id: 'W_TEAM', name: 'Test Workspace' },
    auth: { accessToken: BOT_TOKEN },
  });

  return {
    session,
    agentId,
    agentIdentifier,
    integrationId: integration._id,
    integrationIdentifier: integration.identifier,
    signingSecret: SIGNING_SECRET,
  };
}

export async function seedConversation(
  ctx: AgentTestContext,
  opts: { withSerializedThread?: boolean; status?: ConversationStatusEnum; metadata?: Record<string, unknown> } = {}
): Promise<string> {
  const { session, agentId, integrationId } = ctx;
  const withThread = opts.withSerializedThread ?? true;

  const conversation = await conversationRepository.create({
    identifier: `conv-e2e-${Date.now()}`,
    _agentId: agentId,
    participants: [
      { type: 'agent' as const, id: agentId },
      { type: 'platform_user' as const, id: 'slack:U_SEED' },
    ],
    channels: [
      {
        platform: 'slack',
        _integrationId: integrationId,
        platformThreadId: `thread-${Date.now()}`,
        ...(withThread ? { serializedThread: { id: 'T_SERIALIZED', platform: 'slack' } } : {}),
      },
    ],
    status: opts.status ?? ConversationStatusEnum.ACTIVE,
    title: 'Seeded conversation',
    metadata: opts.metadata ?? {},
    _environmentId: session.environment._id,
    _organizationId: session.organization._id,
    lastActivityAt: new Date().toISOString(),
  });

  return conversation._id;
}

export async function seedChannelEndpoint(ctx: AgentTestContext, platformUserId: string, subscriberId: string) {
  await channelEndpointRepository.create({
    identifier: `ep-e2e-${Date.now()}`,
    _environmentId: ctx.session.environment._id,
    _organizationId: ctx.session.organization._id,
    integrationIdentifier: ctx.integrationIdentifier,
    providerId: ChatProviderIdEnum.Slack,
    channel: ChannelTypeEnum.CHAT,
    subscriberId,
    contextKeys: [],
    type: ENDPOINT_TYPES.SLACK_USER,
    endpoint: { userId: platformUserId },
  });
}
