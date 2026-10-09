import { anthropic } from '@ai-sdk/anthropic';
import { ChatAnthropic } from '@langchain/anthropic';
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
} from '@novu/framework';
import { agent as aiSdkAgent, toModelMessages } from '@novu/framework/ai-sdk';
import { agent as langchainAgent } from '@novu/framework/langchain';
import { generateText, stepCountIs, tool as aiTool } from 'ai';
import z from 'zod';
import { cityOf, ScriptedChatModel, scriptedAiSdkModel } from './scripted-models';

/**
 * One agent per self-hosted runtime: plain `agent()` (custom code), the AI SDK adapter and
 * the LangChain adapter. With `ANTHROPIC_API_KEY` the adapters run on Claude Haiku, without
 * it on the scripted models. Each one gates `get_weather` behind a tool approval.
 */
const realModel = Boolean(process.env.ANTHROPIC_API_KEY);
const MODEL = 'claude-haiku-4-5';
const SYSTEM = 'You are a Novu playground agent. Use get_weather for weather questions. Keep answers to one short sentence.';
const weather = (city: string) => `Sunny, 21°C in ${city}`;

function demoCard() {
  return Card({
    title: 'Demo card',
    children: [
      CardText('Buttons, a select, a link, a table and a chart.'),
      Table({
        headers: ['Channel', 'Sent'],
        rows: [
          ['email', '12'],
          ['sms', '3'],
        ],
      }),
      Chart({
        title: 'Sends',
        chart: {
          type: 'pie',
          segments: [
            { label: 'email', value: 12 },
            { label: 'sms', value: 3 },
          ],
        },
      }),
      CardLink({ url: 'https://docs.novu.co', label: 'Novu docs' }),
      Divider(),
      Actions([
        Button({ id: 'pick', label: 'Pick me', value: 'blue', style: 'primary' }),
        Select({
          id: 'plan',
          label: 'Plan',
          options: [SelectOption({ label: 'Free', value: 'free' }), SelectOption({ label: 'Pro', value: 'pro' })],
        }),
      ]),
    ],
  });
}

/**
 * Commands: `card`, `weather <city>`, `remember <note>`, `recall`, `notify <name>`
 * (triggers `all-channels-workflow`) and `done` (resolves). Anything else is echoed.
 */
export const customCodeAgent = agent('custom-code-agent', {
  onMessage: async (message, ctx) => {
    const text = message.text.trim();
    const command = text.toLowerCase();
    if (command === 'card') return demoCard();
    if (command.startsWith('weather')) {
      await ctx.toolApproval.request({ id: `weather-${Date.now()}`, name: 'get_weather', input: { city: cityOf(text) } });

      return;
    }
    if (command.startsWith('remember ')) {
      ctx.metadata.set('note', text.slice('remember '.length));

      return `Noted: ${text.slice('remember '.length)}`;
    }
    if (command === 'recall') return `You asked me to remember: ${ctx.metadata.get('note') ?? 'nothing'}`;
    if (command.startsWith('notify')) {
      ctx.trigger('all-channels-workflow', {
        payload: { name: text.slice('notify'.length).trim() || 'Agent', skipPush: true },
      });

      return 'Triggered all-channels-workflow';
    }
    if (command === 'done') {
      ctx.resolve('Resolved from the playground');

      return 'Resolving';
    }

    return `custom-code echo: ${text} (subscriber ${ctx.subscriber?.subscriberId}, ${ctx.history.length} history entries)`;
  },
  onAction: (action) => `Clicked ${action.id}${action.value ? ` = ${action.value}` : ''}`,
  onToolApproval: ({ toolCall, approved }) =>
    approved ? weather(String((toolCall.input as { city?: string }).city)) : `Skipped ${toolCall.name}`,
});

export const aiSdkRuntimeAgent = aiSdkAgent('ai-sdk-agent', async (_message, ctx) =>
  generateText({
    model: realModel ? anthropic(MODEL) : scriptedAiSdkModel,
    system: SYSTEM,
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

const getWeather = langchainTool(async ({ city }) => weather(city), {
  name: 'get_weather',
  description: 'Current weather for a city',
  schema: z.object({ city: z.string() }),
});

export const langchainRuntimeAgent = langchainAgent('langchain-agent', () => ({
  model: realModel ? new ChatAnthropic({ model: MODEL }) : new ScriptedChatModel({}),
  tools: [getWeather],
  system: SYSTEM,
  needsApproval: (toolCall) => toolCall.name === 'get_weather',
}));
