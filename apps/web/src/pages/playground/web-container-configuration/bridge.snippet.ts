export const BRIDGE_CODE = `import express from 'express';
import { workflow } from '@novu/framework';
import { serve } from '@novu/framework/express';
import { renderEmail } from './react-email';
import { z } from 'zod';

const helloWorld = workflow('hello-world', async ({ step, payload }) => {
    // Add more steps below this line

    // Email Step definition, other channels are supported (.sms, .chat, .inApp, etc.)
    await step.email('send-email', async (controls) => {
      return {
        subject: controls.subject,
        body: renderEmail(controls)
      };
    },
    {
      /**
       * Controls are the UI elements that are displayed in the step editor.
       * They are used to configure the content and behavior of the step without changing code.
       */
      controlSchema: z.object({
        subject: z.string().default('Welcome to Novu'),
        title: z.string().default('Welcome to Novu'),
        text: z.string()
          .default(
            'This email is generated using Tailwind and React Email. ' +
            'You can change any of the content here using the Step Controls panel'
          ),
        buttonText: z.string().default('Hello World'),

      }),
    });
  },
  {
    /**
     * This is the payload schema for the workflow.
     * Payload is the dynamic data passed to the workflow during the trigger phase.
     */
    payloadSchema: z.object({
      name: z.string().default('John'),
    }),
  }
);

const server = express();
server.use(express.json());

/**
 * Novu Framework exposes a novu endpoint that can be used to serve the workflow definitions.
 * This endpoint should be available over the internet, and is secured by the SDK using your Secret Key.
 */
server.use(serve({ workflows: [helloWorld] }));
server.listen(9999);
`;
