import AuthLayout from '../../components/layout/components/AuthLayout';
import AuthContainer from '../../components/layout/components/AuthContainer';
import { CreateOrganization } from '../../components/auth/CreateOrganizationForm';

export default function CreateOrganizationPage() {
  return (
    <AuthLayout>
      <AuthContainer title="Create organization" description="Create your organization!">
        <CreateOrganization />
      </AuthContainer>
    </AuthLayout>
  );
}
