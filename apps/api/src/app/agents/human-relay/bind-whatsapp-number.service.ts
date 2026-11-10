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
import { CONTACT_HANDLE_FIELDS } from '../../human/services/contact-handle';
import type { WhatsAppBindCodePayload } from './whatsapp-bind-code.service';
import { provedWhatsAppNumberOf, WHATSAPP_NUMBER_PROVED_AT_FIELD } from './whatsapp-number-proof';

const HANDLE_UNSET = Object.fromEntries(CONTACT_HANDLE_FIELDS.map((field) => [`endpoint.${field}`, '']));

export type BindWhatsAppNumberResult = {
  /** False when the number was already this person's. */
  created: boolean;
  subscriberId: string;
};

/**
 * Binds the WhatsApp number that sent a live code to the person the code was made for: a `phone` endpoint on the
 * relay's WhatsApp Business integration. Delivery counts a `phone` endpoint as WhatsApp only on that provider, so
 * the numbers the channel-endpoints API keeps for SMS never count, and it also needs the proof kept next to the
 * number, which that API can't write. A number belongs to one person: proving it again for someone else moves it,
 * like a Telegram chat.
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

    const proof = { [`endpoint.${WHATSAPP_NUMBER_PROVED_AT_FIELD}`]: new Date().toISOString() };

    if (existing) {
      const ownedAlready = existing.subscriberId === subscriber.subscriberId;
      if (ownedAlready && provedWhatsAppNumberOf(existing)) {
        return { created: false, subscriberId: subscriber.subscriberId };
      }

      // One write, so a move that fails leaves the number with whoever had it. Someone else's name goes with them.
      await this.saveProof(scope, existing._id, phoneNumber, {
        $set: { subscriberId: subscriber.subscriberId, ...proof },
        ...(ownedAlready ? {} : { $unset: HANDLE_UNSET }),
      });

      return { created: true, subscriberId: subscriber.subscriberId };
    }

    // The channel-endpoints API takes a `phone` endpoint as exactly `{ phoneNumber }`, so the proof is added after.
    const created = await this.createChannelEndpoint.execute(
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
    await this.saveProof(scope, created._id, phoneNumber, { $set: proof });

    return { created: true, subscriberId: subscriber.subscriberId };
  }

  /**
   * Writes the proof only while the endpoint still holds the number that sent the code: the channel-endpoints API
   * can change the number in between, and the proof must never land on one that didn't send it.
   */
  private async saveProof(
    scope: { _environmentId: string; _organizationId: string },
    endpointId: string,
    phoneNumber: string,
    change: Parameters<ChannelEndpointRepository['update']>[1]
  ): Promise<void> {
    const { matched } = await this.channelEndpointRepository.update(
      { ...scope, _id: endpointId, 'endpoint.phoneNumber': phoneNumber },
      change
    );
    if (matched === 0) {
      throw new NotFoundException('The number changed before it could be bound.');
    }
  }
}
