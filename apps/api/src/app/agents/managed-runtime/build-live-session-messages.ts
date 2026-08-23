import { buildWorkflowOriginInjection } from '@novu/framework/internal';
import { type Message, MessageRole } from '@novu/thalamus';
import type { WorkflowOriginSnapshot } from '../conversation-runtime/ingress/workflow-origin.helpers';

/**
 * Messages for a turn on an existing Anthropic session. The provider holds prior
 * history server-side, so only the new turn and newly hydrated origin are sent.
 */
export function buildLiveSessionMessages(params: {
  userMessageText: string;
  workflowOrigin?: WorkflowOriginSnapshot | null;
}): Message[] {
  const userMessage: Message = { role: MessageRole.USER, content: params.userMessageText };

  if (!params.workflowOrigin) {
    return [userMessage];
  }

  return [buildOriginAssistantMessage(params.workflowOrigin), userMessage];
}

export function buildOriginAssistantMessage(origin: WorkflowOriginSnapshot): Message {
  return {
    role: MessageRole.ASSISTANT,
    content: buildWorkflowOriginInjection(origin.data.workflowIdentifier, origin.data.body, origin.data.payload),
  };
}
