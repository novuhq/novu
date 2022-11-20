import { useContext, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import jwtDecode from 'jwt-decode';
import { IJwtPayload } from '@novu/shared';
import { AuthContext } from '../../store/authContext';
import { LoginForm } from '../../components/auth/LoginForm';
import AuthLayout from '../../components/layout/components/AuthLayout';
import AuthContainer from '../../components/layout/components/AuthContainer';
import { useVercelIntegration } from '../../api/hooks/use-vercel-integration';
import VercelSetupLoader from '../../components/auth/VercelSetupLoader';
import { useVercelParams } from '../../hooks/use-vercelParams';

export default function LoginPage() {
  const { setToken, token } = useContext(AuthContext);
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const queryToken = params.get('token');
  const source = params.get('source');

  const { startVercelSetup, isLoading } = useVercelIntegration();
  const { code, isFromVercel, next } = useVercelParams();

  useEffect(() => {
    if (queryToken) {
      setToken(queryToken);
    }
  }, [queryToken]);

  useEffect(() => {
    if (token) {
      const user = jwtDecode<IJwtPayload>(token);

      if (!user.organizationId || !user.environmentId) {
        const authApplicationLink = isFromVercel ? `/auth/application?code=${code}&next=${next}` : '/auth/application';
        navigate(authApplicationLink);
      } else {
        if (isFromVercel) {
          startVercelSetup();

          return;
        }

        navigate(source === 'cli' ? '/quickstart' : '/');
      }
    }
  }, [token]);

  return (
    <AuthLayout>
      {isLoading ? (
        <VercelSetupLoader title="Loading..." />
      ) : (
        <AuthContainer
          title="Sign In"
          description=" Welcome back! Sign in with the data you entered in your registration"
        >
          <LoginForm />
        </AuthContainer>
      )}
    </AuthLayout>
  );
}
