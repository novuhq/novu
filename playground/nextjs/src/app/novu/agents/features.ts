import {
  Actions,
  type AgentAction,
  type AgentMessageContext,
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
import z from 'zod';

/**
 * What every playground agent can do, written once over `ctx`. `custom-code-agent` calls these from
 * typed commands; `ai-sdk-agent` and `langchain-agent` get them as tools (`agentTools`) and Claude
 * decides when to call them. HITL (`ctx.approve`/`ask`/`choose`/`tell`) is only in `custom-code-agent`:
 * the AI SDK and LangChain adapters don't call the model again after the answer.
 */

export const MODEL = 'claude-haiku-4-5';
export const SYSTEM = [
  'You are the Novu playground agent.',
  'Use your tools to show cards, remember notes, send notifications, close the conversation and check the weather.',
  'When the user attaches an image or a PDF, describe or summarize it.',
  'Keep answers to one or two short sentences.',
].join(' ');

export function demoCard() {
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

export async function showCard(ctx: AgentMessageContext) {
  await ctx.reply(demoCard());

  return 'Showed the demo card';
}

export function remember(ctx: AgentMessageContext, note: string) {
  ctx.metadata.set('note', note);

  return `Noted: ${note}`;
}

export function recall(ctx: AgentMessageContext) {
  return `You asked me to remember: ${ctx.metadata.get('note') ?? 'nothing'}`;
}

export function notify(ctx: AgentMessageContext, name: string) {
  ctx.trigger('all-channels-workflow', { payload: { name: name || 'Agent', skipPush: true } });

  return 'Triggered all-channels-workflow';
}

export function resolve(ctx: AgentMessageContext) {
  ctx.resolve('Resolved from the playground');

  return 'Resolving';
}

export const weather = (city: string) => `Sunny, 21°C in ${city}`;

export const describeAction = (action: AgentAction) => `Clicked ${action.id}${action.value ? ` = ${action.value}` : ''}`;

export interface AgentTool {
  description: string;
  schema: z.ZodObject;
  needsApproval?: boolean;
  run: (input: unknown) => Promise<string> | string;
}

function defineTool<S extends z.ZodObject>(
  description: string,
  schema: S,
  run: (input: z.infer<S>) => Promise<string> | string,
  needsApproval = false
): AgentTool {
  return { description, schema, needsApproval, run: run as AgentTool['run'] };
}

export function agentTools(ctx: AgentMessageContext): Record<string, AgentTool> {
  return {
    show_card: defineTool('Show a demo card with a table, a chart, a button and a select', z.object({}), () =>
      showCard(ctx)
    ),
    remember: defineTool('Save a note on this conversation', z.object({ note: z.string() }), ({ note }) =>
      remember(ctx, note)
    ),
    recall: defineTool('Read the note saved on this conversation', z.object({}), () => recall(ctx)),
    notify: defineTool(
      'Send the user a test notification on every channel',
      z.object({ name: z.string().describe('Name to put in the notification') }),
      ({ name }) => notify(ctx, name)
    ),
    resolve: defineTool('Close this conversation when the user is done', z.object({}), () => resolve(ctx)),
    get_weather: defineTool(
      'Current weather for a city',
      z.object({ city: z.string() }),
      ({ city }) => weather(city),
      true
    ),
  };
}
