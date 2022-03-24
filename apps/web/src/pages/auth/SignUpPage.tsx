import AuthLayout from '../../components/layout/components/AuthLayout';
import { SignUpForm } from '../../components/auth/SignUpForm';

export default function SignUpPage() {
  return (
    <AuthLayout>
      <SignUpForm />
    </AuthLayout>
  );
}
