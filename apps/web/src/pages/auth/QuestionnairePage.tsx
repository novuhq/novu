import AuthLayout from '../../components/layout/components/AuthLayout';
import AuthContainer from '../../components/layout/components/AuthContainer';
import { QuestionnaireForm } from './components/QuestionnaireForm';
import { useVercelIntegration } from '../../hooks';
import SetupLoader from './components/SetupLoader';
import { IS_DOCKER_HOSTED } from '@novu/shared-web';
import { HubspotSignupForm } from './components/HubspotSignupForm';

export default function QuestionnairePage() {
  const { isLoading } = useVercelIntegration();

  return (
    <AuthLayout>
      {isLoading ? (
        <SetupLoader title="Loading..." />
      ) : (
        <AuthContainer
          title="Customize your experience"
          description={IS_DOCKER_HOSTED ? 'Your answers can decrease the time to get started' : ''}
        >
          {IS_DOCKER_HOSTED ? <QuestionnaireForm /> : <HubspotSignupForm />}
        </AuthContainer>
      )}
    </AuthLayout>
  );
}
