import { useEffect, useContext } from 'react';
import AuthLayout from '../../components/layout/components/AuthLayout';
import { SignUpForm } from '../../components/auth/SignUpForm';
import AuthContainer from '../../components/layout/components/AuthContainer';
import { useVercelIntegration } from '../../api/hooks/use-vercel-integration';
import { AuthContext } from '../../store/authContext';

export default function SignUpPage() {
  const { startVercelSetup } = useVercelIntegration();
  const { token } = useContext(AuthContext);

  useEffect(() => {
    if (token) {
      startVercelSetup();
    }
  }, [token]);

  return (
    <AuthLayout>
      <AuthContainer title="Sign Up" description="Hello and welcome! Sign up to the best notifications platform ever">
        <SignUpForm />
      </AuthContainer>
    </AuthLayout>
  );
}
