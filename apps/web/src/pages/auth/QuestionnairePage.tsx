import AuthLayout from '../../components/layout/components/AuthLayout';
import AuthContainer from '../../components/layout/components/AuthContainer';
import { QuestionnaireForm } from './components/QuestionnaireForm';
import { useVercelIntegration } from '../../hooks';
import SetupLoader from './components/SetupLoader';
import { ENV, IS_DOCKER_HOSTED, useFeatureFlag } from '@novu/shared-web';
import { HubspotSignupForm } from './components/HubspotSignupForm';
import { FeatureFlagsKeysEnum } from '@novu/shared';
import { When } from '@novu/design-system';

export default function QuestionnairePage() {
  const { isLoading } = useVercelIntegration();
  const isHubspotFormEnabled = useFeatureFlag(FeatureFlagsKeysEnum.IS_HUBSPOT_ONBOARDING_ENABLED);
  const isNovuProd = !IS_DOCKER_HOSTED && ENV === 'production';

  const shouldUseHubspotForm = isHubspotFormEnabled && isNovuProd;

  return (
    <AuthLayout>
      {isLoading ? (
        <SetupLoader title="Loading..." />
      ) : (
        <AuthContainer
          title="Customize your experience"
          description={!shouldUseHubspotForm ? 'Your answers can decrease the time to get started' : ''}
        >
          <When truthy={shouldUseHubspotForm}>
            <HubspotSignupForm />
          </When>
          <When truthy={!shouldUseHubspotForm}>
            <QuestionnaireForm />
          </When>
        </AuthContainer>
      )}
    </AuthLayout>
  );
}
