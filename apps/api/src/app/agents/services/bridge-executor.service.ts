import { Injectable } from '@nestjs/common';
import {
  buildNovuSignatureHeader,
  GetDecryptedSecretKey,
  GetDecryptedSecretKeyCommand,
  PinoLogger,
  validateUrlSsrf,
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
import { ResolvedAgentConfig } from './agent-config-resolver.service';

const MAX_RETRIES = 2;
const RETRY_BASE_DELAY_MS = 500;

export interface BridgeReaction {
  emoji: string;
  added: boolean;
  messageId: string;
  sourceMessage?: Message;
}

export interface BridgeExecutorParams {
  event: AgentEventEnum;
  config: ResolvedAgentConfig;
  conversation: ConversationEntity;
  subscriber: SubscriberEntity | null;
  history: ConversationActivityEntity[];
  message: Message | null;
  platformContext: AgentPlatformContext;
  action?: AgentAction;
  reaction?: BridgeReaction;
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
    private readonly logger: PinoLogger
  ) {}

  async execute(params: BridgeExecutorParams): Promise<void> {
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

      const payload = this.buildPayload(params);
      const signatureHeader = buildNovuSignatureHeader(secretKey, payload);

      this.fireWithRetries(bridgeUrl, payload, signatureHeader, agentIdentifier).catch((err) => {
        this.logger.error(err, `[agent:${agentIdentifier}] Bridge delivery failed after ${MAX_RETRIES + 1} attempts`);
      });
    } catch (err) {
      if (err instanceof NoBridgeUrlError) {
        throw err;
      }

      this.logger.error(err, `[agent:${agentIdentifier}] Bridge setup failed — skipping bridge call`);
    }
  }

  private async fireWithRetries(
    url: string,
    payload: AgentBridgeRequest,
    signatureHeader: string,
    agentIdentifier: string
  ): Promise<void> {
    const body = JSON.stringify(payload);
    let lastError: Error | undefined;

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      // Re-validate per attempt to defend against (a) agents whose bridgeUrl was
      // stored before the update-time SSRF guard was added, and (b) DNS rebinding
      // — a hostname that resolved to a public IP at update-time can later resolve
      // to a private one. validateUrlSsrf caches DNS lookups for 5 minutes, so
      // the per-attempt cost is amortized across retries.
      const ssrfError = await validateUrlSsrf(url);
      if (ssrfError) {
        throw new Error(`Bridge URL blocked by SSRF protection: ${ssrfError}`);
      }

      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            // Must match HttpHeaderKeysEnum.NOVU_SIGNATURE — the framework SDK reads
            // this exact header to verify the HMAC. Sending any other name (e.g.
            // `x-novu-signature`) silently disables signature verification on the
            // bridge and lets a forged AgentBridgeRequest exfiltrate the secret key
            // via an attacker-controlled `replyUrl`.
            [HttpHeaderKeysEnum.NOVU_SIGNATURE]: signatureHeader,
          },
          body,
        });

        if (response.ok) {
          return;
        }

        lastError = new Error(`Bridge returned ${response.status}: ${response.statusText}`);
        this.logger.warn(`[agent:${agentIdentifier}] Bridge call attempt ${attempt + 1} failed: ${response.status}`);
      } catch (err) {
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

  private buildPayload(params: BridgeExecutorParams): AgentBridgeRequest {
    const { event, config, conversation, subscriber, history, message, platformContext, action, reaction } = params;
    const agentIdentifier = config.agentIdentifier;

    const apiRootUrl = process.env.API_ROOT_URL || 'http://localhost:3000';
    const replyUrl = `${apiRootUrl}/v1/agents/${agentIdentifier}/reply`;

    const timestamp = new Date().toISOString();

    let deliveryId: string;
    if (message?.id) {
      deliveryId = `${conversation._id}:${message.id}`;
    } else if (action) {
      deliveryId = `${conversation._id}:${event}:${action.actionId}:${timestamp}`;
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
      message: message ? this.mapMessage(message) : null,
      conversation: this.mapConversation(conversation),
      subscriber: this.mapSubscriber(subscriber),
      history: this.mapHistory(history),
      platform: config.platform,
      platformContext,
      action: action ?? null,
      reaction: reaction ? this.mapReaction(reaction) : null,
    };
  }

  private mapMessage(message: Message): AgentMessage {
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

  private mapReaction(reaction: BridgeReaction): AgentReaction {
    return {
      messageId: reaction.messageId,
      emoji: { name: reaction.emoji },
      added: reaction.added,
      message: reaction.sourceMessage ? this.mapMessage(reaction.sourceMessage) : null,
    };
  }

  private mapHistory(activities: ConversationActivityEntity[]): AgentHistoryEntry[] {
    return [...activities].reverse().map((activity) => ({
      role: activity.senderType,
      type: activity.type,
      content: activity.content,
      richContent: activity.richContent || undefined,
      senderName: activity.senderName || undefined,
      signalData: activity.signalData || undefined,
      createdAt: activity.createdAt,
    }));
  }
}
