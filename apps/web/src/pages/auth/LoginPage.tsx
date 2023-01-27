import { useContext, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import jwtDecode from 'jwt-decode';
import { IJwtPayload } from '@novu/shared';

import { AuthContext } from '../../store/authContext';
import { LoginForm } from '../../components/auth/LoginForm';
import AuthLayout from '../../components/layout/components/AuthLayout';
import AuthContainer from '../../components/layout/components/AuthContainer';
import { useVercelIntegration } from '../../api/hooks/use-vercel-integration';
import SetupLoader from '../../components/auth/SetupLoader';
import { useVercelParams } from '../../hooks/use-vercelParams';
import { useSegment } from '../../hooks/use-segment';
import { useAcceptInvite } from '../../components/auth/use-accept-invite.hook';
import { useBlueprint } from '../../hooks/useBlueprint';

export default function LoginPage() {
  useBlueprint();
  const { setToken, token } = useContext(AuthContext);
  const segment = useSegment();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const queryToken = params.get('token');
  const invitationToken = params.get('invitationToken');
  const source = params.get('source');
  const sourceWidget = params.get('source_widget');

  const { startVercelSetup, isLoading } = useVercelIntegration();
  const { code, isFromVercel, next } = useVercelParams();
  const { isLoading: isLoadingAcceptInvite, submitToken } = useAcceptInvite();

  useEffect(() => {
    if (queryToken) {
      const user = jwtDecode<IJwtPayload>(queryToken);

      if (!invitationToken && (!user.organizationId || !user.environmentId)) {
        const authApplicationLink = isFromVercel ? `/auth/application?code=${code}&next=${next}` : '/auth/application';
        setToken(queryToken);
        navigate(authApplicationLink);

        return;
      }

      if (isFromVercel) {
        setToken(queryToken);
        startVercelSetup();

        return;
      }

      if (source === 'cli') {
        segment.track('Dashboard Visit', {
          widget: sourceWidget || 'unknown',
          source: 'cli',
        });
        setToken(queryToken);
        navigate('/quickstart');

        return;
      }

      if (invitationToken) {
        submitToken(queryToken, invitationToken);

        return;
      }

      setToken(queryToken);
      navigate('/');
    }
  }, [queryToken]);

  return (
    <AuthLayout>
      {isLoading || isLoadingAcceptInvite ? (
        <SetupLoader title="Loading..." />
      ) : (
        <AuthContainer
          title="Sign In"
          description="Welcome back! Sign in with the data you entered in your registration"
        >
          <LoginForm />
        </AuthContainer>
      )}
    </AuthLayout>
  );
}
