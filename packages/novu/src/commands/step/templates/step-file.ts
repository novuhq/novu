function escapeString(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/\r/g, '\\r')
    .replace(/\n/g, '\\n')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}

type ControlFields = Record<string, { default: string }>;

function zodSchema(fields: ControlFields): string {
  const entries = Object.entries(fields)
    .map(([key, { default: def }]) => `      ${key}: z.string().default('${escapeString(def)}')`)
    .join(',\n');

  return `z.object({\n${entries},\n    })`;
}

function jsonSchema(fields: ControlFields): string {
  const props = Object.entries(fields)
    .map(([key, { default: def }]) => `        ${key}: { type: 'string', default: '${escapeString(def)}' }`)
    .join(',\n');

  return `{\n      type: 'object',\n      properties: {\n${props},\n      },\n      additionalProperties: false,\n    } as const`;
}

function controlSchema(fields: ControlFields, useZod: boolean): string {
  return useZod ? zodSchema(fields) : jsonSchema(fields);
}

function stepImports(useZod: boolean, extras: string[] = []): string {
  const lines = ["import { step } from '@novu/framework/step-resolver';"];

  if (useZod) lines.push("import { z } from 'zod';");

  lines.push(...extras);

  return lines.join('\n');
}

const reactEmailFields: ControlFields = {
  subject: { default: 'You have a new notification' },
};

export function generateReactEmailStepFile(stepId: string, templateImportPath: string, useZod: boolean): string {
  return `${stepImports(useZod, [
    "import { render } from '@react-email/components';",
    `import EmailTemplate from '${escapeString(templateImportPath)}';`,
  ])}

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
    controlSchema: ${controlSchema(reactEmailFields, useZod)},
  }
);
`;
}

const emailFields: ControlFields = {
  subject: { default: 'You have a new notification' },
  heading: { default: 'New activity' },
  body: { default: 'You have a new message.' },
  ctaUrl: { default: '/' },
};

export function generateEmailStepFile(stepId: string, useZod: boolean): string {
  return `${stepImports(useZod)}

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
    controlSchema: ${controlSchema(emailFields, useZod)},
    // skip: (_controls, { subscriber }) => !subscriber.email,
  }
);
`;
}

const smsFields: ControlFields = {
  message: { default: 'You have a new notification. Reply STOP to unsubscribe.' },
};

export function generateSmsStepFile(stepId: string, useZod: boolean): string {
  return `${stepImports(useZod)}

export default step.sms(
  '${escapeString(stepId)}',
  async (controls, { payload, subscriber }) => ({
    body: \`Hi \${subscriber.firstName ?? 'there'}, \${controls.message}\`,
  }),
  {
    controlSchema: ${controlSchema(smsFields, useZod)},
    // skip: (_controls, { subscriber }) => !subscriber.phone,
  }
);
`;
}

const pushFields: ControlFields = {
  title: { default: 'New activity' },
  body: { default: 'You have a new notification.' },
};

export function generatePushStepFile(stepId: string, useZod: boolean): string {
  return `${stepImports(useZod)}

export default step.push(
  '${escapeString(stepId)}',
  async (controls, { payload, subscriber }) => ({
    subject: controls.title,
    body: controls.body,
  }),
  {
    controlSchema: ${controlSchema(pushFields, useZod)},
    // skip: (_controls, { subscriber }) => !subscriber.channels?.push,
  }
);
`;
}

const chatFields: ControlFields = {
  message: { default: 'You have a new message.' },
};

export function generateChatStepFile(stepId: string, useZod: boolean): string {
  return `${stepImports(useZod)}

export default step.chat(
  '${escapeString(stepId)}',
  async (controls, { payload, subscriber }) => ({
    body: \`Hi \${subscriber.firstName ?? 'there'}, \${controls.message}\`,
  }),
  {
    controlSchema: ${controlSchema(chatFields, useZod)},
    // skip: (_controls, { subscriber }) => !subscriber.channels?.chat,
  }
);
`;
}

const inAppFields: ControlFields = {
  subject: { default: 'New activity' },
  body: { default: 'You have a new notification.' },
  ctaLabel: { default: 'View details' },
  ctaUrl: { default: '/' },
};

export function generateInAppStepFile(stepId: string, useZod: boolean): string {
  return `${stepImports(useZod)}

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
    controlSchema: ${controlSchema(inAppFields, useZod)},
    // skip: (_controls, { subscriber }) => !subscriber.channels?.in_app,
  }
);
`;
}

const STEP_GENERATORS: Record<string, (stepId: string, useZod: boolean) => string> = {
  email: generateEmailStepFile,
  sms: generateSmsStepFile,
  push: generatePushStepFile,
  chat: generateChatStepFile,
  in_app: generateInAppStepFile,
};

export function generateStepFileForType(stepId: string, stepType: string, useZod: boolean): string {
  const generator = STEP_GENERATORS[stepType];
  if (!generator) {
    throw new Error(`No generator available for step type '${stepType}'.`);
  }

  return generator(stepId, useZod);
}
