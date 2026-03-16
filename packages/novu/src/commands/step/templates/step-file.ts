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
        payload={payload}
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
          <p>\${payload.actorName} made a change to <strong>\${payload.resourceName}</strong>.</p>
          <p><a href="\${payload.ctaUrl}">View details</a></p>
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
    }),
    // skip: (_controls, { payload }) => !payload.ctaUrl,
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
    body: \`Hi \${subscriber.firstName ?? 'there'}, \${payload.actorName} updated \${payload.resourceName}. Reply STOP to unsubscribe.\`,
  }),
  {
    controlSchema: z.object({}),
    // skip: (_controls, { payload }) => !payload.actorName,
  }
);
`;
}

export function generatePushStepFile(stepId: string): string {
  return `import { step } from '@novu/framework/step-resolver';
import { z } from 'zod';

export default step.push(
  '${escapeString(stepId)}',
  async (controls, { payload }) => ({
    subject: controls.title,
    body: \`\${payload.actorName} made an update to \${payload.resourceName}\`,
  }),
  {
    controlSchema: z.object({
      title: z.string().default('New activity'),
    }),
    // skip: (_controls, { payload }) => !payload.actorName,
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
    body: \`\${payload.actorName} mentioned \${subscriber.firstName ?? 'you'} in \${payload.resourceName}\`,
  }),
  {
    controlSchema: z.object({}),
    // skip: (_controls, { payload }) => !payload.actorName,
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
    body: \`\${payload.actorName} made a change to \${payload.resourceName}\`,
    // avatar: subscriber.avatar,
    primaryAction: {
      label: controls.ctaLabel,
      redirect: { url: controls.ctaUrl, target: '_blank' },
    },
    // secondaryAction: { label: 'Dismiss' },
    // data: { resourceName: payload.resourceName },
  }),
  {
    controlSchema: z.object({
      subject: z.string().default('New activity'),
      ctaLabel: z.string().default('View details'),
      ctaUrl: z.string().default('/'),
    }),
    // skip: (_controls, { payload }) => !payload.actorName,
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
