import { useParams, Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { Center, LoadingOverlay } from '@mantine/core';
import { IGetInviteResponseDto } from '@novu/shared';

import { getInviteTokenData } from '../../api/invitation';
import AuthLayout from '../../components/layout/components/AuthLayout';
import { SignUpForm } from './components/SignUpForm';
import { colors, Text, Button } from '@novu/design-system';
import { useAuth } from '@novu/shared-web';
import { useAcceptInvite } from './components/useAcceptInvite';
import { LoginForm } from './components/LoginForm';

export default function InvitationPage() {
  const queryClient = useQueryClient();
  const { currentUser, logout } = useAuth();
  const { token: invitationToken } = useParams<{ token: string }>();
  const { isLoading: isAcceptingInvite, acceptInvite } = useAcceptInvite();
  const { data, isLoading: isInviteTokenDataLoading } = useQuery<IGetInviteResponseDto, IGetInviteResponseDto>(
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
    if (invitationToken && isLoggedInAsInvitedUser) {
      acceptInvite(invitationToken);
    }
  }, [isLoggedInAsInvitedUser, acceptInvite, invitationToken]);

  useEffect(() => {
    return () => {
      queryClient.removeQueries(['getInviteTokenData']);
    };
  }, [queryClient]);

  return currentUser ? (
    <AuthLayout
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
  ) : (
    <AuthLayout
      title={existingUserId ? 'Sign In & Accept Invite' : 'Get Started'}
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
      {isInviteTokenDataLoading ? (
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
    </AuthLayout>
  );
}
