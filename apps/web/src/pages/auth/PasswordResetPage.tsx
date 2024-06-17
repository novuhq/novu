import { useParams, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import AuthLayout from '../../components/layout/components/AuthLayout';
import { PasswordResetRequestForm } from './components/PasswordResetRequestForm';
import { PasswordResetForm } from './components/PasswordResetForm';
import { Button } from '@novu/design-system';
import { ROUTES } from '../../constants/routes';
import { useVercelParams } from '../../hooks';

export function PasswordResetPage() {
  const navigate = useNavigate();
  const { token } = useParams<{ token: string }>();
  const [showSentSuccess, setShowSentSuccess] = useState<boolean>();
  const { isFromVercel, params } = useVercelParams();

  const loginLink = isFromVercel ? `${ROUTES.AUTH_LOGIN}?${params.toString()}` : ROUTES.AUTH_LOGIN;
  if (showSentSuccess) {
    return (
      <AuthLayout
        title="Reset Sent!"
        description="We've sent a password reset link to the account associated with your email"
      >
        <Button data-test-id="success-screen-reset" onClick={() => navigate(loginLink)} inherit>
          Go Back
        </Button>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="Reset Password" description="">
      {!token && <PasswordResetRequestForm onSent={() => setShowSentSuccess(true)} />}
      {token && <PasswordResetForm token={token} />}
    </AuthLayout>
  );
}
