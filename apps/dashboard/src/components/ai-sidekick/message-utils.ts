import { AiWorkflowToolsEnum } from '@novu/shared';
import { DynamicToolUIPart, UIMessage } from 'ai';

export const hasKnownMessageParts = (message: UIMessage): boolean => {
  const knownToolNames = Object.values(AiWorkflowToolsEnum) as string[];

  return (message.parts ?? []).some(
    (p) =>
      p.type?.startsWith?.('text') ||
      (p.type?.startsWith?.('dynamic-tool') &&
        'toolName' in p &&
        knownToolNames.includes((p as DynamicToolUIPart).toolName))
  );
};

export function unwrapToolResult<T>(output: unknown): T | undefined {
  if (output && typeof output === 'object' && 'result' in output) {
    return (output as { result: T }).result;
  }

  return output as T | undefined;
}
