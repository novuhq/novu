import { useParams } from 'react-router-dom';
import { useQuery } from 'react-query';
import { Center, LoadingOverlay } from '@mantine/core';
import { IGetInviteResponseDto } from '@notifire/shared';
import { getInviteTokenData } from '../../api/invitation';
import AuthLayout from '../../components/layout/components/AuthLayout';
import AuthContainer from '../../components/layout/components/AuthContainer';
import { SignUpForm } from '../../components/auth/SignUpForm';
import { colors, Text } from '../../design-system';

export default function InvitationPage() {
  const { token } = useParams<{ token: string }>();
  const { data, isLoading } = useQuery<IGetInviteResponseDto, IGetInviteResponseDto>(
    'getInviteTokenData',
    () => getInviteTokenData(token || ''),
    {
      enabled: !!token,
    }
  );

  return (
    <AuthLayout>
      <AuthContainer
        title="Get Started"
        customDescription={
          <Center inline mb={60} mt={20}>
            <Text size="lg" mr={4} color={colors.B60}>
              You've been invited by
            </Text>
            <Text size="lg" weight="bold" mr={4}>
              {data?.inviter?.firstName || ''}
            </Text>
            <Text size="lg" mr={4} color={colors.B60}>
              to join
            </Text>
            <Text size="lg" weight="bold">
              {data?.organization.name || ''}
            </Text>
            <Text size="lg" color={colors.B60}>
              .
            </Text>
          </Center>
        }>
        <div style={{ position: 'relative', minHeight: 'inherit' }}>
          <LoadingOverlay
            visible={isLoading}
            overlayColor={colors.B30}
            loaderProps={{
              color: colors.error,
            }}
          />
          {!isLoading && <SignUpForm email={data?.email} token={token} />}
        </div>
      </AuthContainer>
    </AuthLayout>
  );
}
