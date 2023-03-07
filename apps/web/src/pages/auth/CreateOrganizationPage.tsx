import AuthLayout from '../../components/layout/components/AuthLayout';
import AuthContainer from '../../components/layout/components/AuthContainer';
import { CreateOrganization } from './components/CreateOrganizationForm';
import { useVercelIntegration } from '../../hooks';
import SetupLoader from './components/SetupLoader';

export default function CreateOrganizationPage() {
  const { isLoading } = useVercelIntegration();

  return (
    <AuthLayout>
      {isLoading ? (
        <SetupLoader title="Loading..." />
      ) : (
        <AuthContainer title="Create organization" description="Create your organization!">
          <CreateOrganization />
        </AuthContainer>
      )}
    </AuthLayout>
  );
}
