import { Injectable, NotFoundException } from '@nestjs/common';
import { InstrumentUsecase, PinoLogger } from '@novu/application-generic';
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
import { isTelegramLinkScope, type TelegramLinkScope } from '../telegram-link-scope';
import { LinkTelegramChatToSubscriberCommand } from './link-telegram-chat-to-subscriber.command';

export interface LinkTelegramChatToSubscriberResult {
  /** Whether a new endpoint was created (false when an existing endpoint already mapped this chatId). */
  created: boolean;
  /** The subscriber id that was (or already was) linked to the chat. */
  subscriberId: string;
  /** Scope that authorized this link (agent-backed or integration-only). */
  linkScope: TelegramLinkScope;
}

@Injectable()
export class LinkTelegramChatToSubscriber {
  constructor(
    private readonly agentRepository: AgentRepository,
    private readonly integrationRepository: IntegrationRepository,
    private readonly agentIntegrationRepository: AgentIntegrationRepository,
    private readonly subscriberRepository: SubscriberRepository,
    private readonly channelEndpointRepository: ChannelEndpointRepository,
    private readonly createChannelEndpoint: CreateChannelEndpoint,
    private readonly logger: PinoLogger
  ) {
    this.logger.setContext(this.constructor.name);
  }

  @InstrumentUsecase()
  async execute(command: LinkTelegramChatToSubscriberCommand): Promise<LinkTelegramChatToSubscriberResult> {
    if (!isTelegramLinkScope(command.linkScope)) {
      throw new NotFoundException('Invalid Telegram link scope.');
    }

    const integration = await this.integrationRepository.findOne(
      {
        _id: command.integrationId,
        _environmentId: command.environmentId,
        _organizationId: command.organizationId,
      },
      '_id identifier providerId'
    );

    if (!integration || integration.providerId !== ChatProviderIdEnum.Telegram) {
      throw new NotFoundException('Telegram integration not found for this link.');
    }

    const linkScope = await this.resolveAndValidateLinkScope(command, String(integration._id));

    const subscriber = await this.subscriberRepository.findBySubscriberId(command.environmentId, command.subscriberId);
    if (!subscriber) {
      throw new NotFoundException('Subscriber not found for this link.');
    }

    const existing = await this.channelEndpointRepository.findByPlatformIdentity({
      _environmentId: command.environmentId,
      _organizationId: command.organizationId,
      integrationIdentifier: integration.identifier,
      type: ENDPOINT_TYPES.TELEGRAM_CHAT,
      endpointField: 'chatId',
      endpointValue: command.chatId,
    });

    if (existing) {
      if (existing.subscriberId === subscriber.subscriberId) {
        return {
          created: false,
          subscriberId: subscriber.subscriberId,
          linkScope,
        };
      }

      await this.channelEndpointRepository.delete({
        _id: existing._id,
        _environmentId: command.environmentId,
        _organizationId: command.organizationId,
      });
    }

    await this.createChannelEndpoint.execute(
      CreateChannelEndpointCommand.create({
        environmentId: command.environmentId,
        organizationId: command.organizationId,
        integrationIdentifier: integration.identifier,
        subscriberId: subscriber.subscriberId,
        type: ENDPOINT_TYPES.TELEGRAM_CHAT,
        endpoint: { chatId: command.chatId },
        context: command.context,
        contextKeys: command.contextKeys,
        // chatId originates from a verified Telegram deep-link start payload.
        platformIdentityVerified: true,
      })
    );

    return {
      created: true,
      subscriberId: subscriber.subscriberId,
      linkScope,
    };
  }

  private async resolveAndValidateLinkScope(
    command: LinkTelegramChatToSubscriberCommand,
    integrationId: string
  ): Promise<TelegramLinkScope> {
    switch (command.linkScope.mode) {
      case 'integration': {
        return { mode: 'integration' };
      }
      case 'agent': {
        const agent = await this.agentRepository.findOne(
          {
            identifier: command.linkScope.agentIdentifier,
            _environmentId: command.environmentId,
            _organizationId: command.organizationId,
          },
          ['_id', 'identifier']
        );

        if (!agent) {
          throw new NotFoundException('Agent not found for this link.');
        }

        const agentLink = await this.agentIntegrationRepository.findOne(
          {
            _agentId: agent._id,
            _integrationId: integrationId,
            _environmentId: command.environmentId,
            _organizationId: command.organizationId,
          },
          ['_id']
        );

        if (!agentLink) {
          throw new NotFoundException('Integration is not linked to this agent.');
        }

        return { mode: 'agent', agentIdentifier: agent.identifier };
      }
      default: {
        const _exhaustive: never = command.linkScope;

        throw new NotFoundException(`Unhandled Telegram link scope: ${JSON.stringify(_exhaustive)}`);
      }
    }
  }
}
