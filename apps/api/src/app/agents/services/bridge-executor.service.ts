import { Injectable } from '@nestjs/common';
import {
  buildNovuSignatureHeader,
  GetDecryptedSecretKey,
  GetDecryptedSecretKeyCommand,
  PinoLogger,
} from '@novu/application-generic';
import {
  ConversationActivityEntity,
  ConversationActivitySenderTypeEnum,
  ConversationActivityTypeEnum,
  ConversationEntity,
  EnvironmentRepository,
  SubscriberEntity,
} from '@novu/dal';
import jwt from 'jsonwebtoken';
import type { Message, Thread } from 'chat';
import { AgentEventEnum } from '../dtos/agent-event.enum';
import { ResolvedPlatformConfig } from './agent-credential.service';

const REPLY_TOKEN_TTL = '24h';
const MAX_RETRIES = 2;
const RETRY_BASE_DELAY_MS = 500;

export interface BridgeExecutorParams {
  event: AgentEventEnum;
  config: ResolvedPlatformConfig;
  conversation: ConversationEntity;
  subscriber: SubscriberEntity | null;
  history: ConversationActivityEntity[];
  message: Message;
  thread: Thread;
}

export interface ReplyTokenClaims {
  conversationId: string;
  agentId: string;
  environmentId: string;
  organizationId: string;
  integrationIdentifier: string;
}

interface BridgeMessageAuthor {
  userId: string;
  fullName: string;
  userName: string;
  isBot: boolean | 'unknown';
}

interface BridgeMessage {
  text: string;
  platformMessageId: string;
  author: BridgeMessageAuthor;
  timestamp: string;
}

interface BridgeConversation {
  identifier: string;
  status: string;
  metadata: Record<string, unknown>;
  messageCount: number;
  createdAt: string;
  lastActivityAt: string;
}

interface BridgeSubscriber {
  subscriberId: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  avatar?: string;
  locale?: string;
  data?: Record<string, unknown>;
}

interface BridgeHistoryEntry {
  role: ConversationActivitySenderTypeEnum;
  type: ConversationActivityTypeEnum;
  content: string;
  senderName?: string;
  signalData?: { type: string; payload?: Record<string, unknown> };
  createdAt: string;
}

interface BridgePlatformContext {
  threadId: string;
  channelId: string;
  isDM: boolean;
}

export interface AgentBridgeRequest {
  version: 1;
  timestamp: string;
  event: AgentEventEnum;
  agentId: string;
  replyToken: string;
  replyUrl: string;
  message: BridgeMessage | null;
  conversation: BridgeConversation;
  subscriber: BridgeSubscriber | null;
  history: BridgeHistoryEntry[];
  platform: string;
  platformContext: BridgePlatformContext;
}

@Injectable()
export class BridgeExecutorService {
  constructor(
    private readonly environmentRepository: EnvironmentRepository,
    private readonly getDecryptedSecretKey: GetDecryptedSecretKey,
    private readonly logger: PinoLogger
  ) {}

  async execute(params: BridgeExecutorParams): Promise<void> {
    const { config, event, conversation, thread } = params;
    const agentIdentifier = config.agentIdentifier;

    const bridgeUrl = await this.resolveBridgeUrl(config.environmentId, agentIdentifier, event);
    if (!bridgeUrl) {
      return;
    }

    const secretKey = await this.getDecryptedSecretKey.execute(
      GetDecryptedSecretKeyCommand.create({ environmentId: config.environmentId, organizationId: config.organizationId })
    );

    const replyToken = this.signReplyToken(secretKey, {
      conversationId: conversation._id,
      agentId: agentIdentifier,
      environmentId: config.environmentId,
      organizationId: config.organizationId,
      integrationIdentifier: config.integrationIdentifier,
    });

    const payload = this.buildPayload(params, replyToken, thread);
    const signatureHeader = buildNovuSignatureHeader(secretKey, payload);

    this.fireWithRetries(bridgeUrl, payload, signatureHeader, agentIdentifier).catch((err) => {
      this.logger.error(err, `[agent:${agentIdentifier}] Bridge call to ${bridgeUrl} failed after ${MAX_RETRIES + 1} attempts`);
    });
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
      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-novu-signature': signatureHeader,
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
        this.logger.warn(`[agent:${agentIdentifier}] Bridge call attempt ${attempt + 1} network error: ${lastError.message}`);
      }

      if (attempt < MAX_RETRIES) {
        await this.delay(RETRY_BASE_DELAY_MS * Math.pow(2, attempt));
      }
    }

    throw lastError ?? new Error('Bridge call failed');
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => {
      setTimeout(resolve, ms);
    });
  }

  private async resolveBridgeUrl(
    environmentId: string,
    agentIdentifier: string,
    event: AgentEventEnum
  ): Promise<string | null> {
    const environment = await this.environmentRepository.findOne({ _id: environmentId }, ['bridge']);
    const baseUrl = environment?.bridge?.url;

    if (!baseUrl) {
      this.logger.warn(`[agent:${agentIdentifier}] No bridge URL configured on environment, skipping bridge call`);

      return null;
    }

    const url = new URL(baseUrl);
    url.searchParams.set('action', 'agent-event');
    url.searchParams.set('agentId', agentIdentifier);
    url.searchParams.set('event', event);

    return url.toString();
  }

  private signReplyToken(secretKey: string, claims: ReplyTokenClaims): string {
    return jwt.sign(claims, secretKey, { expiresIn: REPLY_TOKEN_TTL });
  }

  private buildPayload(params: BridgeExecutorParams, replyToken: string, thread: Thread): AgentBridgeRequest {
    const { event, config, conversation, subscriber, history, message } = params;
    const agentIdentifier = config.agentIdentifier;

    const apiRootUrl = process.env.API_ROOT_URL || 'http://localhost:3000';
    const replyUrl = `${apiRootUrl}/agents/${agentIdentifier}/reply`;

    return {
      version: 1,
      timestamp: new Date().toISOString(),
      event,
      agentId: agentIdentifier,
      replyToken,
      replyUrl,
      message: this.mapMessage(message),
      conversation: this.mapConversation(conversation),
      subscriber: this.mapSubscriber(subscriber),
      history: this.mapHistory(history),
      platform: config.platform,
      platformContext: {
        threadId: thread.id,
        channelId: thread.channelId,
        isDM: thread.isDM,
      },
    };
  }

  private mapMessage(message: Message): BridgeMessage {
    return {
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
  }

  private mapConversation(conversation: ConversationEntity): BridgeConversation {
    return {
      identifier: conversation.identifier,
      status: conversation.status,
      metadata: conversation.metadata ?? {},
      messageCount: conversation.messageCount ?? 0,
      createdAt: conversation.createdAt,
      lastActivityAt: conversation.lastActivityAt,
    };
  }

  private mapSubscriber(subscriber: SubscriberEntity | null): BridgeSubscriber | null {
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

  private mapHistory(activities: ConversationActivityEntity[]): BridgeHistoryEntry[] {
    return [...activities].reverse().map((activity) => ({
      role: activity.senderType,
      type: activity.type,
      content: activity.content,
      senderName: activity.senderName || undefined,
      signalData: activity.signalData || undefined,
      createdAt: activity.createdAt,
    }));
  }
}
