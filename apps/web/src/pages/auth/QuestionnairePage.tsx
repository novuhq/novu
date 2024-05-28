import AuthLayout from '../../components/layout/components/AuthLayout';
import { QuestionnaireForm } from './components/QuestionnaireForm';
import { useVercelIntegration } from '../../hooks';
import SetupLoader from './components/SetupLoader';
import { FeatureFlagsKeysEnum } from '@novu/shared';
import { useFeatureFlag, HUBSPOT_PORTAL_ID } from '@novu/shared-web';
import { HubspotSignupForm } from './components/HubspotSignupForm';

export default function QuestionnairePage() {
  // TODO: Remove vercel integration logic from this page
  const { isLoading } = useVercelIntegration();
  const isHubspotFormFeatureFlagEnabled = useFeatureFlag(FeatureFlagsKeysEnum.IS_HUBSPOT_ONBOARDING_ENABLED);
  const isHubspotEnabled = HUBSPOT_PORTAL_ID && isHubspotFormFeatureFlagEnabled;

  if (isLoading) {
    <SetupLoader title="Loading..." />;
  }

  return (
    <AuthLayout
      title="Customize your experience"
      description={!isHubspotEnabled ? 'Your answers can decrease the time to get started' : ''}
    >
      {isHubspotEnabled ? <HubspotSignupForm /> : <QuestionnaireForm />}
    </AuthLayout>
  );
}
