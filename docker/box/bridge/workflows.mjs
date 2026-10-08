// Code-first workflows covering what @novu/framework offers: every channel step, controls and payload
// schemas, skip, tags, preferences, chat cards, delay, custom step outputs, digest and throttle.
// smoke.mjs triggers each of them; the dashboard shows them under Workflows as code-defined.
import { Actions, Card, CardText, Divider, workflow } from '@novu/framework/express';
import { z } from 'zod';

const allChannels = workflow(
  'box-bridge-all-channels',
  async ({ step, payload, subscriber }) => {
    await step.inApp('in-app', async (controls) => ({ subject: controls.subject, body: `${controls.greeting} ${payload.name}` }), {
      controlSchema: z.object({
        subject: z.string().default('From the bridge'),
        greeting: z.string().default('Bridge in-app for'),
      }),
    });
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
          title: 'Box bridge card',
          children: [
            CardText(body),
            Divider(),
            Actions([{ type: 'link-button', id: 'open-box', label: 'Open the box', url: 'http://localhost:14200', style: 'primary' }]),
          ],
        }),
      };
    });
  },
  {
    name: 'Box bridge: all channels',
    description: 'Every channel step from code, with controls, a payload schema and a skipped push',
    tags: ['box', 'bridge'],
    payloadSchema: z.object({ name: z.string().default('Box'), skipPush: z.boolean().default(false) }),
    preferences: { all: { enabled: true }, channels: { push: { enabled: true } } },
  }
);

const delayThenCustom = workflow(
  'box-bridge-delay-custom',
  async ({ step, payload }) => {
    await step.delay('wait', async () => ({ type: 'regular', amount: 5, unit: 'seconds' }));
    const { code } = await step.custom('compute', async () => ({ code: `BOX-${payload.name.toUpperCase()}` }), {
      outputSchema: z.object({ code: z.string() }),
    });
    await step.email('email', async () => ({ subject: `Bridge code ${code}`, body: `<p>Your code is ${code}</p>` }));
  },
  { payloadSchema: z.object({ name: z.string() }), tags: ['box', 'bridge'] }
);

const digest = workflow(
  'box-bridge-digest',
  async ({ step, payload }) => {
    const { events } = await step.digest('collect', async () => ({ amount: 5, unit: 'seconds' }));
    await step.email('email', async () => ({
      subject: `Bridge digest ${payload.run}: ${events.length} events`,
      body: `<p>${events.map((event) => event.payload.n).join(', ')}</p>`,
    }));
  },
  { payloadSchema: z.object({ run: z.string(), n: z.number() }), tags: ['box', 'bridge'] }
);

const throttle = workflow(
  'box-bridge-throttle',
  async ({ step, payload }) => {
    await step.throttle('limit', async () => ({ type: 'fixed', amount: 1, unit: 'minutes', threshold: 1 }));
    await step.inApp('in-app', async () => ({ body: `Bridge throttle ${payload.run} #${payload.n}` }));
  },
  { payloadSchema: z.object({ run: z.string(), n: z.number() }), tags: ['box', 'bridge'] }
);

export const workflows = [allChannels, delayThenCustom, digest, throttle];
