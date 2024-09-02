import { useParams, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { Button, colors, Text, PageMeta } from '@novu/design-system';
import AuthLayout from '../../components/layout/components/AuthLayout';
import { PasswordResetRequestForm } from './components/PasswordResetRequestForm';
import { PasswordResetForm } from './components/PasswordResetForm';
import { ROUTES } from '../../constants/routes';
import { useVercelParams } from '../../hooks';

const title = 'Reset password';

export function PasswordResetPage() {
  const navigate = useNavigate();
  const { token } = useParams<{ token: string }>();
  const [showSentSuccess, setShowSentSuccess] = useState<boolean>();
  const { isFromVercel, params } = useVercelParams();

  const loginLink = isFromVercel ? `${ROUTES.AUTH_LOGIN}?${params.toString()}` : ROUTES.AUTH_LOGIN;
  if (showSentSuccess) {
    return (
      <AuthLayout title="Reset Sent!">
        <PageMeta title={title} />
        <Text size="lg" color={colors.B60} mb={60} mt={20}>
          We've sent a password reset link to the account associated with your email
        </Text>
        <Button data-test-id="success-screen-reset" onClick={() => navigate(loginLink)} inherit>
          Go Back
        </Button>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title={title}>
      <PageMeta title={title} />
      {!token && <PasswordResetRequestForm onSent={() => setShowSentSuccess(true)} />}
      {token && <PasswordResetForm token={token} />}
    </AuthLayout>
  );
}
