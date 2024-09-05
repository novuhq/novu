import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { Center, LoadingOverlay } from '@mantine/core';
import { IGetInviteResponseDto } from '@novu/shared';

import { colors, Text, Button, PageMeta } from '@novu/design-system';
import { getInviteTokenData } from '../../api/invitation';
import AuthLayout from '../../components/layout/components/AuthLayout';
import { SignUpForm } from './components/SignUpForm';
import { useAuth } from '../../hooks/useAuth';
import { ROUTES } from '../../constants/routes';
import { useAcceptInvite } from './components/useAcceptInvite';
import { LoginForm } from './components/LoginForm';

export default function InvitationPage() {
  const queryClient = useQueryClient();
  const { currentUser, logout } = useAuth();
  const { token: invitationToken } = useParams<{ token: string }>();
  const { isLoading: isAcceptingInvite, acceptInvite } = useAcceptInvite();
  const navigate = useNavigate();
  const { data, isLoading } = useQuery<IGetInviteResponseDto, IGetInviteResponseDto>(
    ['getInviteTokenData'],
    () => getInviteTokenData(invitationToken || ''),
    {
      enabled: !!invitationToken,
      refetchOnWindowFocus: false,
    }
  );
  const inviterFirstName = data?.inviter?.firstName || '';
  const organizationName = data?.organization.name || '';
  const existingUserId = data?._userId;
  const isLoggedInAsInvitedUser = !!(existingUserId && currentUser && currentUser._id === existingUserId);
  const Form = existingUserId ? LoginForm : SignUpForm;

  useEffect(() => {
    (async () => {
      if (invitationToken && isLoggedInAsInvitedUser) {
        await acceptInvite(invitationToken);
        navigate(ROUTES.WORKFLOWS);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [acceptInvite, invitationToken, isLoggedInAsInvitedUser]);

  useEffect(() => {
    return () => {
      queryClient.removeQueries(['getInviteTokenData']);
    };
  }, [queryClient]);

  if (isLoading) {
    return (
      <LoadingOverlay
        visible
        overlayColor={colors.B30}
        loaderProps={{
          color: colors.error,
        }}
      />
    );
  }

  /*
   * TODO: The moment the invited user signs-in or up, currentUser is set and the UI flickers to the Active Session screen,
   * before the next rendering cycle that will actually redirect the next page. We will tackle this in a separate PR.
   */
  if (currentUser) {
    const title = 'Accept invite';

    return (
      <AuthLayout title={title}>
        <PageMeta title={title} />
        <Center inline mb={40} mt={20}>
          <Text size="lg" color={colors.B60}>
            {isLoggedInAsInvitedUser && isAcceptingInvite ? (
              <p>Accepting invitation...</p>
            ) : (
              <p>
                The invitation is not valid for user with email ${currentUser.email}. Please log in with the right user.
              </p>
            )}
          </Text>
        </Center>
        <Button data-test-id="success-screen-reset" onClick={() => logout()} inherit>
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
      </AuthLayout>
    );
  }

  const title = existingUserId ? 'Sign In & Accept Invite' : 'Get Started';

  return (
    <AuthLayout title={title}>
      <PageMeta title={title} />
      inviterFirstName && organizationName && (
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
      )
      <Form email={data?.email} invitationToken={invitationToken} />
    </AuthLayout>
  );
}
