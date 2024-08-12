import { LoginForm } from './components/LoginForm';
import AuthLayout from '../../components/layout/components/AuthLayout';

export default function LoginPage() {
  // eslint-disable-next-line no-console
  console.log('<LoginPage>');

  return (
    <AuthLayout title="Sign In" description="Welcome back!">
      <LoginForm />
    </AuthLayout>
  );
}
