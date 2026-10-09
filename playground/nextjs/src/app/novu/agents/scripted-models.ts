import { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { AIMessage, type BaseMessage } from '@langchain/core/messages';
import type { ChatResult } from '@langchain/core/outputs';
import { MockLanguageModelV4 } from 'ai/test';

/**
 * Stand-ins for Claude when `ANTHROPIC_API_KEY` is not set, so the AI SDK and LangChain agents
 * still exercise the tool approval flow: "weather <city>" asks for a gated `get_weather` call and
 * a tool result becomes the final answer. Anything else gets `NO_KEY`.
 */
const NO_KEY = 'No ANTHROPIC_API_KEY, so I can only check the weather. custom-code-agent has every feature without a model.';
const cityOf = (text: string) => text.match(/weather(?: in)? ([\p{L}-]+)/iu)?.[1] ?? 'Berlin';

const usage = {
  inputTokens: { total: 1, noCache: 1, cacheRead: 0, cacheWrite: 0 },
  outputTokens: { total: 1, text: 1, reasoning: 0 },
};

export const scriptedAiSdkModel = new MockLanguageModelV4({
  doGenerate: async ({ prompt }) => {
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
  },
});

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
}
