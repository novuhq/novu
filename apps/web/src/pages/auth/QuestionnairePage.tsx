import AuthLayout from '../../components/layout/components/AuthLayout';
import AuthContainer from '../../components/layout/components/AuthContainer';
import { QuestionnaireForm } from './components/QuestionnaireForm';
import { useVercelIntegration } from '../../hooks';
import SetupLoader from './components/SetupLoader';

export default function QuestionnairePage() {
  const { isLoading } = useVercelIntegration();

  return (
    <AuthLayout>
      {isLoading ? (
        <SetupLoader title="Loading..." />
      ) : (
        <AuthContainer
          title="Customize your experience"
          description="Your answers can decrease the time to get started"
        >
          <QuestionnaireForm />
        </AuthContainer>
      )}
    </AuthLayout>
  );
}
