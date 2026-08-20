import { Card, CardText, workflow } from '@novu/framework/next';
import z from 'zod';

/** Phrase the agent looks for in conversation history to recognize this thread. */
export const USAGE_LIMIT_NOTICE = 'hit its usage limit';

/**
 * Notify an admin in Slack when an org hits its usage limit.
 *
 * Trigger with `agentId: 'novu-agent'` so chat is sent as that agent. A reply
 * in-thread starts the approve workflow (also routed through the same agent).
 */
export const usageLimitWorkflow = workflow(
  'usage-limit',
  async ({ step, payload }) => {
    const title = `<@${payload.botUserId}> ${payload.orgName} ${USAGE_LIMIT_NOTICE}`;
    const body =
      `${payload.orgName} used **${payload.usage}** of **${payload.limit}** this period.\n\n` +
      `_Reply in this thread to request a limit increase._`;

    await step.chat('notify-admin', async () => {
      return {
        body: `${title}\n\n${body}`,
        card: Card({
          title,
          subtitle: 'Novu usage',
          children: [CardText(body)],
        }),
      };
    });
  },
  {
    name: 'Usage limit',
    description:
      'Slack the admin when an org hits its usage limit. Trigger with agentId novu-agent so a reply starts approve.',
    payloadSchema: z.object({
      orgName: z.string().default('Acme'),
      usage: z.string().default('10,241 events'),
      limit: z.string().default('10,000 events'),
      botUserId: z.string().default('U0BQA6FST8A'),
    }),
  }
);
