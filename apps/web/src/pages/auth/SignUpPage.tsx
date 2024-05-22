import { SignUpForm } from './components/SignUpForm';
import AuthContainer from '../../components/layout/components/AuthContainer';
import { useBlueprint } from '../../hooks';

export default function SignUpPage() {
  useBlueprint();

  return (
    <AuthContainer title="Sign Up" description="Hello and welcome! Sign up to the best notifications platform ever">
      <SignUpForm />
    </AuthContainer>
  );
}
