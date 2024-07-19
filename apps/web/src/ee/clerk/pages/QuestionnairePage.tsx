import { useVercelIntegration, useFeatureFlag } from '../../../hooks';
import { FeatureFlagsKeysEnum } from '@novu/shared';
import AuthLayout from '../../../components/layout/components/AuthLayout';
import SetupLoader from '../../../pages/auth/components/SetupLoader';
import { HUBSPOT_PORTAL_ID } from '../../../config/index';
import { QuestionnaireForm } from '../components/QuestionnaireForm';
import { HubspotSignupForm } from '../../../pages/auth/components/HubspotSignupForm';

export default function QuestionnairePage() {
  // TODO: Remove vercel integration logic from this page
  const { isLoading } = useVercelIntegration();
  const isHubspotFormFeatureFlagEnabled = useFeatureFlag(FeatureFlagsKeysEnum.IS_HUBSPOT_ONBOARDING_ENABLED);
  const isHubspotEnabled = HUBSPOT_PORTAL_ID && isHubspotFormFeatureFlagEnabled;

  if (isLoading) {
    return <SetupLoader title="Loading..." />;
  }

  return (
    <AuthLayout title="Tell us more about you">
      {isHubspotEnabled ? <HubspotSignupForm /> : <QuestionnaireForm />}
    </AuthLayout>
  );
}
