import AuthLayout from '../../components/layout/components/AuthLayout';
import AuthContainer from '../../components/layout/components/AuthContainer';
import { CreateApplication } from '../../components/auth/CreateApplicationForm';

export default function CreateEnvironmentPage() {
  return (
    <AuthLayout>
      <AuthContainer title="Create Environment" description="Create your environment!">
        <CreateApplication />
      </AuthContainer>
    </AuthLayout>
  );
}
