function escapeString(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/\r/g, '\\r')
    .replace(/\n/g, '\\n')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}

export function generateReactEmailStepFile(stepId: string, templateImportPath: string): string {
  return `import { step } from '@novu/framework/step-resolver';
import { render } from '@react-email/components';
import { z } from 'zod';
import EmailTemplate from '${escapeString(templateImportPath)}';

export default step.email(
  '${escapeString(stepId)}',
  async (controls, { payload, subscriber, steps }) => ({
    subject: controls.subject,
    body: await render(
      <EmailTemplate
        controls={controls}
        subscriber={subscriber}
        steps={steps}
      />
    ),
  }),
  {
    controlSchema: z.object({
      subject: z.string().default('You have a new notification'),
    }),
  }
);
`;
}

export function generateEmailStepFile(stepId: string): string {
  return `import { step } from '@novu/framework/step-resolver';
import { z } from 'zod';

export default step.email(
  '${escapeString(stepId)}',
  async (controls, { payload, subscriber }) => ({
    subject: controls.subject,
    body: \`
      <html>
        <body>
          <h1>\${controls.heading}</h1>
          <p>Hi \${subscriber.firstName ?? 'there'},</p>
          <p>\${controls.body}</p>
          <p><a href="\${controls.ctaUrl}">View details</a></p>
        </body>
      </html>
    \`,
    // Optionally override the sender for this step:
    // from: { email: 'noreply@example.com', name: 'My App' },
  }),
  {
    controlSchema: z.object({
      subject: z.string().default('You have a new notification'),
      heading: z.string().default('New activity'),
      body: z.string().default('You have a new message.'),
      ctaUrl: z.string().default('/'),
    }),
    // skip: (_controls, { subscriber }) => !subscriber.email,
  }
);
`;
}

export function generateSmsStepFile(stepId: string): string {
  return `import { step } from '@novu/framework/step-resolver';
import { z } from 'zod';

export default step.sms(
  '${escapeString(stepId)}',
  async (controls, { payload, subscriber }) => ({
    body: \`Hi \${subscriber.firstName ?? 'there'}, \${controls.message}\`,
  }),
  {
    controlSchema: z.object({
      message: z.string().default('You have a new notification. Reply STOP to unsubscribe.'),
    }),
    // skip: (_controls, { subscriber }) => !subscriber.phone,
  }
);
`;
}

export function generatePushStepFile(stepId: string): string {
  return `import { step } from '@novu/framework/step-resolver';
import { z } from 'zod';

export default step.push(
  '${escapeString(stepId)}',
  async (controls, { payload, subscriber }) => ({
    subject: controls.title,
    body: controls.body,
  }),
  {
    controlSchema: z.object({
      title: z.string().default('New activity'),
      body: z.string().default('You have a new notification.'),
    }),
    // skip: (_controls, { subscriber }) => !subscriber.channels?.push,
  }
);
`;
}

export function generateChatStepFile(stepId: string): string {
  return `import { step } from '@novu/framework/step-resolver';
import { z } from 'zod';

export default step.chat(
  '${escapeString(stepId)}',
  async (controls, { payload, subscriber }) => ({
    body: \`Hi \${subscriber.firstName ?? 'there'}, \${controls.message}\`,
  }),
  {
    controlSchema: z.object({
      message: z.string().default('You have a new message.'),
    }),
    // skip: (_controls, { subscriber }) => !subscriber.channels?.chat,
  }
);
`;
}

export function generateInAppStepFile(stepId: string): string {
  return `import { step } from '@novu/framework/step-resolver';
import { z } from 'zod';

export default step.inApp(
  '${escapeString(stepId)}',
  async (controls, { payload, subscriber }) => ({
    subject: controls.subject,
    body: controls.body,
    // avatar: subscriber.avatar,
    primaryAction: {
      label: controls.ctaLabel,
      redirect: { url: controls.ctaUrl, target: '_blank' },
    },
    // secondaryAction: { label: 'Dismiss' },
  }),
  {
    controlSchema: z.object({
      subject: z.string().default('New activity'),
      body: z.string().default('You have a new notification.'),
      ctaLabel: z.string().default('View details'),
      ctaUrl: z.string().default('/'),
    }),
    // skip: (_controls, { subscriber }) => !subscriber.channels?.in_app,
  }
);
`;
}

const STEP_GENERATORS: Record<string, (stepId: string) => string> = {
  email: generateEmailStepFile,
  sms: generateSmsStepFile,
  push: generatePushStepFile,
  chat: generateChatStepFile,
  in_app: generateInAppStepFile,
};

export function generateStepFileForType(stepId: string, stepType: string): string {
  const generator = STEP_GENERATORS[stepType];
  if (!generator) {
    throw new Error(`No generator available for step type '${stepType}'.`);
  }

  return generator(stepId);
}
