import { BadRequestException, Injectable, OnModuleDestroy } from '@nestjs/common';
import { CacheService, PinoLogger } from '@novu/application-generic';
import type { Chat, Message, ReactionEvent, SlashCommandEvent, Thread } from 'chat';
import { LRUCache } from 'lru-cache';
import { resolveWhatsAppAppSecret } from '../../../integrations/usecases/whatsapp/whatsapp-credentials.utils';
import { AgentConfigResolver, ResolvedAgentConfig } from '../../channels/agent-config-resolver.service';
import { AgentEmailActionTokenService } from '../../email/agent-email-action-token.service';
import { AgentEmailSender, resolveAgentEmailSenderName } from '../../email/agent-email-sender.service';
import { AgentPlatformEnum } from '../../shared/enums/agent-platform.enum';
import { captureAgentException, captureAgentWarning } from '../../shared/errors/capture-agent-sentry';
import { esmImport } from '../../shared/util/esm-import';
import { AgentActionTokenService } from '../action-token/agent-action-token.service';
import type { InboundReactionEvent } from './inbound-turn.handler';

export interface InboundCallbacks {
  onMessage: (agentId: string, config: ResolvedAgentConfig, thread: Thread, message: Message) => Promise<void>;
  onAction: (
    agentId: string,
    config: ResolvedAgentConfig,
    thread: Thread,
    action: import('@novu/framework').AgentAction,
    userId: string
  ) => Promise<void>;
  onReaction: (agentId: string, config: ResolvedAgentConfig, event: InboundReactionEvent) => Promise<void>;
}

/**
 * Holds a cached Chat instance alongside a mutable pointer to the current
 * resolved config. Event handlers registered via registerEventHandlers() close
 * over this box instead of the config value, so updates to fields that the
 * bridge executor and inbound handler read at event time (bridgeUrl,
 * devBridgeUrl, devBridgeActive, acknowledgeOnReceived, reactionOnResolved) take
 * effect on the next inbound event without rebuilding the Chat instance.
 *
 * adapterFingerprint captures fields that are baked into the platform adapter
 * at construction (credentials + connectionAccessToken); when these change,
 * the cached instance is dropped and rebuilt — see getOrCreate().
 */
export interface CachedChat {
  chat: Chat;
  config: ResolvedAgentConfig;
  adapterFingerprint: string;
}

/**
 * Extracts the recipient email address from an encoded email thread ID. The email adapter's
 * ThreadResolver encodes thread IDs as `email:<encodedRecipient>:<rootMessageIdHash>`; we
 * reverse that here so the token claims can carry the recipient as the `platformUserId` used
 * for subscriber resolution on the click handler side.
 */
function extractRecipientFromThreadId(threadId: string): string {
  const parts = threadId.split(':');
  if (parts.length !== 3 || parts[0] !== 'email' || !parts[1]) {
    throw new Error(`Cannot extract recipient from invalid email thread id: ${threadId}`);
  }

  return decodeURIComponent(parts[1]);
}

const MAX_CACHED_INSTANCES = 200;
const INSTANCE_TTL_MS = 1000 * 60 * 30;

/**
 * Redis pub/sub channel prefix for the web relay. The full channel is
 * `<prefix>:<platformThreadId>` — the web adapter publishes outbound events
 * there and the WebStreamRelay on the SSE-holding instance subscribes.
 */
export function buildWebStreamChannelPrefix(agentId: string, integrationIdentifier: string): string {
  return `novu:agent:web:stream:${agentId}:${integrationIdentifier}`;
}

@Injectable()
export class ChatInstanceRegistry implements OnModuleDestroy {
  readonly instances: LRUCache<string, CachedChat>;
  private readonly pendingCreations = new Map<string, Promise<Chat>>();
  private inboundCallbacks: InboundCallbacks | null = null;

  constructor(
    private readonly logger: PinoLogger,
    private readonly cacheService: CacheService,
    private readonly agentConfigResolver: AgentConfigResolver,
    private readonly emailActionTokenService: AgentEmailActionTokenService,
    private readonly agentActionTokenService: AgentActionTokenService,
    private readonly agentEmailSender: AgentEmailSender
  ) {
    this.logger.setContext(this.constructor.name);
    this.instances = new LRUCache<string, CachedChat>({
      max: MAX_CACHED_INSTANCES,
      ttl: INSTANCE_TTL_MS,
      dispose: (cached, key) => {
        cached.chat.shutdown().catch((err) => {
          this.logger.error(err, `Failed to shut down evicted Chat instance ${key}`);
          captureAgentException(err, {
            component: 'chat-instance-registry',
            operation: 'shutdown-evicted',
            extra: { instanceKey: key },
          });
        });
      },
    });
  }

  registerInboundCallbacks(callbacks: InboundCallbacks): void {
    this.inboundCallbacks = callbacks;
  }

  async getOrCreate(
    instanceKey: string,
    agentId: string,
    platform: AgentPlatformEnum,
    config: ResolvedAgentConfig
  ): Promise<Chat> {
    const freshFingerprint = this.adapterFingerprint(config);
    const existing = this.instances.get(instanceKey);

    if (existing) {
      if (existing.adapterFingerprint === freshFingerprint) {
        existing.config = config;

        return existing.chat;
      }

      this.instances.delete(instanceKey);
    }

    const pendingKey = `${instanceKey}:${freshFingerprint}`;
    const pending = this.pendingCreations.get(pendingKey);
    if (pending) return pending;

    const creation = this.createAndCache(instanceKey, agentId, platform, config, freshFingerprint);
    this.pendingCreations.set(pendingKey, creation);

    try {
      return await creation;
    } finally {
      this.pendingCreations.delete(pendingKey);
    }
  }

  async onModuleDestroy() {
    const shutdowns = [...this.instances.entries()].map(async ([key, cached]) => {
      try {
        await cached.chat.shutdown();
      } catch (err) {
        this.logger.error(err, `Failed to shut down Chat instance ${key}`);
        captureAgentException(err, {
          component: 'chat-instance-registry',
          operation: 'shutdown',
          extra: { instanceKey: key },
        });
      }
    });

    await Promise.allSettled(shutdowns);
    this.instances.clear();
  }

  private async createAndCache(
    instanceKey: string,
    agentId: string,
    platform: AgentPlatformEnum,
    config: ResolvedAgentConfig,
    adapterFingerprint: string
  ): Promise<Chat> {
    const chat = await this.createChatInstance(instanceKey, agentId, platform, config);
    await chat.initialize();
    const cached: CachedChat = { chat, config, adapterFingerprint };
    this.registerEventHandlers(agentId, cached);
    this.instances.set(instanceKey, cached);

    return chat;
  }

  private adapterFingerprint(config: ResolvedAgentConfig): string {
    const { platform, credentials: c, connectionAccessToken } = config;

    return JSON.stringify({
      platform,
      signingSecret: c.signingSecret ?? null,
      clientId: c.clientId ?? null,
      secretKey: c.secretKey ?? null,
      tenantId: c.tenantId ?? null,
      apiToken: c.apiToken ?? null,
      token: c.token ?? null,
      apiKey: c.apiKey ?? null,
      from: c.from ?? null,
      phoneNumberIdentification: c.phoneNumberIdentification ?? null,
      connectionAccessToken: connectionAccessToken ?? null,
      outboundIntegrationId: c.outboundIntegrationId ?? null,
      useFromAddressOverride: c.useFromAddressOverride ?? null,
      fromAddressOverride: c.fromAddressOverride ?? null,
      emailSlugPrefix: c.emailSlugPrefix ?? null,
      inboxRoutingKey: c.inboxRoutingKey ?? null,
      sharedInboxDisabled: c.sharedInboxDisabled ?? null,
      senderName: c.senderName ?? null,
      agentName: config.agentName,
    });
  }

  private async createChatInstance(
    instanceKey: string,
    agentId: string,
    platform: AgentPlatformEnum,
    config: ResolvedAgentConfig
  ): Promise<Chat> {
    const [{ Chat: ChatCtor }, { createIoRedisState }] = await Promise.all([
      esmImport('chat'),
      esmImport('@chat-adapter/state-ioredis'),
    ]);

    const adapters = await this.buildAdapters(agentId, platform, config);
    const client = this.cacheService.client;
    if (!client) {
      throw new Error('Cache in-memory provider client is not available for Conversational SDK state adapter');
    }

    return new ChatCtor({
      userName: `novu-agent-${instanceKey}`,
      adapters,
      state: createIoRedisState({
        client,
        keyPrefix: `novu:agent:${instanceKey}`,
        logger: this.chatStateLogger(),
      }),
      logger: 'silent',
    });
  }

  private chatStateLogger() {
    return {
      debug: (msg: string, ctx?: Record<string, unknown>) => this.logger.debug(ctx ?? {}, msg),
      info: (msg: string, ctx?: Record<string, unknown>) => this.logger.info(ctx ?? {}, msg),
      warn: (msg: string, ctx?: Record<string, unknown>) => {
        this.logger.warn(ctx ?? {}, msg);
        if (ctx?.err) {
          captureAgentWarning(ctx.err, {
            component: 'chat-instance-registry',
            operation: 'chat-state-warn',
            extra: { message: msg },
          });
        }
      },
      error: (msg: string, ctx?: Record<string, unknown>) => {
        this.logger.error(ctx ?? {}, msg);
        if (ctx?.err) {
          captureAgentException(ctx.err, {
            component: 'chat-instance-registry',
            operation: 'chat-state-error',
            extra: { message: msg },
          });
        }
      },
    };
  }

  private async buildAdapters(
    agentId: string,
    platform: AgentPlatformEnum,
    config: ResolvedAgentConfig
  ): Promise<Record<string, unknown>> {
    const { credentials, connectionAccessToken } = config;

    switch (platform) {
      case AgentPlatformEnum.SLACK: {
        if (!credentials.signingSecret) {
          throw new BadRequestException(
            'Slack agent integration requires a signing secret. Complete Slack app setup for this integration.'
          );
        }

        if (!connectionAccessToken) {
          throw new BadRequestException(
            'Slack agent integration requires a workspace bot token. Install the app to your Slack workspace via OAuth in the agent setup guide.'
          );
        }

        const { createSlackAdapter } = await esmImport('@chat-adapter/slack');

        return {
          slack: createSlackAdapter({
            botToken: connectionAccessToken,
            signingSecret: credentials.signingSecret,
          }),
        };
      }
      case AgentPlatformEnum.TEAMS: {
        if (!credentials.clientId || !credentials.secretKey || !credentials.tenantId) {
          throw new BadRequestException(
            'Teams agent integration requires appId, appPassword, and appTenantId credentials'
          );
        }

        const { createTeamsAdapter } = await esmImport('@chat-adapter/teams');

        return {
          teams: createTeamsAdapter({
            appId: credentials.clientId,
            appPassword: credentials.secretKey,
            appTenantId: credentials.tenantId,
          }),
        };
      }
      case AgentPlatformEnum.WHATSAPP: {
        const appSecret = resolveWhatsAppAppSecret(credentials);

        if (!credentials.apiToken || !appSecret || !credentials.token || !credentials.phoneNumberIdentification) {
          throw new BadRequestException(
            'WhatsApp agent integration requires accessToken, appSecret, verifyToken, and phoneNumberId credentials'
          );
        }

        const { createWhatsAppAdapter } = await esmImport('@chat-adapter/whatsapp');

        return {
          whatsapp: createWhatsAppAdapter({
            accessToken: credentials.apiToken,
            appSecret,
            verifyToken: credentials.token,
            phoneNumberId: credentials.phoneNumberIdentification,
          }),
        };
      }
      case AgentPlatformEnum.TELEGRAM: {
        if (!credentials.apiToken || !credentials.token) {
          throw new BadRequestException(
            'Telegram agent integration requires a Bot Token and a webhook secret token. ' +
              'Run the "Configure webhook" step to provision the webhook secret token before this integration can receive messages.'
          );
        }

        const { createTelegramAdapter } = await esmImport('@chat-adapter/telegram');

        return {
          telegram: createTelegramAdapter({
            botToken: credentials.apiToken,
            secretToken: credentials.token,
            mode: 'webhook',
          }),
        };
      }
      case AgentPlatformEnum.SENDBLUE: {
        if (!credentials.apiKey || !credentials.secretKey || !credentials.from) {
          throw new BadRequestException(
            'Sendblue agent integration requires API Key, Secret Key, and From Number credentials'
          );
        }

        if (!credentials.token) {
          throw new BadRequestException(
            'Sendblue agent integration requires a webhook secret. ' +
              'Run the "Configure webhook" step to provision the receive webhook before this integration can receive messages.'
          );
        }

        const { createSendblueAdapter } = await esmImport('@novu/chat-adapter-sendblue');

        return {
          // The underlying official Sendblue SDK reads `SENDBLUE_API_BASE_URL`
          // itself; e2e tests point it at an in-process stub (see sendblue-api-stub.ts).
          sendblue: createSendblueAdapter({
            apiKey: credentials.apiKey,
            secretKey: credentials.secretKey,
            fromNumber: credentials.from,
            webhookSecret: credentials.token,
            userName: config.agentName,
          }),
        };
      }
      case AgentPlatformEnum.EMAIL: {
        const { outboundIntegrationId } = credentials;

        if (!credentials.secretKey) {
          throw new BadRequestException('Email agent integration requires secretKey credentials');
        }

        const { createNovuEmailAdapter } = await esmImport('@novu/chat-adapter-email');

        return {
          email: createNovuEmailAdapter({
            senderName: resolveAgentEmailSenderName(config),
            signingSecret: credentials.secretKey,
            sendEmail: this.agentEmailSender.buildSendEmailCallback(config, outboundIntegrationId),
            actionUrlBuilder: async ({ threadId, messageId, actionId, value, label, style }) => {
              const userIdentifier = extractRecipientFromThreadId(threadId);
              const { url } = await this.emailActionTokenService.signActionToken({
                agentId,
                agentIdentifier: config.agentIdentifier,
                agentName: config.agentName,
                integrationIdentifier: config.integrationIdentifier,
                environmentId: config.environmentId,
                organizationId: config.organizationId,
                threadId,
                messageId,
                actionId,
                value,
                label,
                style,
                userIdentifier,
              });

              return url;
            },
          }),
        };
      }
      case AgentPlatformEnum.WEB: {
        const client = this.cacheService.client;
        if (!client) {
          throw new Error('Cache in-memory provider client is not available for the web agent relay publisher');
        }

        const { createNovuWebAdapter } = await esmImport('@novu/chat-adapter-web');

        return {
          web: createNovuWebAdapter({
            channelPrefix: buildWebStreamChannelPrefix(agentId, config.integrationIdentifier),
            publish: (channel: string, payload: string) => client.publish(channel, payload),
            agentName: config.agentName,
          }),
        };
      }
      default:
        throw new BadRequestException(`Unsupported platform: ${platform}`);
    }
  }

  private registerEventHandlers(agentId: string, cached: CachedChat) {
    if (!this.inboundCallbacks) {
      this.logger.warn(`[agent:${agentId}] No inbound callbacks registered, skipping event handler setup`);

      return;
    }

    const callbacks = this.inboundCallbacks;

    cached.chat.onNewMention(async (thread: Thread, message: Message) => {
      try {
        await thread.subscribe();
        await callbacks.onMessage(agentId, cached.config, thread, message);
      } catch (err) {
        this.logger.error(err, `[agent:${agentId}] Error handling new mention`);
        captureAgentException(err, { component: 'chat-instance-registry', operation: 'on-new-mention', agentId });
      }
    });

    cached.chat.onSubscribedMessage(async (thread: Thread, message: Message) => {
      try {
        await callbacks.onMessage(agentId, cached.config, thread, message);
      } catch (err) {
        this.logger.error(err, `[agent:${agentId}] Error handling subscribed message`);
        captureAgentException(err, {
          component: 'chat-instance-registry',
          operation: 'on-subscribed-message',
          agentId,
        });
      }
    });

    cached.chat.onSlashCommand(async (event: SlashCommandEvent) => {
      try {
        await this.redispatchTelegramCommandAsMessage(cached, event);
      } catch (err) {
        this.logger.error(err, `[agent:${agentId}] Error handling slash command ${event.command}`);
        captureAgentException(err, {
          component: 'chat-instance-registry',
          operation: 'on-slash-command',
          agentId,
          extra: { command: event.command },
        });
      }
    });

    cached.chat.onAction(async (event) => {
      try {
        if (!event.thread) {
          this.logger.warn(`[agent:${agentId}] Action received without thread context, skipping`);

          return;
        }

        const resolvedAction = await this.agentActionTokenService.resolveForDispatch(event.actionId, event.value, {
          agentId,
          integrationIdentifier: cached.config.integrationIdentifier,
          environmentId: cached.config.environmentId,
          organizationId: cached.config.organizationId,
        });

        if (!resolvedAction) {
          return;
        }

        await callbacks.onAction(
          agentId,
          cached.config,
          event.thread as Thread,
          {
            id: resolvedAction.id,
            value: resolvedAction.value,
            sourceMessageId: event.messageId,
          },
          event.user.userId
        );
      } catch (err) {
        this.logger.error(err, `[agent:${agentId}] Error handling action ${event.actionId}`);
        captureAgentException(err, {
          component: 'chat-instance-registry',
          operation: 'on-action',
          agentId,
          extra: { actionId: event.actionId },
        });
      }
    });

    cached.chat.onReaction(async (event: ReactionEvent) => {
      try {
        await callbacks.onReaction(agentId, cached.config, {
          emoji: event.emoji,
          added: event.added,
          messageId: event.messageId,
          message: event.message,
          thread: event.thread as Thread | undefined,
          user: event.user,
        });
      } catch (err) {
        this.logger.error(err, `[agent:${agentId}] Error handling reaction`);
        captureAgentException(err, { component: 'chat-instance-registry', operation: 'on-reaction', agentId });
      }
    });
  }

  /**
   * chat SDK ≥ 4.31 routes Telegram bot commands (any inbound message whose
   * text starts with a `bot_command` entity) to slash-command handlers and no
   * longer delivers them through the regular message pipeline. Novu consumes
   * those commands as ordinary inbound messages — most importantly the
   * `/start <code>` deep-link payload that drives the Telegram subscriber-link
   * flow in `AgentInboundHandler` — so without this re-dispatch the command is
   * silently dropped and the subscriber's channel endpoint is never created.
   * Re-entering `chat.processMessage` restores the pre-4.31 behavior,
   * including dedupe, thread locking, and DM/mention routing.
   */
  private async redispatchTelegramCommandAsMessage(cached: CachedChat, event: SlashCommandEvent): Promise<void> {
    if (cached.config.platform !== AgentPlatformEnum.TELEGRAM) {
      return;
    }

    const threadId = event.channel.id;
    const message = await this.resolveTelegramCommandMessage(event, threadId);

    await cached.chat.processMessage(event.adapter, threadId, message);
  }

  /**
   * The Telegram adapter parses and caches the inbound message before emitting
   * the slash-command event, so the cached copy (with formatting, author flags,
   * and attachments intact) is preferred. Falls back to rebuilding the message
   * from the event payload when the in-process cache no longer holds it.
   */
  private async resolveTelegramCommandMessage(event: SlashCommandEvent, threadId: string): Promise<Message> {
    const raw = event.raw as { message_id?: number; chat?: { id?: number | string }; date?: number } | undefined;
    const chatId = raw?.chat?.id;
    const rawMessageId = raw?.message_id;
    const hasPlatformIds = chatId !== undefined && rawMessageId !== undefined;
    // Mirrors the Telegram adapter's `encodeMessageId` composite format so the
    // chat SDK dedupe key matches the one a regular-message delivery would use.
    const messageId = hasPlatformIds ? `${chatId}:${rawMessageId}` : `telegram-command:${threadId}:${Date.now()}`;

    if (hasPlatformIds && event.adapter.fetchMessage) {
      const cachedMessage = await event.adapter.fetchMessage(threadId, messageId);
      if (cachedMessage) {
        return cachedMessage;
      }
    }

    const { Message: MessageCtor, parseMarkdown } = await esmImport('chat');
    const text = event.text ? `${event.command} ${event.text}` : event.command;

    return new MessageCtor({
      id: messageId,
      threadId,
      text,
      formatted: parseMarkdown(text),
      raw: event.raw,
      author: event.user,
      metadata: { dateSent: raw?.date !== undefined ? new Date(raw.date * 1000) : new Date() },
      attachments: [],
    });
  }
}
