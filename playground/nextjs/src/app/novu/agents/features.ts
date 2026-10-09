import {
  Actions,
  type AgentAction,
  type AgentHumanResponse,
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
 * Everything the playground agents can do, written once over `ctx`. `custom-code-agent` calls these
 * from typed commands; `ai-sdk-agent` and `langchain-agent` get them as tools (`agentTools`) and
 * Claude decides when to call them.
 */

export const MODEL = 'claude-haiku-4-5';
export const SYSTEM = [
  'You are the Novu playground agent.',
  'Use your tools to show cards, remember notes, send notifications, ask people for approval or input,',
  'post notices, close the conversation and check the weather.',
  'When the user attaches an image or a PDF, describe or summarize it.',
  'Keep answers to one or two short sentences.',
].join(' ');

const DEPLOY_QUESTION = 'Deploy v2.4.1 to production?';

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

/** `to` takes subscriber IDs; without it the card goes to this conversation. */
export function approve(ctx: AgentMessageContext, question = DEPLOY_QUESTION, to?: string[]) {
  ctx.approve(question, to?.length ? { to } : undefined);

  return 'Sent an approval card. Approve or deny it to continue.';
}

export function approveWithCustomCard(ctx: AgentMessageContext) {
  ctx.approve({
    render: ({ actionIds }) =>
      Card({
        title: DEPLOY_QUESTION,
        subtitle: 'From Deployment Agent',
        children: [
          Actions([
            Button({ label: 'Yes', id: actionIds.approve, actionType: 'action', style: 'primary' }),
            Button({ label: 'No', id: actionIds.deny, actionType: 'action' }),
          ]),
        ],
      }),
  });

  return 'Sent a custom approval card. Approve or deny it to continue.';
}

export function approveWithCustomChrome(ctx: AgentMessageContext) {
  ctx.approve({
    card: {
      title: DEPLOY_QUESTION,
      subtitle: 'From Deployment Agent',
      body: 'This is a custom chrome approval card.',
      approveLabel: 'Yes',
      denyLabel: 'No',
    },
  });

  return 'Sent a custom chrome approval card. Approve or deny it to continue.';
}

export function ask(ctx: AgentMessageContext, question = 'What environment should we deploy to?') {
  ctx.ask(question);

  return 'Asked a question. Reply in this thread.';
}

export function choose(
  ctx: AgentMessageContext,
  question = 'Which region should we deploy to?',
  options = ['us-east', 'eu-west', 'ap-south']
) {
  ctx.choose(question, options);

  return 'Sent a card with options. Pick one to continue.';
}

export function tell(ctx: AgentMessageContext, text = 'Deploy finished. v2.4.1 is live.') {
  ctx.tell(text);

  return 'Posted a one-way notice. Nothing to wait on.';
}

export const weather = (city: string) => `Sunny, 21°C in ${city}`;

export const describeAction = (action: AgentAction) => `Clicked ${action.id}${action.value ? ` = ${action.value}` : ''}`;

export function formatHumanResponse(response: AgentHumanResponse) {
  if (response.expired) return `That ${response.kind} request expired before I got an answer.`;
  const detail = response.text ?? response.optionId;

  return detail
    ? `Got it — ${response.kind} is **${response.status}** (${detail}).`
    : `Got it — ${response.kind} is **${response.status}**.`;
}

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
  const recipients = z
    .array(z.string())
    .optional()
    .describe('Subscriber IDs to ask instead. Leave empty to ask the current user, which is the usual case');

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
    request_approval: defineTool(
      'Ask for approval of an action with an Approve/Deny card. Sent to the current user unless `to` is given',
      z.object({ question: z.string(), to: recipients }),
      ({ question, to }) => approve(ctx, question, to)
    ),
    ask_user: defineTool('Ask a free-text question and wait for the answer', z.object({ question: z.string() }), ({ question }) =>
      ask(ctx, question)
    ),
    choose_option: defineTool(
      'Let the user pick one of several options',
      z.object({ question: z.string(), options: z.array(z.string()).min(2) }),
      ({ question, options }) => choose(ctx, question, options)
    ),
    tell: defineTool('Post a one-way notice that needs no answer', z.object({ text: z.string() }), ({ text }) =>
      tell(ctx, text)
    ),
    get_weather: defineTool(
      'Current weather for a city',
      z.object({ city: z.string() }),
      ({ city }) => weather(city),
      true
    ),
  };
}
