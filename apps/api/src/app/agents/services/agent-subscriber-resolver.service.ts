import { Injectable } from '@nestjs/common';
import { PinoLogger } from '@novu/application-generic';
import { ChannelEndpointRepository, SubscriberRepository } from '@novu/dal';
import { AgentPlatformEnum } from '../dtos/agent-platform.enum';
import { isValidEmailForLookup, normalizeEmailForLookup } from '../utils/email-normalization';
import { getPhoneLookupCandidates } from '../utils/phone-normalization';
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
    private readonly subscriberRepository: SubscriberRepository,
    private readonly logger: PinoLogger
  ) {
    this.logger.setContext(this.constructor.name);
  }

  async resolve(params: ResolveSubscriberParams): Promise<string | null> {
    const { environmentId, organizationId, platform, platformUserId, integrationIdentifier } = params;

    if (!platformUserId.trim()) {
      return null;
    }

    if (platform === AgentPlatformEnum.WHATSAPP) {
      return this.resolveWhatsAppSubscriber({
        environmentId,
        organizationId,
        platformUserId,
      });
    }

    if (platform === AgentPlatformEnum.EMAIL) {
      return this.resolveEmailSubscriber({
        environmentId,
        organizationId,
        platformUserId,
      });
    }

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

  private async resolveWhatsAppSubscriber(params: {
    environmentId: string;
    organizationId: string;
    platformUserId: string;
  }): Promise<string | null> {
    const { environmentId, organizationId, platformUserId } = params;
    const phoneCandidates = getPhoneLookupCandidates(platformUserId);
    const matches = await this.subscriberRepository.findByPhone(environmentId, organizationId, phoneCandidates);

    if (matches.length > 1) {
      this.logger.warn(
        `Multiple subscribers (${matches.length}) share phone ${platformUserId} in environment ${environmentId} — using first match`
      );
    }

    const subscriber = matches[0];

    if (subscriber) {
      this.logger.debug(`Resolved WhatsApp phone ${platformUserId} → subscriber ${subscriber.subscriberId}`);

      return subscriber.subscriberId;
    }

    this.logger.debug(`No subscriber found for WhatsApp phone ${platformUserId}`);

    return null;
  }

  private async resolveEmailSubscriber(params: {
    environmentId: string;
    organizationId: string;
    platformUserId: string;
  }): Promise<string | null> {
    const { environmentId, organizationId, platformUserId } = params;
    const email = normalizeEmailForLookup(platformUserId);

    if (!isValidEmailForLookup(email)) {
      this.logger.debug(`Skipping email subscriber lookup for invalid address "${platformUserId}"`);

      return null;
    }

    const matches = await this.subscriberRepository.findByEmail(environmentId, organizationId, email);

    if (matches.length > 1) {
      this.logger.warn(
        `Multiple subscribers (${matches.length}) share email ${email} in environment ${environmentId} — using first match`
      );
    }

    const subscriber = matches[0];

    if (subscriber) {
      this.logger.debug(`Resolved email ${email} → subscriber ${subscriber.subscriberId}`);

      return subscriber.subscriberId;
    }

    this.logger.debug(`No subscriber found for email ${email}`);

    return null;
  }
}
