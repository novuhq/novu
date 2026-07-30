import { IntegrationRepository } from '@novu/dal';
import { ChannelTypeEnum, ToolProviderIdEnum } from '@novu/shared';
import { UserSession } from '@novu/testing';

const integrationRepository = new IntegrationRepository();

export const VALID_GRAFANA_WEBHOOK_URL =
  'https://acme.grafana.net/integrations/v1/formatted_webhook/m12xmIjOcgwH74UF8CN4dk0Dh/';

export async function createGrafanaIntegration(session: UserSession) {
  return integrationRepository.create({
    _organizationId: session.organization._id,
    _environmentId: session.environment._id,
    providerId: ToolProviderIdEnum.Grafana,
    channel: ChannelTypeEnum.TOOL,
    credentials: {},
    active: true,
    identifier: `grafana-${Date.now()}`,
  });
}
