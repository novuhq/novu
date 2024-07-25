export const BRIDGE_CODE = `import express from 'express';
import { workflow } from '@novu/framework';
import { serve } from '@novu/framework/express';

const newWorkflow = workflow(
  'hello-world',
  async ({ step, payload }) => {
    await step.email(
      'send-email',
      async (controls) => {
        return {
          subject: 'This email is about: ' + controls.emailTopic,
          body: 'This notification was triggered from ' + payload.notificationSource,
        };
      },
      {
        controlSchema: {
          type: 'object',
          properties: {
            emailTopic: { type: 'string', default: 'Potato' },
          },
        },
      }
    );
  },
  {
    payloadSchema: {
      type: 'object',
      properties: {
        notificationSource: { type: 'string', default: 'web' },
      },
    },
  }
);
const server = express();
server.use(express.json());
server.use(serve({ workflows: [newWorkflow] }));
server.listen(9999);
`;
