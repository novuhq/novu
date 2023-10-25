import { Link, useParams, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { Center } from '@mantine/core';
import AuthLayout from '../../components/layout/components/AuthLayout';
import AuthContainer from '../../components/layout/components/AuthContainer';
import { PasswordResetRequestForm } from './components/PasswordResetRequestForm';
import { PasswordResetForm } from './components/PasswordResetForm';
import { Button } from '@novu/design-system';
import { ROUTES } from '../../constants/routes.enum';
import { useVercelParams } from '../../hooks';

type Props = {};

export function PasswordResetPage({}: Props) {
  const navigate = useNavigate();
  const { token } = useParams<{ token: string }>();
  const [showSentSuccess, setShowSentSuccess] = useState<boolean>();
  const { isFromVercel, code, next, configurationId } = useVercelParams();

  const vercelQueryParams = `code=${code}&next=${next}&configurationId=${configurationId}`;
  const loginLink = isFromVercel ? `/auth/login?${vercelQueryParams}` : ROUTES.AUTH_LOGIN;
  function onSent() {
    setShowSentSuccess(true);
  }

  return (
    <AuthLayout>
      {!showSentSuccess && (
        <AuthContainer title="Reset Password" description="">
          {!token && <PasswordResetRequestForm onSent={onSent} />}
          {token && <PasswordResetForm token={token} />}
        </AuthContainer>
      )}
      {showSentSuccess && (
        <AuthContainer
          title="Reset Sent!"
          description="We've sent a password reset link to the account associated with your email"
        >
          <Button data-test-id="success-screen-reset" onClick={() => navigate(loginLink)} inherit>
            Go Back
          </Button>
        </AuthContainer>
      )}
    </AuthLayout>
  );
}
