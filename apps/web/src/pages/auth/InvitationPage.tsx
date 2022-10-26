import { useLocation, useNavigate, useParams, Link } from 'react-router-dom';
import { useQuery } from 'react-query';
import { useContext, useEffect } from 'react';
import { Center, LoadingOverlay } from '@mantine/core';
import { IGetInviteResponseDto } from '@novu/shared';
import * as capitalize from 'lodash.capitalize';
import { getInviteTokenData } from '../../api/invitation';
import AuthLayout from '../../components/layout/components/AuthLayout';
import AuthContainer from '../../components/layout/components/AuthContainer';
import { SignUpForm } from '../../components/auth/SignUpForm';
import { colors, Text, Button } from '../../design-system';
import { AuthContext } from '../../store/authContext';
import { useAcceptInvite } from '../../components/auth/use-accept-invite.hook';
import { When } from '../../components/utils/When';
import { LoginForm } from '../../components/auth/LoginForm';

export default function InvitationPage() {
  const navigate = useNavigate();
  const { token, logout, currentUser } = useContext(AuthContext);
  const location = useLocation();
  const isLoggedIn = !!token;
  const { token: tokenParam } = useParams<{ token: string }>();
  const { isLoading: loadingAcceptInvite, submitToken } = useAcceptInvite();
  const { data, isLoading } = useQuery<IGetInviteResponseDto, IGetInviteResponseDto>(
    'getInviteTokenData',
    () => getInviteTokenData(tokenParam || ''),
    {
      enabled: !!tokenParam,
    }
  );

  const existingUser = tokenParam && data?._userId;
  const invalidCurrentUser = existingUser && currentUser && currentUser._id !== data._userId;

  const acceptToken = async () => {
    if (existingUser && currentUser && currentUser._id === data._userId && isLoggedIn) {
      const result = await submitToken(tokenParam as string, true);
      if (result) navigate('/templates');
    }
  };

  const logoutWhenActiveSession = () => {
    logout();
    navigate(location.pathname);
  };

  useEffect(() => {
    acceptToken();
  }, [tokenParam, data, currentUser]);

  return (
    <AuthLayout>
      {isLoggedIn && (
        <AuthContainer
          title="Active Session!"
          customDescription={
            <Center inline mb={40} mt={20}>
              <Text size="lg" color={colors.B60}>
                <When truthy={invalidCurrentUser && !loadingAcceptInvite}>
                  <p>The invite is not valid for the current user. Please log in with the right user.</p>
                </When>

                <When truthy={!invalidCurrentUser && !loadingAcceptInvite}>
                  <p>Your session is currently active, use another browser or switch to incognito mode.</p>
                  <p>Log out instead?</p>
                </When>

                <When truthy={loadingAcceptInvite}>
                  <p>Accepting invite...</p>
                </When>
              </Text>
            </Center>
          }
        >
          <Button data-test-id="success-screen-reset" onClick={logoutWhenActiveSession} inherit>
            Log out
          </Button>
          <Center mt={20}>
            <Text mr={10} size="md" color={colors.B60}>
              Go to
            </Text>
            <Link to="/quickstart">
              <Text>Dashboard</Text>
            </Link>
          </Center>
        </AuthContainer>
      )}

      {!isLoggedIn && (
        <AuthContainer
          title="Get Started"
          customDescription={
            <div>
              <Text size="lg" mr={4} color={colors.B60} mt={10} mb={15}>
                You've been invited by <b>{capitalize(data?.inviter?.firstName) || ''}</b> to join{' '}
                <b>{data?.organization.name || ''}.</b>{' '}
                {existingUser
                  ? 'You already have an account, please log in to accept the invite.'
                  : 'Please create an account to join.'}
              </Text>
            </div>
          }
        >
          <div style={{ position: 'relative', minHeight: 'inherit' }}>
            <LoadingOverlay
              visible={isLoading}
              overlayColor={colors.B30}
              loaderProps={{
                color: colors.error,
              }}
            />
            {!isLoading && !existingUser && <SignUpForm email={data?.email} token={tokenParam} />}
            {!isLoading && existingUser && <LoginForm email={data?.email} token={tokenParam} />}
          </div>
        </AuthContainer>
      )}
    </AuthLayout>
  );
}
