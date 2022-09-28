import { useContext, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import jwtDecode from 'jwt-decode';
import { Loader, Paper } from '@mantine/core';
import { IJwtPayload } from '@novu/shared';
import { AuthContext } from '../../store/authContext';
import { LoginForm } from '../../components/auth/LoginForm';
import AuthLayout from '../../components/layout/components/AuthLayout';
import AuthContainer from '../../components/layout/components/AuthContainer';
import { useVercelIntegration } from '../../api/hooks/use-vercel-integration';
import { colors, Text } from '../../design-system';

export default function LoginPage() {
  const { setToken, token } = useContext(AuthContext);
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const queryToken = params.get('token');
  const source = params.get('source');

  const { startVercelSetup, isLoading, isFromVercel } = useVercelIntegration();

  useEffect(() => {
    if (queryToken) {
      setToken(queryToken);
    }
  }, [queryToken]);

  useEffect(() => {
    if (token) {
      const user = jwtDecode<IJwtPayload>(token);

      if (!user.organizationId || !user.environmentId) {
        navigate('/auth/application');
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
        <Paper
          sx={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            flexDirection: 'column',
            minHeight: '100vh',
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
          }}
        >
          <Loader color={colors.error} size={32} />
          <Text>Setting up Vercel Integration...</Text>
        </Paper>
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
