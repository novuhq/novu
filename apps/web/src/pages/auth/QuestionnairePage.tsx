import AuthLayout from '../../components/layout/components/AuthLayout';
import AuthContainer from '../../components/layout/components/AuthContainer';
import { QuestionnaireForm } from './components/QuestionnaireForm';
import { useVercelIntegration } from '../../hooks';
import SetupLoader from './components/SetupLoader';
import { ENV, IS_DOCKER_HOSTED } from '@novu/shared-web';
import { HubspotSignupForm } from './components/HubspotSignupForm';

export default function QuestionnairePage() {
  const { isLoading } = useVercelIntegration();
  const isNovuProd = !IS_DOCKER_HOSTED && ENV === 'production';

  return (
    <AuthLayout>
      {isLoading ? (
        <SetupLoader title="Loading..." />
      ) : (
        <AuthContainer
          title="Customize your experience"
          description={!isNovuProd ? 'Your answers can decrease the time to get started' : ''}
        >
          {!isNovuProd ? <QuestionnaireForm /> : <HubspotSignupForm />}
        </AuthContainer>
      )}
    </AuthLayout>
  );
}
