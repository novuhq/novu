import type { AgentEntity, ConversationEntity, SubscriberEntity } from '@novu/dal';
import type { AgentAction } from '@novu/framework';
import type { Message, Thread } from 'chat';
import type { ResolvedAgentConfig } from '../../channels/agent-config-resolver.service';
import type { AgentEventEnum } from '../../shared/enums/agent-event.enum';
import type { StoredAttachment } from '../conversation/agent-attachment-storage.service';
import type { BridgeReaction } from './bridge-executor.service';

export interface ConversationTurn {
  agentId: string;
  agent: Pick<AgentEntity, '_id' | 'runtime' | 'managedRuntime'>;
  config: ResolvedAgentConfig;
  conversation: ConversationEntity;
  subscriber: SubscriberEntity | null;
  message: Message | null;
  event: AgentEventEnum;
  thread: Thread;
  platformThreadId: string;
  storedAttachments?: StoredAttachment[];
  action?: AgentAction;
  reaction?: BridgeReaction;
}
