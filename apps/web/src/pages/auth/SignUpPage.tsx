import AuthLayout from '../../components/layout/components/AuthLayout';
import { SignUpForm } from '../../components/auth/SignUpForm';
import AuthContainer from '../../components/layout/components/AuthContainer';

export default function SignUpPage() {
  return (
    <AuthLayout>
      <AuthContainer title="Sign Up" description="Hello and welcome! Sign up to the best notifications platform ever">
        <SignUpForm />
      </AuthContainer>
    </AuthLayout>
  );
}
