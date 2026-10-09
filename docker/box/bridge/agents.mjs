// Self-hosted agents, one per framework flavour. The models are scripted fakes (no LLM key, deterministic output):
// "weather <city>" asks for a gated get_weather call, a tool result turns into the final answer, anything else echoes.
import { AIMessage } from '@langchain/core/messages';
import { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { tool as langchainTool } from '@langchain/core/tools';
import {
  Actions,
  agent,
  Button,
  Card,
  CardLink,
  CardText,
  Chart,
  Divider,
  Select,
  SelectOption,
  Table,
} from '@novu/framework/express';
import { agent as aiSdkAgent, toModelMessages } from '@novu/framework/ai-sdk';
import { agent as langchainAgent } from '@novu/framework/langchain';
import { generateText, stepCountIs, tool as aiTool } from 'ai';
import { MockLanguageModelV4 } from 'ai/test';
import { z } from 'zod';

const weather = (city) => `Sunny, 21°C in ${city}`;
const cityOf = (text) => text.match(/weather(?: in)? ([\p{L}-]+)/iu)?.[1] ?? 'Berlin';

function demoCard() {
  return Card({
    title: 'Box demo card',
    children: [
      CardText('Buttons, a select, a link, a table and a chart.'),
      Table({ headers: ['Channel', 'Sent'], rows: [['email', '12'], ['sms', '3']] }),
      Chart({ title: 'Sends', chart: { type: 'pie', segments: [{ label: 'email', value: 12 }, { label: 'sms', value: 3 }] } }),
      CardLink({ url: 'https://docs.novu.co', label: 'Novu docs' }),
      Divider(),
      Actions([
        Button({ id: 'pick', label: 'Pick me', value: 'blue', style: 'primary' }),
        Select({ id: 'plan', label: 'Plan', options: [SelectOption({ label: 'Free', value: 'free' }), SelectOption({ label: 'Pro', value: 'pro' })] }),
      ]),
    ],
  });
}

const vanilla = agent('box-vanilla', {
  onMessage: (message, ctx) => {
    const text = message.text.trim();
    const command = text.toLowerCase();
    if (command === 'card') return demoCard();
    if (command.startsWith('weather')) {
      return ctx.toolApproval.request({ id: `weather-${Date.now()}`, name: 'get_weather', input: { city: cityOf(text) } });
    }
    if (command.startsWith('remember ')) {
      ctx.metadata.set('note', text.slice('remember '.length));

      return `Noted: ${text.slice('remember '.length)}`;
    }
    if (command === 'recall') return `You asked me to remember: ${ctx.metadata.get('note') ?? 'nothing'}`;
    if (command.startsWith('notify')) {
      ctx.trigger('box-bridge-all-channels', { payload: { name: text.slice('notify'.length).trim() || 'Agent', skipPush: true } });

      return 'Triggered box-bridge-all-channels';
    }
    if (command === 'done') {
      ctx.resolve('Resolved by the box smoke test');

      return 'Resolving';
    }

    return `vanilla echo: ${text} (subscriber ${ctx.subscriber?.subscriberId}, ${ctx.history.length} history entries)`;
  },
  onAction: (action) => `Clicked ${action.id}${action.value ? ` = ${action.value}` : ''}`,
  onToolApproval: ({ toolCall, approved }) => (approved ? weather(toolCall.input.city) : `Skipped ${toolCall.name}`),
});

const usage = {
  inputTokens: { total: 1, noCache: 1, cacheRead: 0, cacheWrite: 0 },
  outputTokens: { total: 1, text: 1, reasoning: 0 },
};
const scriptedAiModel = new MockLanguageModelV4({
  doGenerate: async ({ prompt }) => {
    const last = prompt.at(-1);
    const result = last.role === 'tool' ? last.content.find((part) => part.type === 'tool-result') : undefined;
    if (result) return { content: [{ type: 'text', text: String(result.output.value) }], finishReason: { unified: 'stop' }, usage, warnings: [] };
    const text = last.content.filter((part) => part.type === 'text').map((part) => part.text).join(' ');
    if (/weather/i.test(text)) {
      const call = { type: 'tool-call', toolCallId: `call-${Date.now()}`, toolName: 'get_weather', input: JSON.stringify({ city: cityOf(text) }) };

      return { content: [call], finishReason: { unified: 'tool-calls' }, usage, warnings: [] };
    }

    return { content: [{ type: 'text', text: `ai-sdk echo: ${text}` }], finishReason: { unified: 'stop' }, usage, warnings: [] };
  },
});

const aiSdk = aiSdkAgent('box-ai-sdk', async (_message, ctx) =>
  generateText({
    model: scriptedAiModel,
    messages: await toModelMessages(ctx),
    stopWhen: stepCountIs(3),
    tools: {
      get_weather: aiTool({
        description: 'Current weather for a city',
        inputSchema: z.object({ city: z.string() }),
        needsApproval: true,
        execute: async ({ city }) => weather(city),
      }),
    },
  })
);

class ScriptedChatModel extends BaseChatModel {
  _llmType() {
    return 'box-scripted';
  }

  bindTools() {
    return this;
  }

  async _generate(messages) {
    const last = messages.at(-1);
    const text = typeof last.content === 'string' ? last.content : last.content.map((part) => part.text ?? '').join(' ');
    let message;
    if (last.getType() === 'tool') message = new AIMessage(text);
    else if (/weather/i.test(text)) {
      message = new AIMessage({ content: '', tool_calls: [{ id: `call-${Date.now()}`, name: 'get_weather', args: { city: cityOf(text) }, type: 'tool_call' }] });
    } else message = new AIMessage(`langchain echo: ${text}`);

    return { generations: [{ text: typeof message.content === 'string' ? message.content : '', message }] };
  }
}

const getWeather = langchainTool(async ({ city }) => weather(city), {
  name: 'get_weather',
  description: 'Current weather for a city',
  schema: z.object({ city: z.string() }),
});

const langchain = langchainAgent('box-langchain', () => ({
  model: new ScriptedChatModel({}),
  tools: [getWeather],
  system: 'You are the box test agent.',
  needsApproval: (toolCall) => toolCall.name === 'get_weather',
}));

export const agents = [vanilla, aiSdk, langchain];
