import { PageMeta } from '@novu/design-system';
import { FeatureFlagsKeysEnum } from '@novu/shared';
import { useVercelIntegration, useFeatureFlag } from '../../../hooks';
import AuthLayout from '../../../components/layout/components/AuthLayout';
import SetupLoader from '../../../pages/auth/components/SetupLoader';
import { HUBSPOT_PORTAL_ID } from '../../../config/index';
import { QuestionnaireForm } from '../components/QuestionnaireForm';
import { HubspotSignupForm } from '../../../pages/auth/components/HubspotSignupForm';

const title = 'Tell us more about you';

export default function QuestionnairePage() {
  // TODO: Remove vercel integration logic from this page
  const { isLoading } = useVercelIntegration();
  const isHubspotFormFeatureFlagEnabled = useFeatureFlag(FeatureFlagsKeysEnum.IS_HUBSPOT_ONBOARDING_ENABLED);
  const isHubspotEnabled = HUBSPOT_PORTAL_ID && isHubspotFormFeatureFlagEnabled;

  if (isLoading) {
    return <SetupLoader title="Loading..." />;
  }

  return (
    <AuthLayout title={title}>
      <PageMeta title={title} />
      {isHubspotEnabled ? <HubspotSignupForm /> : <QuestionnaireForm />}
    </AuthLayout>
  );
}
