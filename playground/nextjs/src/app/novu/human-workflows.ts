import {
  Actions,
  Button,
  Card,
  CardText,
  HITL_APPROVE_WORKFLOW_ID,
  HITL_ASK_WORKFLOW_ID,
  HITL_CHOOSE_WORKFLOW_ID,
  workflow,
} from '@novu/framework/next';
import z from 'zod';

const OPTION_LETTERS = 'ABCDEFGHIJ';

const fromSchema = z.string().optional();
const ttlSchema = z.string().default('24h');

function requestedBy(from?: string) {
  return from ? `Requested by ${from}` : undefined;
}

function optionLetter(index: number) {
  return OPTION_LETTERS[index] ?? String(index + 1);
}

function respondedBySuffix(data: Record<string, unknown> | undefined): string {
  return typeof data?.respondedBy === 'string' && data.respondedBy ? ` by ${data.respondedBy}` : '';
}

function waitOutcomeLine(
  status: string,
  data: Record<string, unknown> | undefined,
  labels: { approved: string; denied: string }
): string {
  if (status !== 'resumed') {
    return '⏱ Expired';
  }

  const by = respondedBySuffix(data);
  const verdict = typeof data?.verdict === 'string' ? data.verdict : '';

  if (verdict === 'deny') {
    return `⛔ ${labels.denied}${by}`;
  }

  if (verdict.startsWith('option-')) {
    const value = typeof data?.value === 'string' ? data.value : verdict;

    return `✅ Selected **${value}**${by}`;
  }

  return `✅ ${labels.approved}${by}`;
}

export const askWorkflow = workflow(
  HITL_ASK_WORKFLOW_ID,
  async ({ step, payload }) => {
    const subtitle = requestedBy(payload.from);
    const prompt = `❓ ${payload.question}`;
    const hint = '_Reply to this message to answer._';

    await step.chat('send-question', async () => {
      return {
        body: `${prompt}\n\n${hint}`,
        card: Card({
          title: prompt,
          ...(subtitle ? { subtitle } : {}),
          children: [CardText(hint)],
        }),
      };
    });

    const wait = await step.wait('await-response', async () => {
      return {
        expiresIn: payload.ttl,
      };
    });

    const statusLine = wait.status === 'resumed' ? `✅ Answered${respondedBySuffix(wait.data)}` : '⏱ Expired';

    await step.chat(
      'update-question',
      async () => {
        return {
          body: `${prompt}\n\n${statusLine}`,
          card: Card({
            title: prompt,
            ...(subtitle ? { subtitle } : {}),
            children: [CardText(statusLine)],
          }),
        };
      },
      { updateStepId: 'send-question' }
    );
  },
  {
    payloadSchema: z.object({
      question: z.string().default('Which environment should I deploy to?'),
      from: fromSchema,
      ttl: ttlSchema,
    }),
  }
);

export const approveWorkflow = workflow(
  HITL_APPROVE_WORKFLOW_ID,
  async ({ step, payload }) => {
    const subtitle = requestedBy(payload.from);

    await step.chat('send-approval', async () => {
      return {
        body: payload.action,
        card: Card({
          title: payload.action,
          ...(subtitle ? { subtitle } : {}),
          children: [
            Actions([
              Button({ id: 'deny', label: 'Deny', style: 'default' }),
              Button({ id: 'approve', label: 'Approve', style: 'primary' }),
            ]),
          ],
        }),
      };
    });

    const wait = await step.wait('await-response', async () => {
      return {
        expiresIn: payload.ttl,
      };
    });

    const statusLine = waitOutcomeLine(wait.status, wait.data, { approved: 'Approved', denied: 'Denied' });

    await step.chat(
      'update-approval',
      async () => {
        return {
          body: `${payload.action}\n\n${statusLine}`,
          card: Card({
            title: payload.action,
            ...(subtitle ? { subtitle } : {}),
            children: [CardText(statusLine)],
          }),
        };
      },
      { updateStepId: 'send-approval' }
    );
  },
  {
    payloadSchema: z.object({
      action: z.string().default('Delete 342 stale records from prod?'),
      from: fromSchema,
      ttl: ttlSchema,
    }),
  }
);

export const chooseWorkflow = workflow(
  HITL_CHOOSE_WORKFLOW_ID,
  async ({ step, payload }) => {
    const subtitle = requestedBy(payload.from);
    // Discover runs execute with an empty payload, so schema defaults are not applied.
    const options = payload.options ?? ['canary', 'blue-green'];
    const question = payload.question ?? 'Pick a release strategy';
    const optionsList = options.map((label, index) => `**${optionLetter(index)}.** ${label}`).join('\n');

    await step.chat('send-choices', async () => {
      return {
        body: `${question}\n\n${optionsList}`,
        card: Card({
          title: question,
          ...(subtitle ? { subtitle } : {}),
          children: [
            CardText(optionsList),
            Actions(
              options.map((label, index) =>
                Button({
                  id: `option-${index}`,
                  label: optionLetter(index),
                  value: label,
                  style: 'default',
                })
              )
            ),
          ],
        }),
      };
    });

    const wait = await step.wait('await-response', async () => {
      return {
        expiresIn: payload.ttl,
      };
    });

    const statusLine = waitOutcomeLine(wait.status, wait.data, { approved: 'Chosen', denied: 'Denied' });

    await step.chat(
      'update-choices',
      async () => {
        return {
          body: `${question}\n\n${statusLine}`,
          card: Card({
            title: question,
            ...(subtitle ? { subtitle } : {}),
            children: [CardText(statusLine)],
          }),
        };
      },
      { updateStepId: 'send-choices' }
    );
  },
  {
    payloadSchema: z.object({
      question: z.string().default('Pick a release strategy'),
      options: z.array(z.string()).min(2).max(10).default(['canary', 'blue-green']),
      from: fromSchema,
      ttl: ttlSchema,
    }),
  }
);

export const tellWorkflow = workflow(
  'tell',
  async ({ step, payload }) => {
    const subtitle = requestedBy(payload.from);

    await step.chat('send-message', async () => {
      return {
        body: payload.message,
        card: Card({
          title: payload.message,
          ...(subtitle ? { subtitle } : {}),
          children: [],
        }),
      };
    });
  },
  {
    payloadSchema: z.object({
      message: z.string().default('Nightly build finished — 0 failures.'),
      from: fromSchema,
    }),
  }
);
