import type { ActionRequired, Response as ThalamusResponse, Usage } from '@novu/thalamus';
import { mapAnthropicEvent } from '@novu/thalamus/anthropic/parser';
import { mapOpenAIEvent } from '@novu/thalamus/openai/parser';
import type { ProviderParser } from './types';

export class EdgeAccumulator {
  done = false;
  finishReason: ThalamusResponse['finishReason'] = 'stop';
  usage: Usage | undefined;
  actionsRequired: ActionRequired[] = [];
  sessionId: string | undefined;
  conversationId: string | undefined;
  mcpServerByToolUseId = new Map<string, string>();
  stepIndex = 0;

  set content(_: string) {}
  get content() {
    return '';
  }

  toResponse(sessionId?: string): ThalamusResponse {
    return {
      content: '',
      sessionId: sessionId ?? this.conversationId ?? this.sessionId,
      finishReason: this.finishReason,
      usage: this.usage,
      actionsRequired: this.actionsRequired.length > 0 ? this.actionsRequired : undefined,
    };
  }
}

export const providers: Record<string, ProviderParser> = {
  anthropic: {
    createAccumulator: () => new EdgeAccumulator(),
    mapEvent: (raw, acc) => mapAnthropicEvent(raw as any, acc as any),
  },
  openai: {
    createAccumulator: () => new EdgeAccumulator(),
    mapEvent: (raw, acc) => mapOpenAIEvent(raw as any, acc as any),
  },
};
