import AuthLayout from '../../components/layout/components/AuthLayout';
import AuthContainer from '../../components/layout/components/AuthContainer';
import { CreateOrganization } from '../../components/auth/CreateOrganizationForm';
import { useVercelIntegration } from '../../api/hooks/use-vercel-integration';
import VercelSetupLoader from '../../components/auth/VercelSetupLoader';

export default function CreateOrganizationPage() {
  const { isLoading } = useVercelIntegration();

  return (
    <AuthLayout>
      {isLoading ? (
        <VercelSetupLoader title="Loading..." />
      ) : (
        <AuthContainer title="Create organization" description="Create your organization!">
          <CreateOrganization />
        </AuthContainer>
      )}
    </AuthLayout>
  );
}
