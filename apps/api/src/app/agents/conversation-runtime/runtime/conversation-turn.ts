import type { AgentEntity, ConversationEntity, SubscriberEntity } from '@novu/dal';
import type { AgentAction, AgentContextPayload, AgentHumanResponse } from '@novu/framework';
import type { Message, Thread } from 'chat';
import type { ResolvedAgentConfig } from '../../channels/agent-config-resolver.service';
import type { AgentEventEnum } from '../../shared/enums/agent-event.enum';
import type { SubscriberResolution } from '../../shared/types/subscriber-resolution';
import type { StoredAttachment } from '../conversation/agent-attachment-storage.service';
import type { WorkflowOriginSnapshot } from '../ingress/workflow-origin.helpers';
import type { BridgeReaction } from './bridge-executor.service';

export interface ConversationTurn {
  agentId: string;
  agent: Pick<AgentEntity, '_id' | 'runtime' | 'managedRuntime'>;
  config: ResolvedAgentConfig;
  conversation: ConversationEntity;
  subscriber: SubscriberEntity | null;
  context?: AgentContextPayload | null;
  /**
   * Optional per-context bridge URL override resolved from the connect-time context. When set, the
   * bridge executor routes this turn here instead of the agent's default bridge URL.
   */
  bridgeUrlOverride?: string;
  /**
   * How `subscriber` was (or wasn't) resolved. Lets the unresolved-subscriber
   * gate distinguish a genuine unknown sender from a resolution failure and
   * log/reply accordingly.
   */
  subscriberResolution?: SubscriberResolution;
  message: Message | null;
  event: AgentEventEnum;
  thread: Thread;
  platformThreadId: string;
  /** The acting user's platform identity (Slack userId, Telegram chatId). Set on message/action turns. */
  platformUserId?: string;
  storedAttachments?: StoredAttachment[];
  action?: AgentAction;
  reaction?: BridgeReaction;
  workflowOrigin?: WorkflowOriginSnapshot | null;
  humanResponse?: AgentHumanResponse | null;
  /**
   * Set by the HITL inbound interceptor when a tool-approval click settled a
   * `HumanInteraction` row. The settlement chain persists the
   * `tool_approval_decision` itself, so the legacy `recordApprovalVerdict`
   * writer must skip this click to avoid double-recording the verdict.
   */
  toolApprovalSettledByHitl?: boolean;
}
