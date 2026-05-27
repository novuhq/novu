import { Injectable } from '@nestjs/common';
import {
  assertSafeOutboundUrl,
  buildNovuSignatureHeader,
  GetDecryptedSecretKey,
  GetDecryptedSecretKeyCommand,
  PinoLogger,
  resolvePublicAddresses,
  SsrfBlockedError,
  safeOutboundJsonRequest,
} from '@novu/application-generic';
import { ConversationActivityEntity, ConversationEntity, SubscriberEntity } from '@novu/dal';
import type {
  AgentAction,
  AgentBridgeRequest,
  AgentConversation,
  AgentHistoryEntry,
  AgentMessage,
  AgentPlatformContext,
  AgentReaction,
  AgentSubscriber,
} from '@novu/framework';
import { AgentEventEnum } from '@novu/framework';
import { HttpHeaderKeysEnum } from '@novu/framework/internal';
import type { Message } from 'chat';
import { captureAgentException, captureAgentWarning } from '../utils/capture-agent-sentry';
import { AgentAttachmentStorage, type StoredAttachment } from './agent-attachment-storage.service';
import { ResolvedAgentConfig } from './agent-config-resolver.service';

const MAX_RETRIES = 2;

/** Agent bridge replyUrl: prefer API_ROOT_URL, else localhost on PORT (default 3000). */
function resolveAgentReplyApiOrigin(): string {
  const apiRootUrl = process.env.API_ROOT_URL?.replace(/\/$/, '');

  if (apiRootUrl) {
    return apiRootUrl;
  }

  const port = process.env.PORT || '3000';

  return `http://localhost:${port}`;
}
const RETRY_BASE_DELAY_MS = 500;
const AGENTS_STORAGE_FOLDER = 'agents';
const ATTACHMENT_SIGNING_CONCURRENCY = 4;

interface AttachmentSigningContext {
  organizationId: string;
  environmentId: string;
  conversationId: string;
}

async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  mapper: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let nextIndex = 0;

  const workers = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (nextIndex < items.length) {
      const currentIndex = nextIndex;
      nextIndex += 1;
      results[currentIndex] = await mapper(items[currentIndex], currentIndex);
    }
  });

  await Promise.all(workers);

  return results;
}

export interface BridgeReaction {
  emoji: string;
  added: boolean;
  messageId: string;
  sourceMessage?: Message;
  sourceMessageStoredAttachments?: StoredAttachment[];
}

export interface AgentExecutionParams {
  event: AgentEventEnum;
  config: ResolvedAgentConfig;
  conversation: ConversationEntity;
  subscriber: SubscriberEntity | null;
  history: ConversationActivityEntity[];
  message: Message | null;
  platformContext: AgentPlatformContext;
  action?: AgentAction;
  reaction?: BridgeReaction;
  storedAttachments?: StoredAttachment[];
  /** Called after all retries are exhausted and the bridge remains unreachable. */
  onBridgeFailure?: (error: Error) => Promise<void>;
}

export class NoBridgeUrlError extends Error {
  constructor(agentIdentifier: string) {
    super(`No bridge URL configured for agent ${agentIdentifier}`);
    this.name = 'NoBridgeUrlError';
  }
}

@Injectable()
export class BridgeExecutorService {
  constructor(
    private readonly getDecryptedSecretKey: GetDecryptedSecretKey,
    private readonly logger: PinoLogger,
    private readonly attachmentStorage: AgentAttachmentStorage
  ) {
    this.logger.setContext(this.constructor.name);
  }

  async execute(params: AgentExecutionParams): Promise<void> {
    const agentIdentifier = params.config.agentIdentifier;

    try {
      const { config, event } = params;

      const bridgeUrl = this.resolveBridgeUrl(config, agentIdentifier, event);
      if (!bridgeUrl) {
        throw new NoBridgeUrlError(agentIdentifier);
      }

      const secretKey = await this.getDecryptedSecretKey.execute(
        GetDecryptedSecretKeyCommand.create({
          environmentId: config.environmentId,
          organizationId: config.organizationId,
        })
      );

      const payload = await this.buildPayload(params);

      this.fireWithRetries(bridgeUrl, payload, secretKey, agentIdentifier).catch((err) => {
        this.logger.error(err, `[agent:${agentIdentifier}] Bridge delivery failed after ${MAX_RETRIES + 1} attempts`);
        captureAgentException(err, {
          component: 'bridge-executor',
          operation: 'bridge-delivery',
          agentIdentifier,
        });
        params.onBridgeFailure?.(err instanceof Error ? err : new Error(String(err))).catch((callbackErr) => {
          this.logger.warn(callbackErr, `[agent:${agentIdentifier}] onBridgeFailure callback threw`);
          captureAgentWarning(callbackErr, {
            component: 'bridge-executor',
            operation: 'on-bridge-failure-callback',
            agentIdentifier,
          });
        });
      });
    } catch (err) {
      if (err instanceof NoBridgeUrlError) {
        throw err;
      }

      this.logger.error(err, `[agent:${agentIdentifier}] Bridge setup failed — skipping bridge call`);
      captureAgentException(err, {
        component: 'bridge-executor',
        operation: 'bridge-setup',
        agentIdentifier,
      });
    }
  }

  private async fireWithRetries(
    url: string,
    payload: AgentBridgeRequest,
    secretKey: string,
    agentIdentifier: string
  ): Promise<void> {
    let lastError: Error | undefined;

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      // Pre-flight URL syntax/scheme/host check on every attempt. The follow-up
      // safeOutboundJsonRequest call performs the connect-time DNS guard and
      // re-validates every redirect target.
      try {
        assertSafeOutboundUrl(url);
        await resolvePublicAddresses(new URL(url).hostname);
      } catch (err) {
        if (err instanceof SsrfBlockedError) {
          throw new Error(`Bridge URL blocked by SSRF protection: ${err.message}`);
        }
        throw err;
      }

      // HMAC is computed and attached only after the destination has been
      // validated, so a blocked URL never sees the signed payload.
      const signatureHeader = buildNovuSignatureHeader(secretKey, payload);

      try {
        const response = await safeOutboundJsonRequest({
          url,
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            // Must match HttpHeaderKeysEnum.NOVU_SIGNATURE — the framework SDK reads
            // this exact header to verify the HMAC. Sending any other name (e.g.
            // `x-novu-signature`) silently disables signature verification on the
            // bridge and lets a forged AgentBridgeRequest exfiltrate the secret key
            // via an attacker-controlled `replyUrl`.
            [HttpHeaderKeysEnum.NOVU_SIGNATURE]: signatureHeader,
          },
          body: payload,
        });

        if (response.statusCode >= 200 && response.statusCode < 300) {
          return;
        }

        lastError = new Error(`Bridge returned ${response.statusCode}: ${response.statusMessage}`);
        this.logger.warn(
          `[agent:${agentIdentifier}] Bridge call attempt ${attempt + 1} failed: ${response.statusCode}`
        );
      } catch (err) {
        if (err instanceof SsrfBlockedError) {
          throw new Error(`Bridge URL blocked by SSRF protection: ${err.message}`);
        }
        lastError = err instanceof Error ? err : new Error(String(err));
        this.logger.warn(
          `[agent:${agentIdentifier}] Bridge call attempt ${attempt + 1} network error: ${lastError.message}`
        );
      }

      if (attempt < MAX_RETRIES) {
        await this.delay(RETRY_BASE_DELAY_MS * 2 ** attempt);
      }
    }

    throw lastError ?? new Error('Bridge call failed');
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => {
      setTimeout(resolve, ms);
    });
  }

  private resolveBridgeUrl(config: ResolvedAgentConfig, agentIdentifier: string, event: AgentEventEnum): string | null {
    let baseUrl: string | undefined;

    if (config.devBridgeActive && config.devBridgeUrl) {
      baseUrl = config.devBridgeUrl;
    } else if (config.bridgeUrl) {
      baseUrl = config.bridgeUrl;
    }

    if (!baseUrl) {
      this.logger.warn(`[agent:${agentIdentifier}] No bridge URL configured on agent, skipping bridge call`);

      return null;
    }

    const url = new URL(baseUrl);
    url.searchParams.set('action', 'agent-event');
    url.searchParams.set('agentId', agentIdentifier);
    url.searchParams.set('event', event);

    return url.toString();
  }

  private async buildPayload(params: AgentExecutionParams): Promise<AgentBridgeRequest> {
    const { event, config, conversation, subscriber, history, message, platformContext, action, reaction } = params;
    const agentIdentifier = config.agentIdentifier;

    const replyUrl = `${resolveAgentReplyApiOrigin()}/v1/agents/${agentIdentifier}/reply`;

    const timestamp = new Date().toISOString();

    let deliveryId: string;
    if (message?.id) {
      deliveryId = `${conversation._id}:${message.id}`;
    } else if (action) {
      deliveryId = `${conversation._id}:${event}:${action.id}:${timestamp}`;
    } else if (reaction) {
      deliveryId = `${conversation._id}:${event}:${reaction.messageId}:${timestamp}`;
    } else {
      deliveryId = `${conversation._id}:${event}`;
    }

    return {
      version: 1,
      timestamp,
      deliveryId,
      event,
      agentId: agentIdentifier,
      replyUrl,
      conversationId: conversation._id,
      integrationIdentifier: config.integrationIdentifier,
      message: message
        ? await this.mapMessage(message, params.storedAttachments, {
            organizationId: config.organizationId,
            environmentId: config.environmentId,
            conversationId: conversation._id,
          })
        : null,
      conversation: this.mapConversation(conversation),
      subscriber: this.mapSubscriber(subscriber),
      history: await this.mapHistory(history),
      platform: config.platform,
      platformContext,
      action: action ?? null,
      reaction: reaction ? await this.mapReaction(reaction, config, conversation) : null,
    };
  }

  private async mapMessage(
    message: Message,
    storedAttachments?: StoredAttachment[],
    signingContext?: AttachmentSigningContext
  ): Promise<AgentMessage> {
    const mapped: AgentMessage = {
      text: message.text,
      platformMessageId: message.id,
      author: {
        userId: message.author.userId,
        fullName: message.author.fullName,
        userName: message.author.userName,
        isBot: message.author.isBot,
      },
      timestamp: message.metadata?.dateSent?.toISOString() ?? new Date().toISOString(),
    };

    if (storedAttachments !== undefined) {
      mapped.attachments = signingContext
        ? await this.mapStoredAttachmentsForBridge(storedAttachments, signingContext)
        : [];

      return mapped;
    }

    if (message.attachments?.length) {
      mapped.attachments = message.attachments.map((a) => ({
        type: a.type,
        url: a.url,
        name: a.name,
        mimeType: a.mimeType,
        size: a.size,
      }));
    }

    return mapped;
  }

  private mapConversation(conversation: ConversationEntity): AgentConversation {
    return {
      identifier: conversation.identifier,
      status: conversation.status,
      metadata: conversation.metadata ?? {},
      messageCount: conversation.messageCount ?? 0,
      createdAt: conversation.createdAt,
      lastActivityAt: conversation.lastActivityAt,
    };
  }

  private mapSubscriber(subscriber: SubscriberEntity | null): AgentSubscriber | null {
    if (!subscriber) {
      return null;
    }

    return {
      subscriberId: subscriber.subscriberId,
      firstName: subscriber.firstName || undefined,
      lastName: subscriber.lastName || undefined,
      email: subscriber.email || undefined,
      phone: subscriber.phone || undefined,
      avatar: subscriber.avatar || undefined,
      locale: subscriber.locale || undefined,
      data: subscriber.data || undefined,
    };
  }

  private async mapReaction(
    reaction: BridgeReaction,
    config: ResolvedAgentConfig,
    conversation: ConversationEntity
  ): Promise<AgentReaction> {
    return {
      messageId: reaction.messageId,
      emoji: { name: reaction.emoji },
      added: reaction.added,
      message: reaction.sourceMessage
        ? await this.mapMessage(reaction.sourceMessage, reaction.sourceMessageStoredAttachments, {
            organizationId: config.organizationId,
            environmentId: config.environmentId,
            conversationId: conversation._id,
          })
        : null,
    };
  }

  private async mapHistory(activities: ConversationActivityEntity[]): Promise<AgentHistoryEntry[]> {
    const reversed = [...activities].reverse();
    const mapped: AgentHistoryEntry[] = [];

    for (const activity of reversed) {
      mapped.push({
        role: activity.senderType,
        type: activity.type,
        content: activity.content,
        richContent: await this.mapRichContentForBridge(activity.richContent, activity),
        senderName: activity.senderName || undefined,
        signalData: activity.signalData || undefined,
        createdAt: activity.createdAt,
      });
    }

    return mapped;
  }

  private async mapRichContentForBridge(
    richContent: Record<string, unknown> | undefined,
    activity: ConversationActivityEntity
  ): Promise<Record<string, unknown> | undefined> {
    if (!richContent) {
      return undefined;
    }

    const rawAttachments = richContent.attachments;

    if (!Array.isArray(rawAttachments)) {
      return richContent;
    }

    const mapped = await mapWithConcurrency(rawAttachments, ATTACHMENT_SIGNING_CONCURRENCY, async (item) => {
      if (!item || typeof item !== 'object') {
        this.logger.warn({ activityId: activity._id?.toString() }, 'History attachment is malformed; omitting');

        return null;
      }

      const att = item as Record<string, unknown>;
      const storageKey = att.storageKey;

      if (typeof storageKey === 'string' && storageKey.length > 0) {
        const url = await this.signAttachmentForHistory(storageKey, activity);

        if (!url) {
          return null;
        }

        return {
          type: att.type,
          url,
          name: att.name,
          mimeType: att.mimeType,
          size: att.size,
        };
      }

      this.logger.warn({ activityId: activity._id?.toString() }, 'History attachment missing storageKey; omitting');

      return null;
    });

    const attachments = mapped.flatMap((entry) => (entry ? [entry] : []));

    return {
      ...richContent,
      attachments,
    };
  }

  private async signAttachmentForHistory(
    storageKey: string,
    activity: ConversationActivityEntity
  ): Promise<string | null> {
    const activityId = activity._id?.toString();
    const expectedPrefix = this.getAttachmentStoragePrefix({
      organizationId: activity._organizationId,
      environmentId: activity._environmentId,
      conversationId: activity._conversationId,
    });

    if (!storageKey.startsWith(expectedPrefix)) {
      this.logger.warn(
        { storageKey, activityId, expectedPrefix },
        'History attachment storageKey outside expected namespace; omitting from bridge payload'
      );

      return null;
    }

    try {
      const url = await this.attachmentStorage.signRead(storageKey);

      if (!url) {
        this.logger.warn({ storageKey, activityId }, 'Agent attachment missing from storage; omitting from history');
      }

      return url;
    } catch (err) {
      this.logger.warn(err, 'Failed to sign agent attachment for history; omitting from bridge payload');
      captureAgentWarning(err, { component: 'bridge-executor', operation: 'sign-history-attachment' });

      return null;
    }
  }

  private async mapStoredAttachmentsForBridge(
    storedAttachments: StoredAttachment[],
    signingContext: AttachmentSigningContext
  ) {
    const mapped = await mapWithConcurrency(storedAttachments, ATTACHMENT_SIGNING_CONCURRENCY, async (attachment) => {
      const url = await this.signStoredAttachmentForBridge(attachment.storageKey, signingContext);

      if (!url) {
        return null;
      }

      return {
        type: attachment.type,
        url,
        name: attachment.name,
        mimeType: attachment.mimeType,
        size: attachment.size,
      };
    });

    return mapped.flatMap((entry) => (entry ? [entry] : []));
  }

  private async signStoredAttachmentForBridge(
    storageKey: string,
    signingContext: AttachmentSigningContext
  ): Promise<string | null> {
    const expectedPrefix = this.getAttachmentStoragePrefix(signingContext);

    if (!storageKey.startsWith(expectedPrefix)) {
      this.logger.warn(
        { storageKey, expectedPrefix },
        'Stored attachment storageKey outside expected namespace; omitting from bridge payload'
      );

      return null;
    }

    try {
      const url = await this.attachmentStorage.signRead(storageKey);

      if (!url) {
        this.logger.warn({ storageKey }, 'Stored attachment missing from storage; omitting from bridge payload');
      }

      return url;
    } catch (err) {
      this.logger.warn(err, 'Failed to sign stored attachment; omitting from bridge payload');
      captureAgentWarning(err, { component: 'bridge-executor', operation: 'sign-stored-attachment' });

      return null;
    }
  }

  private getAttachmentStoragePrefix(context: AttachmentSigningContext): string {
    return `${context.organizationId}/${context.environmentId}/${AGENTS_STORAGE_FOLDER}/${context.conversationId}/`;
  }
}
