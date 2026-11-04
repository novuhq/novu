/**
 * OpenAI chat-completions SSE framing for the ElevenLabs custom LLM bridge.
 * ElevenLabs posts to `{custom_llm.url}/chat/completions` and expects
 * `data: {...}` chunks ending in `data: [DONE]`.
 */

export type ChatMessage = {
  role: 'system' | 'user' | 'assistant' | 'tool' | 'function';
  content: string | null;
  name?: string;
  tool_calls?: ToolCall[];
  tool_call_id?: string;
};

export type ToolCall = {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;
  };
};

export type ChatCompletionRequest = {
  model?: string;
  messages: ChatMessage[];
  stream?: boolean;
  temperature?: number;
  max_tokens?: number;
  user_id?: string;
  elevenlabs_extra_body?: Record<string, unknown>;
};

const SSE_ID = 'chatcmpl-novu-voice';
const SSE_MODEL = 'novu-voice-bridge';

function chunkPayload(delta: Record<string, unknown>, finishReason: string | null = null) {
  return {
    id: SSE_ID,
    object: 'chat.completion.chunk',
    created: Math.floor(Date.now() / 1000),
    model: SSE_MODEL,
    choices: [
      {
        index: 0,
        delta,
        finish_reason: finishReason,
      },
    ],
  };
}

export function sseChunk(content: string): string {
  return `data: ${JSON.stringify(chunkPayload({ content }))}\n\n`;
}

export function sseToolCallChunk(toolCall: ToolCall): string {
  return `data: ${JSON.stringify(
    chunkPayload({
      tool_calls: [
        {
          index: 0,
          id: toolCall.id,
          type: 'function',
          function: {
            name: toolCall.function.name,
            arguments: toolCall.function.arguments,
          },
        },
      ],
    })
  )}\n\n`;
}

export function sseFinish(reason: 'stop' | 'tool_calls' = 'stop'): string {
  return `data: ${JSON.stringify(chunkPayload({}, reason))}\n\n`;
}

export function sseDone(): string {
  return 'data: [DONE]\n\n';
}

/** Empty-content keepalive so ElevenLabs does not drop a slow stream. */
export function sseKeepAlive(): string {
  return sseChunk('');
}
