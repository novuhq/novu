import { BadGatewayException, BadRequestException, Injectable, OnModuleDestroy } from '@nestjs/common';
import { CacheService, decryptCredentials, MailFactory, PinoLogger } from '@novu/application-generic';
import { IntegrationRepository } from '@novu/dal';
import type { SentMessageInfo } from '@novu/framework';
import { ChannelTypeEnum, EmailProviderIdEnum, type IEmailOptions } from '@novu/shared';
import type { AdapterPostableMessage, Chat, EmojiValue, Message, ReactionEvent, Thread } from 'chat';
import { Request as ExpressRequest, Response as ExpressResponse } from 'express';
import { LRUCache } from 'lru-cache';
import { AgentEventEnum } from '../dtos/agent-event.enum';
import { AgentPlatformEnum } from '../dtos/agent-platform.enum';
import type { ReplyContentDto } from '../dtos/agent-reply-payload.dto';
import { esmImport } from '../utils/esm-import';
import { sendWebResponse, toWebRequest } from '../utils/express-to-web-request';
import { AgentConfigResolver, ResolvedAgentConfig } from './agent-config-resolver.service';
import { AgentInboundHandler } from './agent-inbound-handler.service';

function toDeliveryError(err: unknown): never {
  const base = err instanceof Error ? err.message : String(err);
  const body = (err as any)?.response?.body;
  const detail = Array.isArray(body?.errors) ? body.errors[0]?.message : body?.message;
  throw new BadGatewayException({
    error: 'delivery_failed',
    message: detail ? `${base}: ${detail}` : base,
  });
}

/** Ensure a Message-ID value is wrapped in RFC 5322 angle brackets. */
function wrapMsgId(id: string): string {
  const trimmed = id.trim();

  return trimmed.startsWith('<') && trimmed.endsWith('>') ? trimmed : `<${trimmed}>`;
}

/**
 * ICredentials field mapping per platform adapter:
 *
 * Slack:    credentials.signingSecret   → signingSecret
 *           connection.auth.accessToken → botToken
 *
 * Teams:    credentials.clientId  → appId
 *           credentials.secretKey → appPassword
 *           credentials.tenantId  → appTenantId
 *
 * WhatsApp: credentials.apiToken                  → accessToken
 *           credentials.secretKey                → appSecret
 *           credentials.token                    → verifyToken
 *           credentials.phoneNumberIdentification → phoneNumberId
 */

const MAX_CACHED_INSTANCES = 200;
const INSTANCE_TTL_MS = 1000 * 60 * 30;
// EMAIL_ALTERNATIVES_SUPPORTED_PROVIDERS is a deliberate allowlist for providers that preserve custom MIME
// alternatives used by Gmail reactions; Braze, Brevo, Mailgun, Mailjet, Mailtrap, Mandrill, Plunk, Postmark,
// Resend, SparkPost, and similar providers are excluded until their SDK paths are verified.
const EMAIL_ALTERNATIVES_SUPPORTED_PROVIDERS = new Set<string>([
  EmailProviderIdEnum.CustomSMTP,
  EmailProviderIdEnum.Outlook365,
  EmailProviderIdEnum.SendGrid,
  EmailProviderIdEnum.SES,
]);

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
interface CachedChat {
  chat: Chat;
  config: ResolvedAgentConfig;
  adapterFingerprint: string;
}

@Injectable()
export class ChatSdkService implements OnModuleDestroy {
  private readonly instances: LRUCache<string, CachedChat>;
  private readonly pendingCreations = new Map<string, Promise<Chat>>();

  constructor(
    private readonly logger: PinoLogger,
    private readonly cacheService: CacheService,
    private readonly agentConfigResolver: AgentConfigResolver,
    private readonly inboundHandler: AgentInboundHandler,
    private readonly integrationRepository: IntegrationRepository
  ) {
    this.instances = new LRUCache<string, CachedChat>({
      max: MAX_CACHED_INSTANCES,
      ttl: INSTANCE_TTL_MS,
      dispose: (cached, key) => {
        cached.chat.shutdown().catch((err) => {
          this.logger.error(err, `Failed to shut down evicted Chat instance ${key}`);
        });
      },
    });
  }

  async handleWebhook(agentId: string, integrationIdentifier: string, req: ExpressRequest, res: ExpressResponse) {
    const config = await this.agentConfigResolver.resolve(agentId, integrationIdentifier);
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

  async onModuleDestroy() {
    const shutdowns = [...this.instances.entries()].map(async ([key, cached]) => {
      try {
        await cached.chat.shutdown();
      } catch (err) {
        this.logger.error(err, `Failed to shut down Chat instance ${key}`);
      }
    });

    await Promise.allSettled(shutdowns);
    this.instances.clear();
  }

  async postToConversation(
    agentId: string,
    integrationIdentifier: string,
    platform: string,
    serializedThread: Record<string, unknown>,
    content: ReplyContentDto
  ): Promise<SentMessageInfo> {
    const config = await this.agentConfigResolver.resolve(agentId, integrationIdentifier);
    const instanceKey = `${agentId}:${integrationIdentifier}`;
    const chat = await this.getOrCreate(instanceKey, agentId, config.platform, config);

    const { ThreadImpl } = await esmImport('chat');
    const adapter = chat.getAdapter(platform);
    const thread = ThreadImpl.fromJSON(serializedThread, adapter);

    let postPromise: Promise<{ id: string; threadId: string }>;
    if (content.card) {
      postPromise = thread.post(content.card);
    } else {
      postPromise = thread.post({ markdown: content.markdown ?? '', files: content.files });
    }

    const sent = await postPromise.catch(toDeliveryError);

    return { messageId: sent.id, platformThreadId: sent.threadId };
  }

  async editInConversation(
    agentId: string,
    integrationIdentifier: string,
    platform: string,
    platformThreadId: string,
    platformMessageId: string,
    content: ReplyContentDto
  ): Promise<SentMessageInfo> {
    const config = await this.agentConfigResolver.resolve(agentId, integrationIdentifier);
    const instanceKey = `${agentId}:${integrationIdentifier}`;
    const chat = await this.getOrCreate(instanceKey, agentId, config.platform, config);

    const adapter = chat.getAdapter(platform);
    if (typeof adapter.editMessage !== 'function') {
      throw new BadRequestException(`Platform ${platform} does not support editing messages`);
    }

    let editPromise: Promise<{ id: string; threadId: string }>;
    if (content.card) {
      editPromise = adapter.editMessage(
        platformThreadId,
        platformMessageId,
        content.card as unknown as AdapterPostableMessage
      );
    } else {
      editPromise = adapter.editMessage(platformThreadId, platformMessageId, {
        markdown: content.markdown ?? '',
        files: content.files,
      } as unknown as AdapterPostableMessage);
    }

    const edited = await editPromise.catch(toDeliveryError);

    return { messageId: edited.id, platformThreadId: edited.threadId };
  }

  async removeReaction(
    agentId: string,
    integrationIdentifier: string,
    platform: string,
    platformThreadId: string,
    platformMessageId: string,
    emojiName: string
  ): Promise<void> {
    const config = await this.agentConfigResolver.resolve(agentId, integrationIdentifier);
    const instanceKey = `${agentId}:${integrationIdentifier}`;
    const chat = await this.getOrCreate(instanceKey, agentId, config.platform, config);

    const adapter = chat.getAdapter(platform);
    const resolved = await this.resolveEmoji(emojiName);
    await adapter.removeReaction(platformThreadId, platformMessageId, resolved);
  }

  async reactToMessage(
    agentId: string,
    integrationIdentifier: string,
    platform: string,
    platformThreadId: string,
    platformMessageId: string,
    emojiName: string
  ): Promise<void> {
    const config = await this.agentConfigResolver.resolve(agentId, integrationIdentifier);
    const instanceKey = `${agentId}:${integrationIdentifier}`;
    const chat = await this.getOrCreate(instanceKey, agentId, config.platform, config);

    const adapter = chat.getAdapter(platform);
    const resolved = await this.resolveEmoji(emojiName);
    await adapter.addReaction(platformThreadId, platformMessageId, resolved);
  }

  private async resolveEmoji(name: string): Promise<EmojiValue> {
    const { getEmoji } = await esmImport('chat');
    const resolved = getEmoji(name);
    if (!resolved) {
      throw new Error(`Unknown emoji name: "${name}". Use GET /agents/emoji to list supported options.`);
    }

    return resolved;
  }

  private async getOrCreate(
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

      // Credentials / connection token changed since this instance was built —
      // the platform adapter is frozen with the old values, so we must rebuild.
      // Delete triggers the LRU dispose hook which calls chat.shutdown().
      this.instances.delete(instanceKey);
    }

    // Key pending builds by (instanceKey + fingerprint) so that a build kicked
    // off with stale credentials can't be observed by a later caller that has
    // already-rotated credentials — that caller would otherwise await the
    // in-flight promise and receive a Chat whose adapter is baked with the old
    // secrets. With this keying, concurrent callers with divergent configs
    // each get their own build; the later instances.set() wins and the LRU
    // dispose hook shuts down the superseded Chat.
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

  private async createAndCache(
    instanceKey: string,
    agentId: string,
    platform: AgentPlatformEnum,
    config: ResolvedAgentConfig,
    adapterFingerprint: string
  ): Promise<Chat> {
    const chat = await this.createChatInstance(instanceKey, platform, config);
    await chat.initialize();
    const cached: CachedChat = { chat, config, adapterFingerprint };
    this.registerEventHandlers(agentId, cached);
    this.instances.set(instanceKey, cached);

    return chat;
  }

  /**
   * Fingerprint of every field baked into the Chat instance at construction
   * time — i.e. everything read by buildAdapters() and createChatInstance().
   * When the fingerprint changes, the cached instance must be rebuilt because
   * these values live inside already-constructed platform adapters and cannot
   * be mutated after the fact.
   *
   * JSON.stringify over a fixed-shape object is injective (JSON escapes rule
   * out delimiter collisions across free-form secret values), which is all we
   * need for an equality-based cache-coherence check. We deliberately do NOT
   * hash: this is not credential verification or password storage, so fast
   * hashing would be architecturally wrong and the plaintext is already
   * retained in cached.config for the entry's lifetime anyway.
   *
   * IMPORTANT: keep in sync with buildAdapters() whenever a new adapter input
   * is added. Missing a field here will cause the cache to silently serve
   * stale credentials until the LRU TTL expires.
   */
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
      phoneNumberIdentification: c.phoneNumberIdentification ?? null,
      connectionAccessToken: connectionAccessToken ?? null,
      outboundIntegrationId: c.outboundIntegrationId ?? null,
    });
  }

  private buildSendEmailCallback(
    config: ResolvedAgentConfig,
    outboundIntegrationId: string | undefined
  ): (params: {
    from: string;
    to: string;
    subject: string;
    html: string;
    text?: string;
    alternatives?: Array<{
      contentType: string;
      content: string | Buffer;
    }>;
    inReplyTo?: string;
    references?: string;
    messageId?: string;
  }) => Promise<{ messageId?: string }> {
    return async (params) => {
      if (!outboundIntegrationId) {
        throw new BadRequestException(
          'Email agent integration requires an outbound email provider (outboundIntegrationId). ' +
            'Configure one in the agent email setup.'
        );
      }

      const integration = await this.integrationRepository.findOne({
        _id: outboundIntegrationId,
        _environmentId: config.environmentId,
        _organizationId: config.organizationId,
        channel: ChannelTypeEnum.EMAIL,
      });

      if (!integration) {
        throw new BadRequestException(
          `Outbound email integration ${outboundIntegrationId} not found or does not belong to this environment`
        );
      }

      if (integration.providerId === EmailProviderIdEnum.NovuAgent) {
        throw new BadRequestException(
          `Integration ${outboundIntegrationId} is the inbound NovuAgent provider and cannot be used as an outbound sender`
        );
      }

      if (!integration.active) {
        throw new BadRequestException(
          `Outbound email integration ${outboundIntegrationId} (${integration.providerId}) is inactive`
        );
      }

      const hasUnsupportedAlternatives =
        params.alternatives?.length && !EMAIL_ALTERNATIVES_SUPPORTED_PROVIDERS.has(integration.providerId);
      if (hasUnsupportedAlternatives) {
        // NovuEmailAdapterImpl.addReaction supplies a reaction Message-ID; any custom MIME alternative caller must do
        // the same so skipped unsupported sends don't claim provider delivery.
        if (!params.messageId) {
          this.logger.warn(
            {
              providerId: integration.providerId,
              outboundIntegrationId,
            },
            'Skipping email with custom MIME alternatives because the outbound provider is unsupported and no messageId was supplied'
          );

          return { messageId: undefined };
        }

        this.logger.warn(
          {
            providerId: integration.providerId,
            outboundIntegrationId,
          },
          'Skipping email reaction because the outbound provider does not support custom MIME alternatives'
        );

        return { messageId: params.messageId };
      }

      const decrypted = decryptCredentials(integration.credentials);
      const mailFactory = new MailFactory();
      const handler = mailFactory.getHandler({ ...integration, credentials: decrypted }, params.from);

      const mailOptions: IEmailOptions = {
        to: [params.to],
        subject: params.subject,
        html: params.html,
        text: params.text,
        alternatives: params.alternatives,
        from: params.from,
        senderName: config.credentials.senderName || undefined,
        headers: {
          ...(params.messageId ? { 'Message-ID': wrapMsgId(params.messageId) } : {}),
          ...(params.inReplyTo ? { 'In-Reply-To': wrapMsgId(params.inReplyTo) } : {}),
          ...(params.references
            ? { References: params.references.split(/\s+/).filter(Boolean).map(wrapMsgId).join(' ') }
            : {}),
        },
      };

      const result = await handler.send(mailOptions).catch(toDeliveryError);

      return { messageId: result?.id || params.messageId || '' };
    };
  }

  private async createChatInstance(
    instanceKey: string,
    platform: AgentPlatformEnum,
    config: ResolvedAgentConfig
  ): Promise<Chat> {
    const [{ Chat }, { createIoRedisState }] = await Promise.all([
      esmImport('chat'),
      esmImport('@chat-adapter/state-ioredis'),
    ]);

    const adapters = await this.buildAdapters(platform, config);
    const client = this.cacheService.client;
    if (!client) {
      throw new Error('Cache in-memory provider client is not available for Conversational SDK state adapter');
    }

    return new Chat({
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
      warn: (msg: string, ctx?: Record<string, unknown>) => this.logger.warn(ctx ?? {}, msg),
      error: (msg: string, ctx?: Record<string, unknown>) => this.logger.error(ctx ?? {}, msg),
    };
  }

  private async buildAdapters(
    platform: AgentPlatformEnum,
    config: ResolvedAgentConfig
  ): Promise<Record<string, unknown>> {
    const { credentials, connectionAccessToken } = config;

    switch (platform) {
      case AgentPlatformEnum.SLACK: {
        if (!connectionAccessToken || !credentials.signingSecret) {
          throw new BadRequestException('Slack agent integration requires botToken and signingSecret credentials');
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
        if (
          !credentials.apiToken ||
          !credentials.secretKey ||
          !credentials.token ||
          !credentials.phoneNumberIdentification
        ) {
          throw new BadRequestException(
            'WhatsApp agent integration requires accessToken, appSecret, verifyToken, and phoneNumberId credentials'
          );
        }

        const { createWhatsAppAdapter } = await esmImport('@chat-adapter/whatsapp');

        return {
          whatsapp: createWhatsAppAdapter({
            accessToken: credentials.apiToken,
            appSecret: credentials.secretKey,
            verifyToken: credentials.token,
            phoneNumberId: credentials.phoneNumberIdentification,
          }),
        };
      }
      case AgentPlatformEnum.EMAIL: {
        const { senderName, outboundIntegrationId } = credentials;

        if (!credentials.secretKey) {
          throw new BadRequestException('Email agent integration requires secretKey credentials');
        }

        const { createNovuEmailAdapter } = await esmImport('@novu/chat-adapter-email');

        return {
          email: createNovuEmailAdapter({
            senderName,
            signingSecret: credentials.secretKey,
            sendEmail: this.buildSendEmailCallback(config, outboundIntegrationId),
          }),
        };
      }
      default:
        throw new BadRequestException(`Unsupported platform: ${platform}`);
    }
  }

  private registerEventHandlers(agentId: string, cached: CachedChat) {
    cached.chat.onNewMention(async (thread: Thread, message: Message) => {
      try {
        await thread.subscribe();
        await this.inboundHandler.handle(agentId, cached.config, thread, message, AgentEventEnum.ON_MESSAGE);
      } catch (err) {
        this.logger.error(err, `[agent:${agentId}] Error handling new mention`);
      }
    });

    cached.chat.onSubscribedMessage(async (thread: Thread, message: Message) => {
      try {
        await this.inboundHandler.handle(agentId, cached.config, thread, message, AgentEventEnum.ON_MESSAGE);
      } catch (err) {
        this.logger.error(err, `[agent:${agentId}] Error handling subscribed message`);
      }
    });

    cached.chat.onAction(async (event) => {
      try {
        if (!event.thread) {
          this.logger.warn(`[agent:${agentId}] Action received without thread context, skipping`);

          return;
        }

        await this.inboundHandler.handleAction(
          agentId,
          cached.config,
          event.thread as Thread,
          {
            actionId: event.actionId,
            value: event.value,
          },
          event.user.userId
        );
      } catch (err) {
        this.logger.error(err, `[agent:${agentId}] Error handling action ${event.actionId}`);
      }
    });

    cached.chat.onReaction(async (event: ReactionEvent) => {
      try {
        await this.inboundHandler.handleReaction(agentId, cached.config, {
          emoji: event.emoji,
          added: event.added,
          messageId: event.messageId,
          message: event.message,
          thread: event.thread as Thread | undefined,
          user: event.user,
        });
      } catch (err) {
        this.logger.error(err, `[agent:${agentId}] Error handling reaction`);
      }
    });
  }
}
