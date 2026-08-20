import { Actions, Card, CardLink, CardText, Divider, Image, workflow } from '@novu/framework/next';
import z from 'zod';

export { approveWorkflow, askWorkflow, chooseWorkflow, tellWorkflow } from './human-workflows';
export { usageLimitWorkflow } from './usage-limit-workflow';

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
