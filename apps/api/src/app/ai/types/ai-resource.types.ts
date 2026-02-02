import type { UIMessageStreamWriter } from 'ai';
import type { StreamGenerationCommand } from '../usecases/stream-generation';

export interface UIMessagePartInput {
  type: string;
  text?: string;
}

export interface UIMessageInput {
  id: string;
  role: 'user' | 'assistant' | 'system';
  parts: UIMessagePartInput[];
}

export interface StreamGenerationContext {
  writer: UIMessageStreamWriter;
  command: StreamGenerationCommand;
}

export interface BaseStreamGenerationAgent {
  execute(context: StreamGenerationContext): Promise<void>;
}
