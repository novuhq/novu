import { useParams } from 'react-router-dom';
import { useQuery } from 'react-query';
import { LoadingOverlay } from '@mantine/core';
import { IGetInviteResponseDto } from '@notifire/shared';
import { getInviteTokenData } from '../../api/invitation';
import AuthLayout from '../../components/layout/components/AuthLayout';
import AuthContainer from '../../components/layout/components/AuthContainer';
import { SignUpForm } from '../../components/auth/SignUpForm';

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
        description={`You've been invited by <b>{data?.inviter?.firstName}</b> to join <b>{data?.organization.name}</b>`}>
        {isLoading ? <LoadingOverlay visible={isLoading} /> : <SignUpForm email={data?.email} token={token} />}
      </AuthContainer>
    </AuthLayout>
  );
}
