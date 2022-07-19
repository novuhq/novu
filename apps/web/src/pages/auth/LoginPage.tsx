import { useContext, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import jwtDecode from 'jwt-decode';
import { IJwtPayload } from '@novu/shared';
import { AuthContext } from '../../store/authContext';
import { LoginForm } from '../../components/auth/LoginForm';
import AuthLayout from '../../components/layout/components/AuthLayout';
import AuthContainer from '../../components/layout/components/AuthContainer';

export default function LoginPage() {
  const { setToken, token } = useContext(AuthContext);
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const queryToken = params.get('token');
  const source = params.get('source');

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
        navigate(source === 'cli' ? '/quickstart' : '/');
      }
    }
  }, [token]);

  return (
    <AuthLayout>
      <AuthContainer
        title="Sign In"
        description=" Welcome back! Sign in with the data you entered in your registration"
      >
        <LoginForm />
      </AuthContainer>
    </AuthLayout>
  );
}
