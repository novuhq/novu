import { Injectable } from '@nestjs/common';
import { PinoLogger } from '@novu/application-generic';
import { ChannelEndpointRepository } from '@novu/dal';
import { AgentPlatformEnum } from '../dtos/agent-platform.enum';
import { PLATFORM_ENDPOINT_CONFIG } from '../utils/platform-endpoint-config';

export interface ResolveSubscriberParams {
  environmentId: string;
  organizationId: string;
  platform: AgentPlatformEnum;
  platformUserId: string;
  integrationIdentifier: string;
}

@Injectable()
export class AgentSubscriberResolver {
  constructor(
    private readonly channelEndpointRepository: ChannelEndpointRepository,
    private readonly logger: PinoLogger
  ) {}

  async resolve(params: ResolveSubscriberParams): Promise<string | null> {
    const { environmentId, organizationId, platform, platformUserId, integrationIdentifier } = params;
    const endpointConfig = PLATFORM_ENDPOINT_CONFIG[platform];

    if (!endpointConfig) {
      this.logger.debug(
        `No endpoint config for platform ${platform} — subscriber resolution skipped (integration: ${integrationIdentifier})`
      );

      return null;
    }

    const endpoint = await this.channelEndpointRepository.findByPlatformIdentity({
      _environmentId: environmentId,
      _organizationId: organizationId,
      integrationIdentifier,
      type: endpointConfig.endpointType,
      endpointField: endpointConfig.identityField,
      endpointValue: platformUserId,
    });

    if (endpoint) {
      this.logger.debug(`Resolved platform user ${platform}:${platformUserId} → subscriber ${endpoint.subscriberId}`);

      return endpoint.subscriberId;
    }

    this.logger.debug(
      `No subscriber linked for platform user ${platform}:${platformUserId} (integration: ${integrationIdentifier})`
    );

    return null;
  }
}
