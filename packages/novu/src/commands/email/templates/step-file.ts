import type { EmailStepConfig } from '../config/schema';

function escapeString(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

export function generateStepFile(
  stepId: string,
  workflowId: string,
  templateImportPath: string,
  emailConfig: EmailStepConfig
): string {
  const defaultSubject = emailConfig.subject || 'No Subject';

  return `import { render } from '@react-email/components';
import EmailTemplate from '${escapeString(templateImportPath)}';

export const stepId = '${escapeString(stepId)}';
export const workflowId = '${escapeString(workflowId)}';
export const type = 'email';

export default async function({ payload, subscriber, context, steps }) {
  return {
    subject: payload.subject || '${escapeString(defaultSubject)}',
    body: await render(
      <EmailTemplate
        {...payload}
        subscriber={subscriber}
        context={context}
        steps={steps}
      />
    ),
  };
}
`;
}
