import { BadGatewayException, BadRequestException, Injectable, OnModuleDestroy } from '@nestjs/common';
import { CacheService, PinoLogger } from '@novu/application-generic';
import type { AgentAction, SentMessageInfo } from '@novu/framework';
import type { AdapterPostableMessage, Chat, EmojiValue, Message, PlanModel, ReactionEvent, Thread } from 'chat';
import { Request as ExpressRequest, Response as ExpressResponse } from 'express';
import { LRUCache } from 'lru-cache';
import type { ChatSdkFile, ChatSdkReplyContent } from '../conversation-runtime/egress/file-materializer.service';
import { FileMaterializer } from '../conversation-runtime/egress/file-materializer.service';
import { AgentEmailSender, resolveAgentEmailSenderName } from '../email/agent-email-sender.service';
import type { ReplyContentDto } from '../shared/dtos/agent-reply-payload.dto';
import { AgentPlatformEnum } from '../shared/enums/agent-platform.enum';
import { captureAgentException, captureAgentWarning } from '../shared/errors/capture-agent-sentry';
import { esmImport } from '../shared/util/esm-import';
import { sendWebResponse, toWebRequest } from '../shared/util/express-to-web-request';
import { AgentConfigResolver, AgentConfigResolveSource, ResolvedAgentConfig } from './agent-config-resolver.service';
import { AgentEmailActionClaims, AgentEmailActionTokenService } from './agent-email-action-token.service';
import type { InboundReactionEvent } from './agent-inbound-handler.service';

export interface InboundCallbacks {
  onMessage: (agentId: string, config: ResolvedAgentConfig, thread: Thread, message: Message) => Promise<void>;
  onAction: (
    agentId: string,
    config: ResolvedAgentConfig,
    thread: Thread,
    action: AgentAction,
    userId: string
  ) => Promise<void>;
  onReaction: (agentId: string, config: ResolvedAgentConfig, event: InboundReactionEvent) => Promise<void>;
}

function getErrorResponseBody(err: unknown): unknown {
  if (!err || typeof err !== 'object') {
    return undefined;
  }

  return (err as { response?: { body?: unknown } }).response?.body;
}

function getDeliveryErrorDetail(body: unknown): string | undefined {
  if (!body || typeof body !== 'object') {
    return undefined;
  }

  const responseBody = body as { errors?: Array<{ message?: unknown }>; message?: unknown };
  const firstErrorMessage = responseBody.errors?.[0]?.message;
  if (typeof firstErrorMessage === 'string') {
    return firstErrorMessage;
  }

  return typeof responseBody.message === 'string' ? responseBody.message : undefined;
}

function toDeliveryError(err: unknown): never {
  const base = err instanceof Error ? err.message : String(err);
  const detail = getDeliveryErrorDetail(getErrorResponseBody(err));

  throw new BadGatewayException({
    error: 'delivery_failed',
    message: detail ? `${base}: ${detail}` : base,
  });
}

/**
 * Thrown by `ChatSdkService.processEmailAction` when a failure is provably pre-dispatch —
 * i.e. token validation, agent-config lookup, or chat/adapter setup failed before the chat
 * SDK had a chance to invoke the agent's `onAction` handler. Callers can safely retry these
 * via single-use token release. Any other error (including raw exceptions out of
 * `chat.processAction`) MUST be treated as potentially post-dispatch and not replayed.
 */
export class AgentActionPreDispatchError extends Error {
  readonly preDispatch = true as const;

  constructor(message: string, cause?: unknown) {
    super(message);
    this.name = 'AgentActionPreDispatchError';
    if (cause !== undefined) {
      (this as { cause?: unknown }).cause = cause;
    }
  }
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
  private inboundCallbacks: InboundCallbacks | null = null;

  constructor(
    private readonly logger: PinoLogger,
    private readonly cacheService: CacheService,
    private readonly agentConfigResolver: AgentConfigResolver,
    private readonly actionTokenService: AgentEmailActionTokenService,
    private readonly fileMaterializer: FileMaterializer,
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
            component: 'chat-sdk',
            operation: 'shutdown-evicted',
            extra: { instanceKey: key },
          });
        });
      },
    });
  }

  async handleWebhook(
    agentId: string,
    integrationIdentifier: string,
    req: ExpressRequest,
    res: ExpressResponse,
    options: { source: AgentConfigResolveSource }
  ) {
    const config = await this.agentConfigResolver.resolve(agentId, integrationIdentifier, {
      source: options.source,
    });
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

  /**
   * Dispatches a verified email-button click into the chat SDK so it flows through the same
   * `chat.onAction` → `AgentInboundHandler.handleAction` → bridge `onAction` path that
   * inbound platforms (Slack/Teams) already use. Called from the public email-action endpoint
   * after token verification and single-use replay protection.
   *
   * The implementation is split into a *pre-dispatch* phase (config resolution, chat-instance
   * lookup, adapter availability check) and a *dispatch* phase (`chat.processAction`). Errors
   * raised by the pre-dispatch phase are wrapped in `AgentActionPreDispatchError` so the
   * controller can safely release the single-use token and let the user retry. Errors raised
   * by the dispatch phase propagate as-is — by then the chat SDK may have already invoked the
   * agent's `onAction` handler with partial side effects, and re-releasing the token would
   * permit a replay that duplicates non-idempotent downstream work.
   */
  async processEmailAction(claims: AgentEmailActionClaims): Promise<void> {
    const { agentId, integrationIdentifier } = claims;

    let chat: Chat;
    let emailAdapter: ReturnType<Chat['getAdapter']>;
    try {
      const config = await this.agentConfigResolver.resolve(agentId, integrationIdentifier);

      if (config.platform !== AgentPlatformEnum.EMAIL) {
        throw new BadRequestException(
          `Agent ${agentId} integration ${integrationIdentifier} is not configured for the email platform`
        );
      }

      const instanceKey = `${agentId}:${integrationIdentifier}`;
      chat = await this.getOrCreate(instanceKey, agentId, config.platform, config);

      emailAdapter = chat.getAdapter(AgentPlatformEnum.EMAIL);
      if (!emailAdapter) {
        throw new BadRequestException(`Email adapter not available for agent ${agentId}`);
      }
    } catch (err) {
      throw new AgentActionPreDispatchError('Failed to resolve agent context before dispatching email action', err);
    }

    // From here on, the chat SDK may have already invoked the user's `onAction` handler by
    // the time an error is raised — do NOT retry these failures via token re-release.
    await chat.processAction(
      {
        adapter: emailAdapter,
        actionId: claims.actionId,
        value: claims.value,
        messageId: claims.messageId,
        threadId: claims.threadId,
        user: {
          userId: claims.userIdentifier,
          userName: claims.userIdentifier,
          fullName: claims.userIdentifier,
          isBot: false,
          isMe: false,
        },
        raw: {},
      },
      undefined
    );
  }

  async onModuleDestroy() {
    const shutdowns = [...this.instances.entries()].map(async ([key, cached]) => {
      try {
        await cached.chat.shutdown();
      } catch (err) {
        this.logger.error(err, `Failed to shut down Chat instance ${key}`);
        captureAgentException(err, { component: 'chat-sdk', operation: 'shutdown', extra: { instanceKey: key } });
      }
    });

    await Promise.allSettled(shutdowns);
    this.instances.clear();
  }

  registerInboundCallbacks(callbacks: InboundCallbacks): void {
    this.inboundCallbacks = callbacks;
  }

  async postToConversation(
    agentId: string,
    integrationIdentifier: string,
    platform: string,
    platformThreadId: string,
    content: ReplyContentDto
  ): Promise<SentMessageInfo> {
    const config = await this.agentConfigResolver.resolve(agentId, integrationIdentifier);
    const instanceKey = `${agentId}:${integrationIdentifier}`;
    const chat = await this.getOrCreate(instanceKey, agentId, config.platform, config);

    // `chat.thread()` (chat@4.27+) infers the adapter from the threadId prefix and
    // returns a Thread already wired to this Chat instance's state adapter, so we
    // avoid rehydrating from a serialized blob and don't trip the "No Chat singleton
    // registered" check that `ThreadImpl.fromJSON` hits for card/postable replies.
    const thread = chat.thread(platformThreadId);
    const deliveryContent = await this.fileMaterializer.prepareContentForDelivery(content, platform, agentId);

    const postArg = this.buildAdapterPostableMessage(deliveryContent);

    const sent = await thread.post(postArg).catch(toDeliveryError);

    return { messageId: sent.id, platformThreadId: sent.threadId };
  }

  async startTypingInConversation(
    agentId: string,
    integrationIdentifier: string,
    platformThreadId: string,
    status = 'Thinking...'
  ): Promise<void> {
    const config = await this.agentConfigResolver.resolve(agentId, integrationIdentifier);
    const instanceKey = `${agentId}:${integrationIdentifier}`;
    const chat = await this.getOrCreate(instanceKey, agentId, config.platform, config);
    const thread = chat.thread(platformThreadId);

    if (typeof thread.startTyping !== 'function') {
      return;
    }

    await thread.startTyping(status).catch(toDeliveryError);
  }

  async sendDirectMessage(
    agentId: string,
    integrationIdentifier: string,
    platformUserId: string,
    content: ReplyContentDto
  ): Promise<SentMessageInfo> {
    const config = await this.agentConfigResolver.resolve(agentId, integrationIdentifier);
    const instanceKey = `${agentId}:${integrationIdentifier}`;
    const chat = await this.getOrCreate(instanceKey, agentId, config.platform, config);

    const dmThread = await chat.openDM(platformUserId);
    const deliveryContent = await this.fileMaterializer.prepareContentForDelivery(content, config.platform, agentId);

    const postArg = this.buildAdapterPostableMessage(deliveryContent);

    const sent = await dmThread.post(postArg).catch(toDeliveryError);

    // Slack Assistant Threads return a threadId like "slack:D12345:" — append the
    // root message ts so it matches the format getInboundPlatformThreadId produces
    // when the user replies, keeping inbound and outbound on the same conversation.
    const platformThreadId = sent.threadId.endsWith(':') ? `${sent.threadId}${sent.id}` : sent.threadId;

    return { messageId: sent.id, platformThreadId };
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

    const deliveryContent = await this.fileMaterializer.prepareContentForDelivery(content, platform, agentId);

    const editPayload = this.buildAdapterPostableMessage(deliveryContent);

    let editPromise: Promise<{ id: string; threadId: string }>;
    if (deliveryContent.card) {
      editPromise = adapter.editMessage(
        platformThreadId,
        platformMessageId,
        deliveryContent.card as unknown as AdapterPostableMessage
      );
    } else {
      editPromise = adapter.editMessage(platformThreadId, platformMessageId, editPayload);
    }

    const edited = await editPromise.catch(toDeliveryError);

    return { messageId: edited.id, platformThreadId: edited.threadId };
  }

  async postPlanObject(
    agentId: string,
    integrationIdentifier: string,
    platform: string,
    platformThreadId: string,
    model: PlanModel
  ): Promise<SentMessageInfo | null> {
    const config = await this.agentConfigResolver.resolve(agentId, integrationIdentifier);
    const instanceKey = `${agentId}:${integrationIdentifier}`;
    const chat = await this.getOrCreate(instanceKey, agentId, config.platform, config);

    const adapter = chat.getAdapter(platform);
    if (typeof adapter.postObject !== 'function') {
      return null;
    }

    const sent = await adapter.postObject(platformThreadId, 'plan', model).catch(toDeliveryError);

    return { messageId: sent.id, platformThreadId: sent.threadId };
  }

  async editPlanObject(
    agentId: string,
    integrationIdentifier: string,
    platform: string,
    platformThreadId: string,
    platformMessageId: string,
    model: PlanModel
  ): Promise<void> {
    const config = await this.agentConfigResolver.resolve(agentId, integrationIdentifier);
    const instanceKey = `${agentId}:${integrationIdentifier}`;
    const chat = await this.getOrCreate(instanceKey, agentId, config.platform, config);

    const adapter = chat.getAdapter(platform);
    if (typeof adapter.editObject !== 'function') {
      return;
    }

    await adapter.editObject(platformThreadId, platformMessageId, 'plan', model).catch(toDeliveryError);
  }

  private buildAdapterPostableMessage(deliveryContent: ChatSdkReplyContent): AdapterPostableMessage {
    if (deliveryContent.card) {
      const payload: { card: unknown; files?: ChatSdkFile[] } = {
        card: deliveryContent.card,
      };

      if (deliveryContent.files?.length) {
        payload.files = deliveryContent.files;
      }

      return payload as unknown as AdapterPostableMessage;
    }

    return {
      markdown: deliveryContent.markdown ?? '',
      files: deliveryContent.files,
    } as unknown as AdapterPostableMessage;
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
    const chat = await this.createChatInstance(instanceKey, agentId, platform, config);
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
      useFromAddressOverride: c.useFromAddressOverride ?? null,
      fromAddressOverride: c.fromAddressOverride ?? null,
      // Email-specific fields closed over by the sendEmail callback (demo path):
      // a slug rename, routing-key rotation, shared-inbox toggle, or sender
      // rebrand must rebuild the cached adapter otherwise the agent keeps
      // replying from the stale From/Reply-To address until the LRU TTL
      // expires.
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
    const [{ Chat }, { createIoRedisState }] = await Promise.all([
      esmImport('chat'),
      esmImport('@chat-adapter/state-ioredis'),
    ]);

    const adapters = await this.buildAdapters(agentId, platform, config);
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
      warn: (msg: string, ctx?: Record<string, unknown>) => {
        this.logger.warn(ctx ?? {}, msg);
        if (ctx?.err) {
          captureAgentWarning(ctx.err, {
            component: 'chat-sdk',
            operation: 'chat-state-warn',
            extra: { message: msg },
          });
        }
      },
      error: (msg: string, ctx?: Record<string, unknown>) => {
        this.logger.error(ctx ?? {}, msg);
        if (ctx?.err) {
          captureAgentException(ctx.err, {
            component: 'chat-sdk',
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
              const { url } = await this.actionTokenService.signActionToken({
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
        captureAgentException(err, { component: 'chat-sdk', operation: 'on-new-mention', agentId });
      }
    });

    cached.chat.onSubscribedMessage(async (thread: Thread, message: Message) => {
      try {
        await callbacks.onMessage(agentId, cached.config, thread, message);
      } catch (err) {
        this.logger.error(err, `[agent:${agentId}] Error handling subscribed message`);
        captureAgentException(err, { component: 'chat-sdk', operation: 'on-subscribed-message', agentId });
      }
    });

    cached.chat.onAction(async (event) => {
      try {
        if (!event.thread) {
          this.logger.warn(`[agent:${agentId}] Action received without thread context, skipping`);

          return;
        }

        await callbacks.onAction(
          agentId,
          cached.config,
          event.thread as Thread,
          {
            id: event.actionId,
            value: event.value,
            sourceMessageId: event.messageId,
          },
          event.user.userId
        );
      } catch (err) {
        this.logger.error(err, `[agent:${agentId}] Error handling action ${event.actionId}`);
        captureAgentException(err, {
          component: 'chat-sdk',
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
        captureAgentException(err, { component: 'chat-sdk', operation: 'on-reaction', agentId });
      }
    });
  }
}
