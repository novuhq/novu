import { Injectable } from '@nestjs/common';
import { PinoLogger } from '@novu/application-generic';
import { ConversationEntity } from '@novu/dal';
import type { Message } from 'chat';
import type { ResolvedAgentConfig } from '../../channels/agent-config-resolver.service';
import { AgentPlatformEnum } from '../../shared/enums/agent-platform.enum';
import { captureAgentWarning } from '../../shared/errors/capture-agent-sentry';
import { createSlackWebClient, decodeSlackPlatformThreadId } from '../egress/slack-native-delivery';
import { AgentConversationService } from './agent-conversation.service';

type SlackParentMessage = {
  ts?: string;
  text?: string;
  bot_id?: string;
  app_id?: string;
  subtype?: string;
  blocks?: unknown[];
  attachments?: Array<{ fallback?: string; text?: string; pretext?: string }>;
};

function asRecord(value: unknown): Record<string, unknown> | undefined {
  if (!value || typeof value !== 'object') {
    return undefined;
  }

  return value as Record<string, unknown>;
}

function getMessageRawEvent(message: Message): Record<string, unknown> | undefined {
  const raw = asRecord(message.raw);

  return asRecord(raw?.event) ?? raw;
}

/**
 * Returns the Slack thread root `ts` when `message` is a reply in an existing
 * thread. Top-level posts (no `thread_ts`, or `thread_ts === ts`) return null.
 */
export function resolveSlackThreadParentTs(message: Message): string | null {
  const rawEvent = getMessageRawEvent(message);
  const threadTs = rawEvent?.thread_ts;

  if (typeof threadTs !== 'string' || threadTs.length === 0) {
    return null;
  }

  const messageTs = typeof rawEvent?.ts === 'string' && rawEvent.ts.length > 0 ? rawEvent.ts : message.id;

  if (messageTs && threadTs === messageTs) {
    return null;
  }

  return threadTs;
}

export function isSlackBotAuthoredMessage(message: SlackParentMessage): boolean {
  if (typeof message.bot_id === 'string' && message.bot_id.length > 0) {
    return true;
  }

  if (typeof message.app_id === 'string' && message.app_id.length > 0) {
    return true;
  }

  return message.subtype === 'bot_message';
}

function extractTextFromBlocks(blocks: unknown[] | undefined): string {
  if (!Array.isArray(blocks)) {
    return '';
  }

  const parts: string[] = [];

  for (const block of blocks) {
    const record = asRecord(block);
    if (!record) {
      continue;
    }

    const textNode = asRecord(record.text);
    if (typeof textNode?.text === 'string' && textNode.text.trim().length > 0) {
      parts.push(textNode.text.trim());
      continue;
    }

    const fields = record.fields;
    if (!Array.isArray(fields)) {
      continue;
    }

    for (const field of fields) {
      const fieldRecord = asRecord(field);
      if (typeof fieldRecord?.text === 'string' && fieldRecord.text.trim().length > 0) {
        parts.push(fieldRecord.text.trim());
      }
    }
  }

  return parts.join('\n');
}

export function extractSlackMessageText(message: SlackParentMessage): string {
  const direct = message.text?.trim() ?? '';
  if (direct.length > 0) {
    return direct;
  }

  const fromBlocks = extractTextFromBlocks(message.blocks);
  if (fromBlocks.length > 0) {
    return fromBlocks;
  }

  for (const attachment of message.attachments ?? []) {
    const fallback = attachment.fallback?.trim() || attachment.text?.trim() || attachment.pretext?.trim();
    if (fallback) {
      return fallback;
    }
  }

  return '';
}

/**
 * Workflow (and other bot) Slack posts do not create ConversationActivity rows.
 * When a user later replies in that thread, hydrate the thread root from Slack
 * so the bridge history includes the original agent/workflow context.
 */
@Injectable()
export class SeedSlackThreadParentService {
  /** Overridable in unit tests so WebClient does not hit the network. */
  createClient = createSlackWebClient;

  constructor(
    private readonly conversationService: AgentConversationService,
    private readonly logger: PinoLogger
  ) {
    this.logger.setContext(this.constructor.name);
  }

  /**
   * Persists the Slack thread parent as an agent activity when missing.
   * Returns the parent platform message id when seeded or already present;
   * null when there is nothing to seed or hydration fails (fail-soft).
   */
  async maybeSeed(params: {
    agentId: string;
    config: ResolvedAgentConfig;
    conversation: ConversationEntity;
    message: Message;
    platformThreadId: string;
  }): Promise<string | null> {
    const { agentId, config, conversation, message, platformThreadId } = params;

    if (config.platform !== AgentPlatformEnum.SLACK) {
      return null;
    }

    const botToken = config.connectionAccessToken;
    if (!botToken) {
      return null;
    }

    const parentTs = resolveSlackThreadParentTs(message);
    if (!parentTs) {
      return null;
    }

    const existing = await this.conversationService.findSourceActivity(
      config.environmentId,
      conversation._id,
      parentTs
    );
    if (existing) {
      return parentTs;
    }

    try {
      const { channel } = decodeSlackPlatformThreadId(platformThreadId);
      const parent = await this.fetchThreadParent({ botToken, channel, parentTs });

      if (!parent || !isSlackBotAuthoredMessage(parent)) {
        return null;
      }

      const content = extractSlackMessageText(parent);
      if (!content) {
        this.logger.debug(
          `[agent:${agentId}] Slack thread parent ${parentTs} has no extractable text; skipping history seed`
        );

        return null;
      }

      await this.conversationService.persistAgentMessage({
        conversationId: conversation._id,
        channel: this.conversationService.getPrimaryChannel(conversation),
        platformMessageId: parentTs,
        platformThreadId,
        agentIdentifier: config.agentIdentifier,
        agentName: config.agentName,
        content,
        environmentId: config.environmentId,
        organizationId: config.organizationId,
      });

      this.logger.debug(`[agent:${agentId}] Seeded Slack thread parent ${parentTs} into conversation history`);

      return parentTs;
    } catch (err) {
      this.logger.warn(
        err,
        `[agent:${agentId}] Failed to seed Slack thread parent into conversation history; continuing without it`
      );
      captureAgentWarning(err, {
        component: 'seed-slack-thread-parent',
        operation: 'seed-thread-parent',
        agentId,
      });

      return null;
    }
  }

  private async fetchThreadParent(params: {
    botToken: string;
    channel: string;
    parentTs: string;
  }): Promise<SlackParentMessage | null> {
    const client = this.createClient(params.botToken);
    const result = await client.conversations.replies({
      channel: params.channel,
      ts: params.parentTs,
      latest: params.parentTs,
      inclusive: true,
      limit: 1,
    });

    if (!result.ok) {
      throw new Error(`Slack conversations.replies failed: ${result.error ?? 'unknown_error'}`);
    }

    const parent = result.messages?.[0] as SlackParentMessage | undefined;
    if (!parent?.ts || parent.ts !== params.parentTs) {
      return null;
    }

    return parent;
  }
}
