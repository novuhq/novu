type EmailStepConfig = {
  template: string;
  subject?: string;
};

function escapeString(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/\r/g, '\\r')
    .replace(/\n/g, '\\n')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}

export function generateStepFile(
  stepId: string,
  workflowId: string,
  templateImportPath: string,
  emailConfig: EmailStepConfig
): string {
  const defaultSubject = emailConfig.subject || 'No Subject';

  return `import { step } from '@novu/framework/step-resolver';
import { render } from '@react-email/components';
import EmailTemplate from '${escapeString(templateImportPath)}';

export const workflowId = '${escapeString(workflowId)}';

export default step.email('${escapeString(stepId)}', async (controls, { payload, subscriber, context, steps }) => ({
  subject: controls.subject ?? payload.subject ?? '${escapeString(defaultSubject)}',
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
