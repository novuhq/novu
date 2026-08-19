import { type Message, MessageRole } from '@novu/thalamus';

/**
 * Messages for a turn on an existing Anthropic session. The provider holds prior
 * history server-side, so only the new turn is sent — which means a transcript row
 * written mid-conversation (workflow-origin hydration) would otherwise never reach
 * the model.
 *
 * The origin summary goes in as an ASSISTANT row ahead of the USER row: Thalamus
 * runs one live turn per USER row, so this adds the context without producing a
 * second reply, and ASSISTANT avoids elevating untrusted payload text the way a
 * SYSTEM row would.
 */
export function buildLiveSessionMessages(params: {
  userMessageText: string;
  workflowOriginContent?: string;
}): Message[] {
  const userMessage: Message = { role: MessageRole.USER, content: params.userMessageText };

  if (!params.workflowOriginContent) {
    return [userMessage];
  }

  return [{ role: MessageRole.ASSISTANT, content: params.workflowOriginContent }, userMessage];
}
