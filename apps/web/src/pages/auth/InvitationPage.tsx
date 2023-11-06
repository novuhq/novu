import { useLocation, useNavigate, useParams, Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { Center, LoadingOverlay } from '@mantine/core';
import { IGetInviteResponseDto } from '@novu/shared';

import { getInviteTokenData } from '../../api/invitation';
import AuthLayout from '../../components/layout/components/AuthLayout';
import AuthContainer from '../../components/layout/components/AuthContainer';
import { SignUpForm } from './components/SignUpForm';
import { colors, Text, Button } from '@novu/design-system';
import { useAuthContext } from '../../components/providers/AuthProvider';
import { useAcceptInvite } from './components/useAcceptInvite';
import { LoginForm } from './components/LoginForm';

export default function InvitationPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { token, logout, currentUser } = useAuthContext();
  const location = useLocation();
  const isLoggedIn = !!token;
  const { token: invitationToken } = useParams<{ token: string }>();
  const tokensRef = useRef({ token, invitationToken });
  tokensRef.current = { token, invitationToken };
  const { isLoading: isAcceptingInvite, submitToken } = useAcceptInvite();
  const { data, isInitialLoading } = useQuery<IGetInviteResponseDto, IGetInviteResponseDto>(
    ['getInviteTokenData'],
    () => getInviteTokenData(invitationToken || ''),
    {
      enabled: !!invitationToken,
      refetchOnWindowFocus: false,
    }
  );
  const inviterFirstName = data?.inviter?.firstName || '';
  const organizationName = data?.organization.name || '';
  const existingUser = !!(invitationToken && data?._userId);
  const isLoggedInAsInvitedUser = !!(isLoggedIn && existingUser && currentUser && currentUser._id === data?._userId);
  const Form = existingUser ? LoginForm : SignUpForm;

  const logoutWhenActiveSession = () => {
    logout();
    navigate(location.pathname);
  };

  useEffect(() => {
    // auto accept invitation when logged in as invited user
    if (isLoggedInAsInvitedUser) {
      submitToken(tokensRef.current.token as string, tokensRef.current.invitationToken as string, true);
    }
  }, [isLoggedInAsInvitedUser, submitToken]);

  useEffect(() => {
    return () => {
      queryClient.removeQueries(['getInviteTokenData']);
    };
  }, [queryClient]);

  return (
    <AuthLayout>
      {isLoggedIn && (
        <AuthContainer
          title="Active Session!"
          customDescription={
            <Center inline mb={40} mt={20}>
              <Text size="lg" color={colors.B60}>
                {isAcceptingInvite || isLoggedInAsInvitedUser ? (
                  <p>Accepting invite...</p>
                ) : (
                  <p>The invite is not valid for the current user. Please log in with the right user.</p>
                )}
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
          title={existingUser ? 'Sign In & Accept Invite' : 'Get Started'}
          customDescription={
            inviterFirstName && organizationName ? (
              <Center inline mb={60} mt={20} data-test-id="invitation-description">
                <Text size="lg" mr={4} color={colors.B60}>
                  {"You've been invited by "}
                </Text>
                <Text size="lg" weight="bold" mr={4}>
                  {inviterFirstName[0].toUpperCase() + inviterFirstName.slice(1)}
                </Text>
                <Text size="lg" mr={4} color={colors.B60}>
                  {' to join '}
                </Text>
                <Text size="lg" weight="bold">
                  {organizationName}
                </Text>
                <Text size="lg" color={colors.B60}>
                  .
                </Text>
              </Center>
            ) : undefined
          }
        >
          {isInitialLoading ? (
            <LoadingOverlay
              visible
              overlayColor={colors.B30}
              loaderProps={{
                color: colors.error,
              }}
            />
          ) : (
            <Form email={data?.email} invitationToken={invitationToken} />
          )}
        </AuthContainer>
      )}
    </AuthLayout>
  );
}
