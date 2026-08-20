import type { AgentEntity, ConversationEntity, SubscriberEntity } from '@novu/dal';
import type { AgentAction, AgentContextPayload } from '@novu/framework';
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
  storedAttachments?: StoredAttachment[];
  action?: AgentAction;
  reaction?: BridgeReaction;
  /**
   * Most recent workflow-origin for this conversation. Present every turn once attached;
   * managed injects on live sessions only when `source === 'hydrated'`.
   */
  workflowOrigin?: WorkflowOriginSnapshot | null;
}
