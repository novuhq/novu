import { Novu } from '@novu/api';
import {
  CreateChannelConnectionRequestDto,
  CreateSlackChannelEndpointDto,
  CreateWebhookEndpointDto,
} from '@novu/api/models/components';
import { IntegrationRepository } from '@novu/dal';
import { ChannelTypeEnum, ChatProviderIdEnum, ENDPOINT_TYPES } from '@novu/shared';
import { SubscribersService, UserSession } from '@novu/testing';
import { initNovuClassSdkInternalAuth } from '../../../shared/helpers/e2e/sdk/e2e-sdk.helper';

const integrationRepository = new IntegrationRepository();

export async function createSlackIntegration(session: UserSession) {
  return await integrationRepository.create({
    _organizationId: session.organization._id,
    _environmentId: session.environment._id,
    providerId: ChatProviderIdEnum.Slack,
    channel: ChannelTypeEnum.CHAT,
    credentials: {},
    active: true,
    identifier: `slack-${Date.now()}`,
  });
}

export function createSubscribersService(session: UserSession) {
  return new SubscribersService(session.organization._id, session.environment._id);
}

export async function createConnection(
  novuClient: Novu,
  integrationIdentifier: string,
  subscriberId?: string,
  context?: { [key: string]: string }
) {
  const createDto: CreateChannelConnectionRequestDto = {
    integrationIdentifier,
    subscriberId,
    context,
    workspace: {
      id: `T${Date.now()}`,
      name: 'Test Workspace',
    },
    auth: {
      accessToken: `xoxb-token-${Date.now()}`,
    },
  };

  const { result } = await novuClient.channelConnections.create(createDto);
  return result;
}

export async function createSlackChannelEndpoint(
  novuClient: Novu,
  integrationIdentifier: string,
  subscriberId: string,
  connectionIdentifier?: string
) {
  const createDto: CreateSlackChannelEndpointDto = {
    integrationIdentifier,
    subscriberId,
    connectionIdentifier,
    type: ENDPOINT_TYPES.SLACK_CHANNEL,
    endpoint: {
      channelId: `C${Date.now()}`,
    },
  };

  const { result } = await novuClient.channelEndpoints.create(createDto);
  return result;
}

export async function createWebhookEndpoint(
  novuClient: Novu,
  integrationIdentifier: string,
  subscriberId: string,
  context?: { [key: string]: string }
) {
  const createDto: CreateWebhookEndpointDto = {
    integrationIdentifier,
    subscriberId,
    context,
    type: ENDPOINT_TYPES.WEBHOOK,
    endpoint: {
      url: `https://example.com/webhook-${Date.now()}`,
    },
  };

  const { result } = await novuClient.channelEndpoints.create(createDto);
  return result;
}

export function setupChannelTests(session: UserSession) {
  (process.env as Record<string, string>).IS_SLACK_TEAMS_ENABLED = 'true';
  return initNovuClassSdkInternalAuth(session);
}
