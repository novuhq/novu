import { BadRequestException, Injectable, OnModuleDestroy } from '@nestjs/common';
import { PinoLogger } from '@novu/application-generic';
import { ICredentialsEntity } from '@novu/dal';
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

// Chat SDK packages are ESM-only; SWC rewrites import() → require() for CJS output.
// Wrapping in new Function prevents SWC from seeing the import() keyword.
// eslint-disable-next-line @typescript-eslint/no-implied-eval
const esmImport = new Function('specifier', 'return import(specifier)') as (s: string) => Promise<any>;

const MAX_CACHED_INSTANCES = 200;
const INSTANCE_TTL_MS = 1000 * 60 * 30;

type ChatInstance = {
  webhooks: Record<string, (req: Request) => Promise<Response>>;
  onNewMention: (handler: (thread: any, message: any) => void | Promise<void>) => void;
  onSubscribedMessage: (handler: (thread: any, message: any) => void | Promise<void>) => void;
  shutdown: () => Promise<void>;
};

@Injectable()
export class ChatSdkService implements OnModuleDestroy {
  private readonly instances: LRUCache<string, ChatInstance>;

  constructor(
    private readonly logger: PinoLogger,
    private readonly agentCredentialService: AgentCredentialService
  ) {
    this.instances = new LRUCache<string, ChatInstance>({
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
  ): Promise<ChatInstance> {
    const existing = this.instances.get(instanceKey);
    if (existing) return existing;

    const chat = await this.createChatInstance(instanceKey, platform, config);
    this.registerEventHandlers(agentId, chat);
    this.instances.set(instanceKey, chat);

    return chat;
  }

  private async createChatInstance(
    instanceKey: string,
    platform: AgentPlatformEnum,
    config: ResolvedPlatformConfig
  ): Promise<ChatInstance> {
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

  private registerEventHandlers(agentId: string, chat: ChatInstance) {
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
