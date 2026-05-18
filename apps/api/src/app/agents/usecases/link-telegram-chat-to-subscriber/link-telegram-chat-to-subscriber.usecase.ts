import { Injectable } from '@nestjs/common';
import { InstrumentUsecase, PinoLogger } from '@novu/application-generic';
import {
  AgentIntegrationRepository,
  AgentRepository,
  ChannelEndpointRepository,
  IntegrationRepository,
  SubscriberRepository,
} from '@novu/dal';
import { ChatProviderIdEnum, ENDPOINT_TYPES } from '@novu/shared';
import { CreateChannelEndpointCommand } from '../../../channel-endpoints/usecases/create-channel-endpoint/create-channel-endpoint.command';
import { CreateChannelEndpoint } from '../../../channel-endpoints/usecases/create-channel-endpoint/create-channel-endpoint.usecase';
import {
  InvalidTelegramSubscriberLinkTokenError,
  TelegramMobileLinkTokenService,
} from '../../services/telegram-mobile-link-token.service';
import { LinkTelegramChatToSubscriberCommand } from './link-telegram-chat-to-subscriber.command';

export interface LinkTelegramChatToSubscriberResult {
  /** Whether a new endpoint was created (false when an existing endpoint already mapped this chatId). */
  created: boolean;
  /** The subscriber id that was (or already was) linked to the chat. */
  subscriberId: string;
  /** External agent identifier owning the integration. */
  agentIdentifier: string;
}

export class LinkTelegramChatTokenError extends Error {
  constructor(public readonly reason: 'invalid' | 'expired' | 'used' | 'mismatch' | 'chat_already_linked') {
    super(`Telegram subscriber-link token is ${reason}`);
  }
}

@Injectable()
export class LinkTelegramChatToSubscriber {
  constructor(
    private readonly tokenService: TelegramMobileLinkTokenService,
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
    const payload = this.verifyToken(command.token);

    // Atomically mark this jti as used. If another concurrent /start with the
    // same token wins, we still allow the side-effect (creating the endpoint
    // for this chatId) only when the row doesn't already exist — see the
    // findOne check below. We do NOT release the jti on duplicate work because
    // any successful side-effect (idempotent or not) must consume the token.
    const claimed = await this.tokenService.claimSubscriberLinkJti(payload.jti);
    if (!claimed) {
      throw new LinkTelegramChatTokenError('used');
    }

    try {
      const integration = await this.integrationRepository.findOne(
        {
          _id: payload.iid,
          _environmentId: payload.env,
          _organizationId: payload.org,
        },
        '_id identifier providerId'
      );

      if (!integration || integration.providerId !== ChatProviderIdEnum.Telegram) {
        throw new LinkTelegramChatTokenError('mismatch');
      }

      const agent = await this.agentRepository.findOne(
        {
          identifier: payload.aid,
          _environmentId: payload.env,
          _organizationId: payload.org,
        },
        ['_id', 'identifier']
      );

      if (!agent) {
        throw new LinkTelegramChatTokenError('mismatch');
      }

      const agentLink = await this.agentIntegrationRepository.findOne(
        {
          _agentId: agent._id,
          _integrationId: integration._id,
          _environmentId: payload.env,
          _organizationId: payload.org,
        },
        ['_id']
      );

      if (!agentLink) {
        throw new LinkTelegramChatTokenError('mismatch');
      }

      const subscriber = await this.subscriberRepository.findBySubscriberId(payload.env, payload.sid);
      if (!subscriber) {
        throw new LinkTelegramChatTokenError('mismatch');
      }

      // Idempotency: if an endpoint already exists mapping this chatId for the
      // integration, return success without creating another row. Protects
      // against the user clicking the deep link twice before token revocation
      // propagates.
      const existing = await this.channelEndpointRepository.findByPlatformIdentity({
        _environmentId: payload.env,
        _organizationId: payload.org,
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
            agentIdentifier: agent.identifier,
          };
        }

        // Same chat already maps to a different subscriber. Refuse to silently
        // re-link — the customer must delete the prior endpoint first via the
        // public REST API. The jti has been consumed so a fresh token must be
        // issued for the retry.
        throw new LinkTelegramChatTokenError('chat_already_linked');
      }

      await this.createChannelEndpoint.execute(
        CreateChannelEndpointCommand.create({
          environmentId: payload.env,
          organizationId: payload.org,
          integrationIdentifier: integration.identifier,
          subscriberId: subscriber.subscriberId,
          type: ENDPOINT_TYPES.TELEGRAM_CHAT,
          endpoint: { chatId: command.chatId },
        })
      );

      return {
        created: true,
        subscriberId: subscriber.subscriberId,
        agentIdentifier: agent.identifier,
      };
    } catch (err) {
      // Release the claimed jti so the user can retry, but only for validation
      // failures the user can act on — never for downstream errors that may
      // have produced partial side effects (e.g. a half-written endpoint row).
      if (err instanceof LinkTelegramChatTokenError && err.reason === 'mismatch') {
        await this.tokenService.releaseSubscriberLinkJti(payload.jti).catch(() => {});
      }

      throw err;
    }
  }

  private verifyToken(token: string) {
    try {
      return this.tokenService.verifySubscriberLink(token);
    } catch (err) {
      if (err instanceof InvalidTelegramSubscriberLinkTokenError) {
        throw new LinkTelegramChatTokenError(err.reason);
      }
      throw err;
    }
  }
}
