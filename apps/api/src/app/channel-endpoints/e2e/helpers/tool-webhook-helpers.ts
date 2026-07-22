import { IntegrationRepository } from '@novu/dal';
import { ChannelTypeEnum, ToolProviderIdEnum } from '@novu/shared';
import { UserSession } from '@novu/testing';

const integrationRepository = new IntegrationRepository();

export const VALID_TOOL_WEBHOOK_URL = 'https://example.com/tools/incoming';

export async function createToolWebhookIntegration(session: UserSession) {
  return integrationRepository.create({
    _organizationId: session.organization._id,
    _environmentId: session.environment._id,
    providerId: ToolProviderIdEnum.Webhook,
    channel: ChannelTypeEnum.TOOL,
    credentials: {},
    active: true,
    identifier: `tool-webhook-${Date.now()}`,
  });
}
