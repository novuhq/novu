import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/primitives/button';
import { ROUTES } from '@/utils/routes';
import { authClient } from '../client';

export function VerifyEmail() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const email = searchParams.get('email') || '';
  const [isResending, setIsResending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleResendVerification = async () => {
    if (!email) {
      setError('Email address is required');

      return;
    }

    setIsResending(true);
    setError(null);
    setMessage(null);

    try {
      await authClient.sendVerificationEmail({
        email,
        callbackURL: window.location.origin + ROUTES.SIGN_IN,
      });

      setMessage('Verification email sent! Please check your inbox.');
    } catch (e: unknown) {
      const errorMessage = e instanceof Error ? e.message : 'Failed to send verification email.';
      setError(errorMessage);
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-md pt-12">
      <div className="text-center">
        <div className="mb-4 flex justify-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-100">
            <svg
              className="h-8 w-8 text-blue-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
              />
            </svg>
          </div>
        </div>

        <h2 className="mb-2 text-xl font-semibold">Check your email</h2>
        <p className="mb-6 text-sm text-gray-600">
          We&apos;ve sent a verification link to{' '}
          <span className="font-medium text-gray-900">{email || 'your email'}</span>
        </p>

        <div className="space-y-4">
          {message && <p className="text-sm text-green-600">{message}</p>}
          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
            <p className="mb-3 text-sm text-gray-700">Didn't receive the email?</p>
            <Button
              type="button"
              variant="secondary"
              mode="outline"
              className="w-full"
              onClick={handleResendVerification}
              disabled={isResending || !email}
            >
              {isResending ? 'Sending...' : 'Resend Verification Email'}
            </Button>
          </div>

          <p className="mt-6 text-center text-sm text-gray-600">
            <span
              role="button"
              tabIndex={0}
              className="text-primary-base focus:ring-primary-base/50 cursor-pointer font-medium hover:underline focus:outline-none focus:ring-2"
              onClick={() => navigate(ROUTES.SIGN_IN)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') navigate(ROUTES.SIGN_IN);
              }}
            >
              Back to sign in
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}
