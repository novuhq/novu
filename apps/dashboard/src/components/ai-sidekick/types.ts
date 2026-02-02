import { UIMessage, UITools } from 'ai';

export type ChatMessage = UIMessage<
  unknown,
  {
    'tool-reasoning': { toolCallId: string; text: string };
  },
  UITools
>;
