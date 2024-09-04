import { colors, Text, PageMeta } from '@novu/design-system';
import { LoginForm } from './components/LoginForm';
import AuthLayout from '../../components/layout/components/AuthLayout';

const title = 'Sign In';

export default function LoginPage() {
  return (
    <AuthLayout title={title}>
      <PageMeta title={title} />
      <LoginForm />
    </AuthLayout>
  );
}
