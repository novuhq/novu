import { UserSessionData } from '@novu/shared';
import { InferUIMessageChunk, UIDataTypes, UIMessage, UITools } from 'ai';
import { BaseMessage } from 'langchain';

export interface UIMessagePartInput {
  type: string;
  text?: string;
}

export interface UIMessageInput {
  id: string;
  role: 'user' | 'assistant' | 'system';
  parts: UIMessagePartInput[];
}

export type StreamGenerationCommand = {
  user: UserSessionData;
  isNewMessage?: boolean;
  messages?: Array<BaseMessage> | null;
  signal: AbortSignal;
  chatId: string;
};

export interface StreamGenerationContext {
  command: StreamGenerationCommand;
}

export interface BaseStreamGenerationAgent {
  execute(
    context: StreamGenerationContext
  ): Promise<ReadableStream<InferUIMessageChunk<UIMessage<unknown, UIDataTypes, UITools>>>>;
}
