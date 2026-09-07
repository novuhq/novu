import { IntegrationRepository } from '@novu/dal';
import { ChannelTypeEnum, ToolProviderIdEnum } from '@novu/shared';
import { UserSession } from '@novu/testing';

const integrationRepository = new IntegrationRepository();

export const VALID_OPSGENIE_API_KEY = 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d';

export async function createOpsgenieIntegration(session: UserSession) {
  return integrationRepository.create({
    _organizationId: session.organization._id,
    _environmentId: session.environment._id,
    providerId: ToolProviderIdEnum.Opsgenie,
    channel: ChannelTypeEnum.TOOL,
    credentials: {},
    active: true,
    identifier: `opsgenie-${Date.now()}`,
  });
}
