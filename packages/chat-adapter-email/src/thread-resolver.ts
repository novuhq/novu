import type { StateAdapter } from 'chat';
import type { NovuEmailThreadId } from './types.js';
import { hashMessageId } from './utils.js';

const WHITESPACE_RE = /\s+/;
const STATE_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

function msgKey(messageId: string): string {
  return `email:msg:${messageId}`;
}

function threadMessagesKey(threadId: string): string {
  return `email:thread:${threadId}:messages`;
}

function threadSubjectKey(threadId: string): string {
  return `email:thread:${threadId}:subject`;
}

function agentAddressKey(threadId: string): string {
  return `email:thread:${threadId}:agentAddress`;
}

interface ResolveInput {
  recipientAddress: string;
  messageId: string;
  inReplyTo?: string;
  references?: string;
}

export class ThreadResolver {
  private state: StateAdapter | null = null;

  setStateAdapter(state: StateAdapter): void {
    this.state = state;
  }

  private getState(): StateAdapter {
    if (!this.state) {
      throw new Error('ThreadResolver not initialized — call setStateAdapter() first');
    }

    return this.state;
  }

  encodeThreadId(id: NovuEmailThreadId): string {
    return `email:${encodeURIComponent(id.recipientAddress)}:${id.rootMessageIdHash}`;
  }

  decodeThreadId(threadId: string): NovuEmailThreadId {
    const parts = threadId.split(':');
    if (parts.length !== 3 || parts[0] !== 'email' || !parts[1] || !parts[2]) {
      throw new Error(`Invalid email thread ID format: ${threadId}`);
    }

    return {
      recipientAddress: decodeURIComponent(parts[1]),
      rootMessageIdHash: parts[2],
    };
  }

  async resolveThreadId(input: ResolveInput): Promise<string> {
    const state = this.getState();
    const { recipientAddress, messageId, inReplyTo, references } = input;

    if (inReplyTo || references) {
      const candidateIds = this.extractMessageIds(inReplyTo, references);
      for (const candidate of candidateIds) {
        const existingThread = await state.get<string>(msgKey(candidate));
        if (existingThread) {
          await this.trackMessage(existingThread, messageId);

          return existingThread;
        }
      }
    }

    const hash = hashMessageId(messageId);
    const threadId = this.encodeThreadId({ recipientAddress, rootMessageIdHash: hash });
    await this.trackMessage(threadId, messageId);

    return threadId;
  }

  async trackMessage(threadId: string, messageId: string): Promise<void> {
    const state = this.getState();
    await Promise.all([
      state.set(msgKey(messageId), threadId, STATE_TTL_MS),
      state.appendToList(threadMessagesKey(threadId), messageId, {
        maxLength: 100,
        ttlMs: STATE_TTL_MS,
      }),
    ]);
  }

  async trackSubject(threadId: string, subject: string): Promise<void> {
    const state = this.getState();
    await state.setIfNotExists(threadSubjectKey(threadId), subject, STATE_TTL_MS);
  }

  async getReplyHeaders(threadId: string): Promise<Record<string, string> | undefined> {
    const state = this.getState();
    const messages = await state.getList<string>(threadMessagesKey(threadId));
    if (!messages || messages.length === 0) {
      return undefined;
    }

    const lastMessageId = messages[messages.length - 1]!;

    return {
      'In-Reply-To': lastMessageId,
      References: messages.join(' '),
    };
  }

  async getSubject(threadId: string): Promise<string | undefined> {
    const state = this.getState();

    return (await state.get<string>(threadSubjectKey(threadId))) ?? undefined;
  }

  async trackAgentAddress(threadId: string, address: string): Promise<void> {
    const state = this.getState();
    await state.set(agentAddressKey(threadId), address, STATE_TTL_MS);
  }

  async getAgentAddress(threadId: string): Promise<string | undefined> {
    const state = this.getState();

    return (await state.get<string>(agentAddressKey(threadId))) ?? undefined;
  }

  /**
   * Extract candidate message IDs from In-Reply-To and References headers.
   * Handles both RFC 2822 whitespace-separated format and JSON-encoded arrays.
   */
  private extractMessageIds(inReplyTo?: string, references?: string): string[] {
    const ids: string[] = [];

    if (references) {
      const trimmed = references.trim();
      if (trimmed.startsWith('[')) {
        try {
          const parsed = JSON.parse(trimmed);
          if (Array.isArray(parsed)) {
            ids.push(
              ...parsed
                .filter((s): s is string => typeof s === 'string')
                .map((s) => s.trim())
                .filter(Boolean)
            );
          }
        } catch {
          ids.push(...trimmed.split(WHITESPACE_RE).filter(Boolean));
        }
      } else {
        ids.push(...trimmed.split(WHITESPACE_RE).filter(Boolean));
      }
    }

    if (inReplyTo) {
      const trimmed = inReplyTo.trim();
      if (trimmed && !ids.includes(trimmed)) {
        ids.push(trimmed);
      }
    }

    return ids;
  }
}
