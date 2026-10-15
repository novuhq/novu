import {
  Actions,
  type AgentAction,
  type AgentMessage,
  type AgentMessageContext,
  type AgentMessageUpdatedContext,
  type AgentReaction,
  type AgentResolveContext,
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
 * What every playground agent can do, written once over `ctx`, plus `channelHandlers` for the events
 * every agent handles the same way. `custom-code-agent` calls these from
 * typed commands; `ai-sdk-agent` and `langchain-agent` get them as tools (`agentTools`) and Claude
 * decides when to call them. HITL (`ctx.approve`/`ask`/`choose`/`tell`) is only in `custom-code-agent`:
 * the AI SDK and LangChain adapters don't call the model again after the answer.
 */

export const MODEL = 'claude-haiku-4-5';
export const SYSTEM = [
  'You are the Novu playground agent.',
  'Use your tools to show cards, remember notes, send notifications, send files, react, quote, show progress,',
  'emit events, close the conversation and check the weather.',
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

export async function showProgress(ctx: AgentMessageContext) {
  await ctx.typing('Working on it…');
  const handle = await ctx.reply('Working on it…');
  await handle.edit('Done. This message was edited after it was sent.');

  return 'Showed a typing indicator, then edited a reply';
}

export async function replyThenDelete(ctx: AgentMessageContext) {
  const handle = await ctx.reply('This message deletes itself.');
  await handle.delete();

  return 'Sent a message, then deleted it';
}

export async function sendFile(ctx: AgentMessageContext) {
  await ctx.reply('Here is the sends report.', {
    files: [
      { filename: 'sends.csv', mimeType: 'text/csv', data: new TextEncoder().encode('channel,sent\nemail,12\nsms,3\n') },
    ],
  });

  return 'Sent sends.csv';
}

export async function quote(ctx: AgentMessageContext, message: AgentMessage) {
  await ctx.reply(`You said: ${message.text}`, { quoteReply: message });

  return 'Quoted the message';
}

type Emoji = Parameters<AgentMessageContext['addReaction']>[1];

export function react(ctx: AgentMessageContext, message: AgentMessage, emoji: Emoji = 'thumbs_up') {
  ctx.addReaction(message.platformMessageId, emoji);

  return `Reacted with ${emoji}`;
}

export async function emitProgress(ctx: AgentMessageContext) {
  await ctx.emit({ name: 'progress', data: { percent: 100 } });

  return 'Emitted a custom progress event';
}

export const describeAction = (action: AgentAction) => `Clicked ${action.id}${action.value ? ` = ${action.value}` : ''}`;

/**
 * Handlers for what the user does to the conversation rather than in it, shared by every agent. Web chat
 * users can't react, edit or delete, so only a channel like Slack fires the first three.
 */
export const channelHandlers = {
  onReaction: (reaction: AgentReaction) => `Saw ${reaction.emoji.name} ${reaction.added ? 'added' : 'removed'}`,
  onMessageUpdated: (message: AgentMessage, ctx: AgentMessageUpdatedContext) =>
    `You edited "${ctx.previousMessage?.text ?? '?'}" to "${message.text}"`,
  onMessageDeleted: () => 'You deleted a message',
  // Runs after the conversation is resolved: a follow-up notification named after the saved note.
  onResolve: (ctx: AgentResolveContext) => {
    ctx.trigger('all-channels-workflow', {
      payload: { name: `resolved ${ctx.metadata.get('note') ?? ''}`.trim(), skipPush: true },
    });
  },
  onAction: (action: AgentAction) => describeAction(action),
};

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

export function agentTools(ctx: AgentMessageContext, message: AgentMessage): Record<string, AgentTool> {
  return {
    show_progress: defineTool('Show a typing indicator, then a reply that gets edited', z.object({}), () =>
      showProgress(ctx)
    ),
    send_file: defineTool('Send the user a CSV report file', z.object({}), () => sendFile(ctx)),
    quote_message: defineTool("Reply quoting the user's message", z.object({}), () => quote(ctx, message)),
    react: defineTool("React to the user's message with a thumbs up", z.object({}), () => react(ctx, message)),
    emit_progress: defineTool('Emit a custom progress event to the client app', z.object({}), () =>
      emitProgress(ctx)
    ),
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
