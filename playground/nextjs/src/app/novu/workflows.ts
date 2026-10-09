import { Actions, Card, CardLink, CardText, Divider, Image, workflow } from '@novu/framework/next';
import z from 'zod';

export const welcomeWorkflow = workflow(
  'welcome-workflow',
  async ({ step, payload }) => {
    await step.chat(
      'send-chat',
      async () => {
        const body = `Hello dear ${payload.userName}! ~~Thanks for trying~~ your first **Novu chat** notification.`;

        return {
          body,
          card: Card({
            title: 'Welcome Code Defined Card!',
            children: [
              CardText(body),
              Divider(),
              Image({
                url: 'https://images.unsplash.com/photo-1780678839543-1abf5a0b8d71?q=80&w=1740&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
                alt: 'Placeholder image',
              }),
              CardLink({
                url: 'https://docs.novu.co',
                label: 'Get started',
              }),
              Actions([
                {
                  type: 'link-button',
                  id: 'get-started',
                  label: 'Get started',
                  url: 'https://docs.novu.co',
                  style: 'primary',
                },
                {
                  type: 'link-button',
                  id: 'view-docs',
                  label: 'View docs',
                  url: 'https://docs.novu.co/framework/typescript/steps/chat',
                  style: 'default',
                },
              ]),
            ],
          }),
        };
      },
      {
        controlSchema: z.object({
          body: z.string().default('We are glad you are here {{userName}}!'),
        }),
      }
    );
  },
  {
    payloadSchema: z.object({
      userName: z.string().default('John Doe'),
    }),
  }
);

export const allChannelsWorkflow = workflow(
  'all-channels-workflow',
  async ({ step, payload, subscriber }) => {
    await step.inApp(
      'in-app',
      async (controls) => ({ subject: controls.subject, body: `${controls.greeting} ${payload.name}` }),
      {
        controlSchema: z.object({
          subject: z.string().default('From the bridge'),
          greeting: z.string().default('Bridge in-app for'),
        }),
      }
    );
    await step.email(
      'email',
      async (controls) => ({ subject: `${controls.subject} ${payload.name}`, body: `<p>Bridge email for ${payload.name}</p>` }),
      { controlSchema: z.object({ subject: z.string().default('Bridge email') }) }
    );
    await step.sms('sms', async () => ({ body: `Bridge SMS for ${payload.name} (${subscriber.subscriberId})` }));
    await step.push('push', async () => ({ subject: 'Bridge push', body: `Bridge push for ${payload.name}` }), {
      skip: () => payload.skipPush,
    });
    await step.chat('chat', async () => {
      const body = `Bridge chat for ${payload.name}`;

      return {
        body,
        card: Card({
          title: 'Bridge chat card',
          children: [
            CardText(body),
            Divider(),
            Actions([
              { type: 'link-button', id: 'docs', label: 'Novu docs', url: 'https://docs.novu.co', style: 'primary' },
            ]),
          ],
        }),
      };
    });
  },
  {
    name: 'All channels',
    description: 'Every channel step from code, with controls, a payload schema and a skippable push',
    tags: ['playground'],
    payloadSchema: z.object({ name: z.string().default('Novu'), skipPush: z.boolean().default(false) }),
    preferences: { all: { enabled: true }, channels: { push: { enabled: true } } },
  }
);

export const delayCustomWorkflow = workflow(
  'delay-custom-workflow',
  async ({ step, payload }) => {
    await step.delay('wait', async () => ({ type: 'regular', amount: 5, unit: 'seconds' }));
    const { code } = await step.custom('compute', async () => ({ code: `CODE-${payload.name.toUpperCase()}` }), {
      outputSchema: z.object({ code: z.string() }),
    });
    await step.email('email', async () => ({ subject: `Bridge code ${code}`, body: `<p>Your code is ${code}</p>` }));
  },
  { payloadSchema: z.object({ name: z.string() }), tags: ['playground'] }
);

export const digestWorkflow = workflow(
  'digest-workflow',
  async ({ step, payload }) => {
    const { events } = await step.digest('collect', async () => ({ amount: 5, unit: 'seconds' }));
    await step.email('email', async () => ({
      subject: `Bridge digest ${payload.run}: ${events.length} events`,
      body: `<p>${events.map((event) => event.payload.n).join(', ')}</p>`,
    }));
  },
  { payloadSchema: z.object({ run: z.string(), n: z.number() }), tags: ['playground'] }
);

export const throttleWorkflow = workflow(
  'throttle-workflow',
  async ({ step, payload }) => {
    await step.throttle('limit', async () => ({ type: 'fixed', amount: 1, unit: 'minutes', threshold: 1 }));
    await step.inApp('in-app', async () => ({ body: `Bridge throttle ${payload.run} #${payload.n}` }));
  },
  { payloadSchema: z.object({ run: z.string(), n: z.number() }), tags: ['playground'] }
);
