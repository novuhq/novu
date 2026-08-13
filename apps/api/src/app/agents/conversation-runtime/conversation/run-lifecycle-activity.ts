import type { AgentEvent, AgentFinishReason, AgentRunOutcome } from '@novu/agent-event-protocol';
import {
  ConversationActivityEntity,
  ConversationActivityTypeEnum,
  type ConversationChannel,
  type ConversationEntity,
  type RunLifecycleActivityType,
} from '@novu/dal';
import { AgentPlatformEnum } from '../../shared/enums/agent-platform.enum';

export type RunLifecycleEvent = Extract<AgentEvent, { type: 'run-start' | 'run-finish' | 'run-error' }>;

export interface PersistRunLifecycleParams {
  conversationId: string;
  channel: ConversationChannel;
  agentIdentifier: string;
  environmentId: string;
  organizationId: string;
  /** Stable per-run id from the protocol envelope — used for idempotent identifiers. */
  runId: string;
  event: RunLifecycleEvent;
}

/** Type alias, not an interface: it is stored through `richContent: Record<string, unknown>`. */
export type RunLifecycleRichContent = {
  lifecycle: {
    outcome?: AgentRunOutcome;
    finishReason?: AgentFinishReason;
    message?: string;
    code?: string;
  };
};

export function resolveLifecycleChannel(
  conversation: ConversationEntity,
  platformThreadId?: string
): ConversationChannel {
  const channels = conversation.channels ?? [];

  if (platformThreadId) {
    const matched = channels.find((channel) => channel.platformThreadId === platformThreadId);
    if (matched) {
      return matched;
    }
  }

  const agentChat = channels.find((channel) => channel.platform === AgentPlatformEnum.AGENT_CHAT);
  if (agentChat) {
    return agentChat;
  }

  const primary = channels[0];
  if (primary) {
    return primary;
  }

  throw new Error(`Conversation ${conversation._id} has no channel for run lifecycle persist`);
}

export function runLifecycleIdentifier(runId: string, suffix: 'start' | 'finish' | 'error'): string {
  return `run_${runId}_${suffix}`;
}

export function runIdFromLifecycleIdentifier(identifier: string): string | undefined {
  const match = /^run_(.+?)_(start|finish|error)$/.exec(identifier);

  return match?.[1];
}

export function describeRunLifecycleFromEvent(event: RunLifecycleEvent): {
  type: RunLifecycleActivityType;
  content: string;
  richContent?: RunLifecycleRichContent;
  identifierSuffix: 'start' | 'finish' | 'error';
} {
  switch (event.type) {
    case 'run-start':
      return {
        type: ConversationActivityTypeEnum.RUN_START,
        content: 'Run started',
        identifierSuffix: 'start',
      };
    case 'run-finish':
      return {
        type: ConversationActivityTypeEnum.RUN_FINISH,
        content: `Run finished: ${event.outcome}`,
        richContent: {
          lifecycle: {
            outcome: event.outcome,
            ...(event.finishReason !== undefined ? { finishReason: event.finishReason } : {}),
          },
        },
        identifierSuffix: 'finish',
      };
    case 'run-error':
      return {
        type: ConversationActivityTypeEnum.RUN_ERROR,
        content: event.message,
        richContent: {
          lifecycle: {
            message: event.message,
            ...(event.code !== undefined ? { code: event.code } : {}),
          },
        },
        identifierSuffix: 'error',
      };
  }
}

function readLifecycleRichContent(
  richContent?: Record<string, unknown>
): RunLifecycleRichContent['lifecycle'] | undefined {
  const lifecycle = richContent?.lifecycle;
  if (!lifecycle || typeof lifecycle !== 'object') {
    return undefined;
  }

  return lifecycle as RunLifecycleRichContent['lifecycle'];
}

export function mapRunLifecycleActivityToEvent(activity: ConversationActivityEntity): RunLifecycleEvent | null {
  switch (activity.type) {
    case ConversationActivityTypeEnum.RUN_START:
      return { type: 'run-start' };

    case ConversationActivityTypeEnum.RUN_FINISH: {
      const lifecycle = readLifecycleRichContent(activity.richContent);
      const outcome = lifecycle?.outcome;
      if (outcome !== 'completed' && outcome !== 'paused' && outcome !== 'aborted') {
        return null;
      }

      const finishReason = lifecycle?.finishReason;

      return {
        type: 'run-finish',
        outcome,
        ...(finishReason === 'stop' ||
        finishReason === 'length' ||
        finishReason === 'refused' ||
        finishReason === 'other'
          ? { finishReason }
          : {}),
      };
    }

    case ConversationActivityTypeEnum.RUN_ERROR: {
      const lifecycle = readLifecycleRichContent(activity.richContent);
      const message = typeof lifecycle?.message === 'string' ? lifecycle.message : activity.content;
      if (!message) {
        return null;
      }

      return {
        type: 'run-error',
        message,
        ...(typeof lifecycle?.code === 'string' ? { code: lifecycle.code } : {}),
      };
    }

    default:
      return null;
  }
}
