import { Injectable, NotFoundException } from '@nestjs/common';
import {
  AgentIntegrationRepository,
  AgentRepository,
  ChannelEndpointRepository,
  IntegrationRepository,
  SubscriberRepository,
} from '@novu/dal';
import { ChatProviderIdEnum, ENDPOINT_TYPES } from '@novu/shared';
import { CreateChannelEndpointCommand } from '../../channel-endpoints/usecases/create-channel-endpoint/create-channel-endpoint.command';
import { CreateChannelEndpoint } from '../../channel-endpoints/usecases/create-channel-endpoint/create-channel-endpoint.usecase';
import type { WhatsAppBindCodePayload } from './whatsapp-bind-code.service';

export type BindWhatsAppNumberResult = {
  /** False when the number was already this person's. */
  created: boolean;
  subscriberId: string;
};

/**
 * Binds the WhatsApp number that sent a live code to the person the code was made for: a `phone` endpoint on the
 * relay's WhatsApp Business integration. Delivery counts a `phone` endpoint as WhatsApp only on that provider, so
 * the numbers the channel-endpoints API keeps for SMS never count. A number belongs to one person: proving it again
 * for someone else moves it, like a Telegram chat.
 */
@Injectable()
export class BindWhatsAppNumber {
  constructor(
    private readonly agentRepository: AgentRepository,
    private readonly agentIntegrationRepository: AgentIntegrationRepository,
    private readonly integrationRepository: IntegrationRepository,
    private readonly subscriberRepository: SubscriberRepository,
    private readonly channelEndpointRepository: ChannelEndpointRepository,
    private readonly createChannelEndpoint: CreateChannelEndpoint
  ) {}

  /** `phoneNumber` is the sender's number in E.164, as WhatsApp reported it. */
  async execute(payload: WhatsAppBindCodePayload, phoneNumber: string): Promise<BindWhatsAppNumberResult> {
    const scope = { _environmentId: payload.environmentId, _organizationId: payload.organizationId };

    const integration = await this.integrationRepository.findOne(
      { ...scope, _id: payload.integrationId },
      '_id identifier providerId active'
    );
    if (!integration || integration.providerId !== ChatProviderIdEnum.WhatsAppBusiness || !integration.active) {
      throw new NotFoundException('WhatsApp integration not found for this code.');
    }

    const agent = await this.agentRepository.findOne({ ...scope, identifier: payload.agentIdentifier }, ['_id']);
    const link =
      agent &&
      (await this.agentIntegrationRepository.findOne(
        { ...scope, _agentId: agent._id, _integrationId: integration._id },
        ['_id']
      ));
    if (!link) {
      throw new NotFoundException('The WhatsApp integration is no longer linked to this agent.');
    }

    const subscriber = await this.subscriberRepository.findBySubscriberId(payload.environmentId, payload.subscriberId);
    if (!subscriber) {
      throw new NotFoundException('Contact not found for this code.');
    }

    const existing = await this.channelEndpointRepository.findByPlatformIdentity({
      ...scope,
      integrationIdentifier: integration.identifier,
      type: ENDPOINT_TYPES.PHONE,
      endpointField: 'phoneNumber',
      endpointValue: phoneNumber,
    });

    if (existing) {
      if (existing.subscriberId === subscriber.subscriberId) {
        return { created: false, subscriberId: subscriber.subscriberId };
      }

      await this.channelEndpointRepository.delete({ ...scope, _id: existing._id });
    }

    await this.createChannelEndpoint.execute(
      CreateChannelEndpointCommand.create({
        environmentId: payload.environmentId,
        organizationId: payload.organizationId,
        integrationIdentifier: integration.identifier,
        subscriberId: subscriber.subscriberId,
        type: ENDPOINT_TYPES.PHONE,
        endpoint: { phoneNumber },
        // The number wrote a live code to the business number itself.
        platformIdentityVerified: true,
      })
    );

    return { created: true, subscriberId: subscriber.subscriberId };
  }
}
