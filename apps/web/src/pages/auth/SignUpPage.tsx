import { SignUpForm } from './components/SignUpForm';
import AuthLayout from '../../components/layout/components/AuthLayout';

export default function SignUpPage() {
  return (
    <AuthLayout title="Sign Up" description="Hello and welcome! Sign up to the best notifications platform ever">
      <SignUpForm />
    </AuthLayout>
  );
}
