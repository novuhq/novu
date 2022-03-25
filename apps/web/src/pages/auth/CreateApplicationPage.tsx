import AuthLayout from '../../components/layout/components/AuthLayout';
import AuthContainer from '../../components/layout/components/AuthContainer';
import { CreateApplicationForm } from '../../components/auth/CreateApplicationForm';

export default function CreateApplicationPage() {
  return (
    <AuthLayout>
      <AuthContainer title="Create Application" description="Create your application!">
        <CreateApplicationForm />
      </AuthContainer>
    </AuthLayout>
  );
}
