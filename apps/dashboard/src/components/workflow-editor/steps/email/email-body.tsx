import { useFormContext, useWatch } from 'react-hook-form';
import { EmailBodyHtml } from './email-body-html';
import { EmailBodyMaily } from './email-body-maily';

export const EmailBody = () => {
  const { control } = useFormContext();
  const editorType = useWatch({ name: 'editorType', control });

  if (editorType === 'html') {
    return <EmailBodyHtml />;
  }

  return <EmailBodyMaily />;
};
