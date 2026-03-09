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
import EmailTemplate from '${escapeString(templateImportPath)}';

export default step.email('${escapeString(stepId)}', async (controls, { payload, subscriber, context, steps }) => ({
  subject: 'No Subject',
  body: await render(
    <EmailTemplate
      {...payload}
      subscriber={subscriber}
      context={context}
      steps={steps}
      controls={controls}
    />
  ),
}));
`;
}

export function generateEmailStepFile(stepId: string): string {
  return `import { step } from '@novu/framework/step-resolver';

export default step.email('${escapeString(stepId)}', async (controls, { payload, subscriber, context, steps }) => ({
  subject: 'No Subject',
  body: \`<html><body><p>Hello \${subscriber.firstName ?? 'there'},</p><p>Your message here.</p></body></html>\`,
}));
`;
}

export function generateSmsStepFile(stepId: string): string {
  return `import { step } from '@novu/framework/step-resolver';

export default step.sms('${escapeString(stepId)}', async (controls, { payload, subscriber, context, steps }) => ({
  body: \`Hello \${subscriber.firstName ?? 'there'}, your message here.\`,
}));
`;
}

export function generatePushStepFile(stepId: string): string {
  return `import { step } from '@novu/framework/step-resolver';

export default step.push('${escapeString(stepId)}', async (controls, { payload, subscriber, context, steps }) => ({
  subject: 'New notification',
  body: \`Hello \${subscriber.firstName ?? 'there'}, you have a new notification.\`,
}));
`;
}

export function generateChatStepFile(stepId: string): string {
  return `import { step } from '@novu/framework/step-resolver';

export default step.chat('${escapeString(stepId)}', async (controls, { payload, subscriber, context, steps }) => ({
  body: \`Hello \${subscriber.firstName ?? 'there'}, a message for you.\`,
}));
`;
}

export function generateInAppStepFile(stepId: string): string {
  return `import { step } from '@novu/framework/step-resolver';

export default step.inApp('${escapeString(stepId)}', async (controls, { payload, subscriber, context, steps }) => ({
  subject: 'New notification',
  body: \`Hello \${subscriber.firstName ?? 'there'}, you have a new in-app notification.\`,
}));
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
