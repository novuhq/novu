import { type Message, MessageRole } from '@novu/thalamus';
import {
  buildWorkflowOriginInjection,
  type WorkflowOriginSnapshot,
} from '../conversation-runtime/ingress/workflow-origin.helpers';

/**
 * Messages for a turn on an existing Anthropic session. The provider holds prior
 * history server-side, so only the new turn is sent.
 *
 * When a workflow origin is present, it is injected as an ephemeral ASSISTANT row
 * ahead of the USER row (never persisted as a MESSAGE activity). Thalamus runs one
 * live turn per USER row, so this adds context without producing a second reply,
 * and ASSISTANT avoids elevating untrusted payload text the way a SYSTEM row would.
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
    content: buildWorkflowOriginInjection(origin.data.workflowIdentifier, origin.content, origin.data.payload),
  };
}
