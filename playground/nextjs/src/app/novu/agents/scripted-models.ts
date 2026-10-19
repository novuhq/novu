import type { CallbackManagerForLLMRun } from '@langchain/core/callbacks/manager';
import { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { AIMessage, AIMessageChunk, type BaseMessage } from '@langchain/core/messages';
import { ChatGenerationChunk, type ChatResult } from '@langchain/core/outputs';
import { MockLanguageModelV4 } from 'ai/test';

/**
 * Stand-ins for Claude when `ANTHROPIC_API_KEY` is not set, so the AI SDK and LangChain agents
 * still exercise the tool approval flow: "weather <city>" asks for a gated `get_weather` call and
 * a tool result becomes the final answer. Anything else gets `NO_KEY`.
 */
const NO_KEY = 'No ANTHROPIC_API_KEY, so I can only check the weather. custom-code-agent has every feature without a model.';
const cityOf = (text: string) => text.match(/weather(?: in)? ([\p{L}\s-]+)/iu)?.[1].trim() ?? 'Berlin';

const usage = {
  inputTokens: { total: 1, noCache: 1, cacheRead: 0, cacheWrite: 0 },
  outputTokens: { total: 1, text: 1, reasoning: 0 },
};

const doGenerate: MockLanguageModelV4['doGenerate'] = async ({ prompt }) => {
  const last = prompt[prompt.length - 1];
  const result = last.role === 'tool' ? last.content.find((part) => part.type === 'tool-result') : undefined;
  if (result) {
    const output = 'value' in result.output ? String(result.output.value) : '';

    return { content: [{ type: 'text', text: output }], finishReason: { unified: 'stop', raw: 'stop' }, usage, warnings: [] };
  }

  const text = Array.isArray(last.content)
    ? last.content.map((part) => (part.type === 'text' ? part.text : '')).join(' ')
    : last.content;
  if (/weather/i.test(text)) {
    const call = {
      type: 'tool-call' as const,
      toolCallId: `call-${Date.now()}`,
      toolName: 'get_weather',
      input: JSON.stringify({ city: cityOf(text) }),
    };

    return { content: [call], finishReason: { unified: 'tool-calls', raw: 'tool_use' }, usage, warnings: [] };
  }

  return {
    content: [{ type: 'text', text: NO_KEY }],
    finishReason: { unified: 'stop', raw: 'stop' },
    usage,
    warnings: [],
  };
};

/** The same scripted answer, split into deltas, so `streamText` works without a key. */
const doStream: MockLanguageModelV4['doStream'] = async (options) => {
  const { content, finishReason } = await doGenerate(options);

  return {
    stream: new ReadableStream({
      start(controller) {
        controller.enqueue({ type: 'stream-start', warnings: [] });
        content.forEach((part, index) => {
          if (part.type === 'tool-call') {
            controller.enqueue(part);

            return;
          }

          if (part.type !== 'text') return;

          const id = `text-${index}`;
          controller.enqueue({ type: 'text-start', id });
          for (const word of part.text.split(/(?<=\s)/)) {
            controller.enqueue({ type: 'text-delta', id, delta: word });
          }
          controller.enqueue({ type: 'text-end', id });
        });
        controller.enqueue({ type: 'finish', finishReason, usage });
        controller.close();
      },
    }),
  };
};

export const scriptedAiSdkModel = new MockLanguageModelV4({ doGenerate, doStream });

export class ScriptedChatModel extends BaseChatModel {
  _llmType() {
    return 'playground-scripted';
  }

  bindTools() {
    return this;
  }

  async _generate(messages: BaseMessage[]): Promise<ChatResult> {
    const last = messages[messages.length - 1];
    const text = typeof last.content === 'string' ? last.content : last.text;
    let message: AIMessage;
    if (last.getType() === 'tool') {
      message = new AIMessage(text);
    } else if (/weather/i.test(text)) {
      message = new AIMessage({
        content: '',
        tool_calls: [{ id: `call-${Date.now()}`, name: 'get_weather', args: { city: cityOf(text) }, type: 'tool_call' }],
      });
    } else {
      message = new AIMessage(NO_KEY);
    }

    return { generations: [{ text: message.text, message }] };
  }

  /** Without this, `BaseChatModel` yields the whole answer as one chunk and nothing streams. */
  async *_streamResponseChunks(
    messages: BaseMessage[],
    _options: this['ParsedCallOptions'],
    runManager?: CallbackManagerForLLMRun
  ): AsyncGenerator<ChatGenerationChunk> {
    const { message } = (await this._generate(messages)).generations[0] as { message: AIMessage };
    if (message.tool_calls?.length) {
      const toolCallChunks = message.tool_calls.map((call, index) => ({
        ...call,
        args: JSON.stringify(call.args),
        index,
        type: 'tool_call_chunk' as const,
      }));

      yield new ChatGenerationChunk({ text: '', message: new AIMessageChunk({ content: '', tool_call_chunks: toolCallChunks }) });

      return;
    }

    for (const word of message.text.split(/(?<=\s)/)) {
      await runManager?.handleLLMNewToken(word);
      yield new ChatGenerationChunk({ text: word, message: new AIMessageChunk(word) });
    }
  }
}
