import { FeatureFlagsKeysEnum } from '@novu/shared';
import { useFormContext, useWatch } from 'react-hook-form';
import { useFeatureFlag } from '@/hooks/use-feature-flag';
import { EmailBodyHtml } from './email-body-html';
import { EmailBodyMaily } from './email-body-maily';
import { EmailBodyReactEmail } from './email-body-react-email';

export const EmailBody = () => {
  const { control } = useFormContext();
  const editorType = useWatch({ name: 'editorType', control });
  const rendererType = useWatch({ name: 'rendererType', control });
  const isStepResolverEnabled = useFeatureFlag(FeatureFlagsKeysEnum.IS_STEP_RESOLVER_ENABLED);

  if (editorType === 'html' && rendererType === 'react-email' && isStepResolverEnabled) {
    return <EmailBodyReactEmail />;
  }

  if (editorType === 'html') {
    return <EmailBodyHtml />;
  }

  return <EmailBodyMaily />;
};
