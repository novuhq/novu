import { BadRequestException, Injectable, OnModuleDestroy } from '@nestjs/common';
import { PinoLogger } from '@novu/application-generic';
import { ConversationParticipantTypeEnum, ICredentialsEntity } from '@novu/dal';
import type { Chat, Message, Thread } from 'chat';
import { Request as ExpressRequest, Response as ExpressResponse } from 'express';
import { LRUCache } from 'lru-cache';
import { AgentPlatformEnum } from '../dtos/agent-platform.enum';
import { sendWebResponse, toWebRequest } from '../utils/express-to-web-request';
import { AgentCredentialService, ResolvedPlatformConfig } from './agent-credential.service';
import { AgentConversationService } from './agent-conversation.service';
import { AgentSubscriberResolver } from './agent-subscriber-resolver.service';

/**
 * ICredentials field mapping per platform adapter:
 *
 * Slack:    credentials.apiKey        → signingSecret
 *           connection.auth.accessToken → botToken
 *
 * Teams:    credentials.clientId  → appId
 *           credentials.secretKey → appPassword
 *           credentials.tenantId  → appTenantId
 *
 * WhatsApp: credentials.token                    → accessToken
 *           credentials.secretKey                → appSecret
 *           credentials.apiToken                 → verifyToken
 *           credentials.phoneNumberIdentification → phoneNumberId
 *
 * Telegram: credentials.apiToken → botToken
 */

// Chat SDK packages are ESM-only; SWC rewrites import() → require() for CJS output.
// Wrapping in new Function prevents SWC from seeing the import() keyword.
// eslint-disable-next-line @typescript-eslint/no-implied-eval
const esmImport = new Function('specifier', 'return import(specifier)') as (s: string) => Promise<any>;

const MAX_CACHED_INSTANCES = 200;
const INSTANCE_TTL_MS = 1000 * 60 * 30;

@Injectable()
export class ChatSdkService implements OnModuleDestroy {
  private readonly instances: LRUCache<string, Chat>;

  constructor(
    private readonly logger: PinoLogger,
    private readonly agentCredentialService: AgentCredentialService,
    private readonly subscriberResolver: AgentSubscriberResolver,
    private readonly conversationService: AgentConversationService
  ) {
    this.instances = new LRUCache<string, Chat>({
      max: MAX_CACHED_INSTANCES,
      ttl: INSTANCE_TTL_MS,
      dispose: (chat, key) => {
        chat.shutdown().catch((err) => {
          this.logger.error(err, `Failed to shut down evicted Chat instance ${key}`);
        });
      },
    });
  }

  async handleWebhook(agentId: string, integrationIdentifier: string, req: ExpressRequest, res: ExpressResponse) {
    const config = await this.agentCredentialService.resolve(agentId, integrationIdentifier);
    const { platform } = config;
    const instanceKey = `${agentId}:${integrationIdentifier}`;

    const chat = await this.getOrCreate(instanceKey, agentId, platform, config);
    const handler = chat.webhooks[platform];
    if (!handler) {
      throw new BadRequestException(`Platform ${platform} not configured for agent ${agentId}`);
    }

    const webRequest = toWebRequest(req);
    const webResponse = await handler(webRequest);
    await sendWebResponse(webResponse, res);
  }

  evict(agentId: string, integrationIdentifier?: string) {
    if (integrationIdentifier) {
      this.instances.delete(`${agentId}:${integrationIdentifier}`);
    } else {
      for (const key of this.instances.keys()) {
        if (key.startsWith(`${agentId}:`)) {
          this.instances.delete(key);
        }
      }
    }
  }

  async onModuleDestroy() {
    const shutdowns = [...this.instances.entries()].map(async ([key, chat]) => {
      try {
        await chat.shutdown();
      } catch (err) {
        this.logger.error(err, `Failed to shut down Chat instance ${key}`);
      }
    });

    await Promise.allSettled(shutdowns);
    this.instances.clear();
  }

  private async getOrCreate(
    instanceKey: string,
    agentId: string,
    platform: AgentPlatformEnum,
    config: ResolvedPlatformConfig
  ): Promise<Chat> {
    const existing = this.instances.get(instanceKey);
    if (existing) return existing;

    const chat = await this.createChatInstance(instanceKey, platform, config);
    this.registerEventHandlers(agentId, chat, config);
    this.instances.set(instanceKey, chat);

    return chat;
  }

  private async createChatInstance(
    instanceKey: string,
    platform: AgentPlatformEnum,
    config: ResolvedPlatformConfig
  ): Promise<Chat> {
    const [{ Chat }, { createRedisState }] = await Promise.all([
      esmImport('chat'),
      esmImport('@chat-adapter/state-redis'),
    ]);

    const adapters = await this.buildAdapters(platform, config);
    const redisHost = process.env.REDIS_HOST || 'localhost';
    const redisPort = process.env.REDIS_PORT || '6379';

    return new Chat({
      userName: `novu-agent-${instanceKey}`,
      adapters,
      state: createRedisState({
        url: `redis://${redisHost}:${redisPort}`,
        keyPrefix: `novu:agent:${instanceKey}`,
      }),
      logger: 'silent',
    });
  }

  private async buildAdapters(
    platform: AgentPlatformEnum,
    config: ResolvedPlatformConfig
  ): Promise<Record<string, unknown>> {
    const { credentials, connectionAccessToken } = config;

    switch (platform) {
      case AgentPlatformEnum.SLACK: {
        const { createSlackAdapter } = await esmImport('@chat-adapter/slack');

        return {
          slack: createSlackAdapter({
            botToken: connectionAccessToken!,
            signingSecret: credentials.apiKey!,
          }),
        };
      }
      case AgentPlatformEnum.TEAMS: {
        const { createTeamsAdapter } = await esmImport('@chat-adapter/teams');

        return {
          teams: createTeamsAdapter({
            appId: credentials.clientId!,
            appPassword: credentials.secretKey!,
            appTenantId: credentials.tenantId!,
          }),
        };
      }
      case AgentPlatformEnum.WHATSAPP: {
        const { createWhatsAppAdapter } = await esmImport('@chat-adapter/whatsapp');

        return {
          whatsapp: createWhatsAppAdapter({
            accessToken: credentials.token!,
            appSecret: credentials.secretKey!,
            verifyToken: credentials.apiToken!,
            phoneNumberId: credentials.phoneNumberIdentification!,
          }),
        };
      }
      case AgentPlatformEnum.TELEGRAM: {
        const { createTelegramAdapter } = await esmImport('@chat-adapter/telegram');

        return {
          telegram: createTelegramAdapter({
            botToken: credentials.apiToken!,
          }),
        };
      }
      default:
        throw new BadRequestException(`Unsupported platform: ${platform}`);
    }
  }

  private registerEventHandlers(agentId: string, chat: Chat, config: ResolvedPlatformConfig) {
    chat.onNewMention(async (thread: Thread, message: Message) => {
      try {
        await thread.subscribe();
        await this.handleInboundMessage(agentId, config, thread, message);
      } catch (err) {
        this.logger.error(err, `[agent:${agentId}] Error handling new mention`);
      }
    });

    chat.onSubscribedMessage(async (thread: Thread, message: Message) => {
      try {
        await this.handleInboundMessage(agentId, config, thread, message);
      } catch (err) {
        this.logger.error(err, `[agent:${agentId}] Error handling subscribed message`);
      }
    });
  }

  private async handleInboundMessage(
    agentId: string,
    config: ResolvedPlatformConfig,
    thread: Thread,
    message: Message
  ) {
    const subscriberId = await this.subscriberResolver
      .resolve({
        environmentId: config.environmentId,
        organizationId: config.organizationId,
        platform: config.platform,
        platformUserId: message.author.userId,
        integrationIdentifier: config.integrationIdentifier,
      })
      .catch((err) => {
        this.logger.warn(err, `[agent:${agentId}] Subscriber resolution failed, continuing without subscriber`);

        return null;
      });

    const participantId = subscriberId ?? `${config.platform}:${message.author.userId}`;
    const participantType = subscriberId
      ? ConversationParticipantTypeEnum.SUBSCRIBER
      : ConversationParticipantTypeEnum.PLATFORM_USER;

    const conversation = await this.conversationService.createOrGetConversation({
      environmentId: config.environmentId,
      organizationId: config.organizationId,
      agentId,
      platform: config.platform,
      integrationId: config.integrationId,
      platformThreadId: thread.id,
      participantId,
      participantType,
      platformUserId: message.author.userId,
      firstMessageText: message.text,
    });

    await this.conversationService.persistInboundMessage({
      conversationId: conversation._id,
      platform: config.platform,
      integrationId: config.integrationId,
      platformThreadId: thread.id,
      senderId: participantId,
      senderName: message.author.fullName,
      content: message.text,
      platformMessageId: message.id,
      environmentId: config.environmentId,
      organizationId: config.organizationId,
    });

    await thread.startTyping();

    // TODO Phase 5: bridge executor fires here with { conversation, subscriberId, history }
  }
}
