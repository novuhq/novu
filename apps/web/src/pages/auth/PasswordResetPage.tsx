import { Link, useParams, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { Center } from '@mantine/core';
import AuthLayout from '../../components/layout/components/AuthLayout';
import AuthContainer from '../../components/layout/components/AuthContainer';
import { PasswordResetRequestForm } from '../../components/auth/PasswordResetRequestForm';
import { PasswordResetForm } from '../../components/auth/PasswordResetForm';
import { Button, Text } from '../../design-system';

type Props = {};

export function PasswordResetPage({}: Props) {
  const navigate = useNavigate();
  const { token } = useParams<{ token: string }>();
  const [showSentSuccess, setShowSentSuccess] = useState<boolean>();

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
          <Button data-test-id="success-screen-reset" onClick={() => navigate('/auth/login')} inherit>
            Go Back
          </Button>
        </AuthContainer>
      )}
    </AuthLayout>
  );
}
