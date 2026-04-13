import { createSlackAdapter } from '@chat-adapter/slack';
import { createRedisState } from '@chat-adapter/state-redis';
import { createTeamsAdapter } from '@chat-adapter/teams';
import { createTelegramAdapter } from '@chat-adapter/telegram';
import { createWhatsAppAdapter } from '@chat-adapter/whatsapp';
import { BadRequestException, Injectable, OnModuleDestroy } from '@nestjs/common';
import { PinoLogger } from '@novu/application-generic';
import { ICredentialsEntity } from '@novu/dal';
import { type Adapter, Chat } from 'chat';
import { Request as ExpressRequest, Response as ExpressResponse } from 'express';
import { LRUCache } from 'lru-cache';
import { AgentPlatformEnum } from '../dtos/agent-platform.enum';
import { sendWebResponse, toWebRequest } from '../utils/express-to-web-request';
import { AgentCredentialService, ResolvedPlatformConfig } from './agent-credential.service';

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

const MAX_CACHED_INSTANCES = 200;
const INSTANCE_TTL_MS = 1000 * 60 * 30;

@Injectable()
export class ChatSdkService implements OnModuleDestroy {
  private readonly instances: LRUCache<string, Chat>;

  constructor(
    private readonly logger: PinoLogger,
    private readonly agentCredentialService: AgentCredentialService
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

    const chat = this.createChatInstance(instanceKey, platform, config);
    this.registerEventHandlers(agentId, chat);
    this.instances.set(instanceKey, chat);

    return chat;
  }

  private createChatInstance(instanceKey: string, platform: AgentPlatformEnum, config: ResolvedPlatformConfig): Chat {
    const adapters = this.buildAdapters(platform, config);
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

  private buildAdapters(platform: AgentPlatformEnum, config: ResolvedPlatformConfig): Record<string, Adapter> {
    const { credentials, connectionAccessToken } = config;

    switch (platform) {
      case AgentPlatformEnum.SLACK:
        return { slack: this.createSlack(credentials, connectionAccessToken) };
      case AgentPlatformEnum.TEAMS:
        return { teams: this.createTeams(credentials) };
      case AgentPlatformEnum.WHATSAPP:
        return { whatsapp: this.createWhatsApp(credentials) };
      case AgentPlatformEnum.TELEGRAM:
        return { telegram: this.createTelegram(credentials) };
      default:
        throw new BadRequestException(`Unsupported platform: ${platform}`);
    }
  }

  private createSlack(credentials: ICredentialsEntity, connectionAccessToken?: string): Adapter {
    return createSlackAdapter({
      botToken: connectionAccessToken!,
      signingSecret: credentials.apiKey!,
    });
  }

  private createTeams(credentials: ICredentialsEntity): Adapter {
    return createTeamsAdapter({
      appId: credentials.clientId!,
      appPassword: credentials.secretKey!,
      appTenantId: credentials.tenantId!,
    });
  }

  private createWhatsApp(credentials: ICredentialsEntity): Adapter {
    return createWhatsAppAdapter({
      accessToken: credentials.token!,
      appSecret: credentials.secretKey!,
      verifyToken: credentials.apiToken!,
      phoneNumberId: credentials.phoneNumberIdentification!,
    });
  }

  private createTelegram(credentials: ICredentialsEntity): Adapter {
    return createTelegramAdapter({
      botToken: credentials.apiToken!,
    });
  }

  private registerEventHandlers(agentId: string, chat: Chat) {
    chat.onNewMention(async (thread) => {
      await thread.subscribe();
      await thread.startTyping();
      await thread.post(`Hello! I'm agent \`${agentId}\`. I'm now listening to this thread.`);
    });

    chat.onSubscribedMessage(async (thread, message) => {
      await thread.startTyping();
      await thread.post(`Echo: ${message.text}`);
    });
  }
}
