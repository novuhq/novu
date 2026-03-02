import { AiWorkflowToolsEnum } from '@novu/shared';
import { DynamicToolUIPart, UIMessage } from 'ai';

export const hasKnownMessageParts = (message: UIMessage): boolean => {
  const knownToolNames = Object.values(AiWorkflowToolsEnum) as string[];

  return (message.parts ?? []).some(
    (p) =>
      p.type?.startsWith?.('text') ||
      p.type?.startsWith?.('reasoning') ||
      (p.type?.startsWith?.('dynamic-tool') &&
        'toolName' in p &&
        knownToolNames.includes((p as DynamicToolUIPart).toolName))
  );
};
