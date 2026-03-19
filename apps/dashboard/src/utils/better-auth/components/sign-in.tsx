import { useId, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/primitives/button';
import { Input } from '@/components/primitives/input';
import { IS_ENTERPRISE } from '@/config';
import { ROUTES } from '@/utils/routes';
import { authClient } from '../client';

export function SignIn() {
  const navigate = useNavigate();
  const emailId = useId();
  const passwordId = useId();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showResendVerification, setShowResendVerification] = useState(false);
  const [isResending, setIsResending] = useState(false);

  const handleResendVerification = async () => {
    setIsResending(true);
    setError(null);

    try {
      await authClient.sendVerificationEmail({
        email,
        callbackURL: window.location.origin + ROUTES.SIGN_IN,
      });

      setError('Verification email sent! Please check your inbox.');
      setShowResendVerification(false);
    } catch (e: any) {
      setError(e.message || 'Failed to send verification email.');
    } finally {
      setIsResending(false);
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setShowResendVerification(false);
    setIsLoading(true);

    try {
      const { data, error: authError } = await authClient.signIn.email({
        email,
        password,
      });

      if (authError) {
        if (authError.status === 403) {
          setShowResendVerification(true);
          throw new Error('Please verify your email address before signing in.');
        }

        throw new Error(authError.message || 'Sign in failed');
      }

      if (!data?.token || !data?.user) {
        throw new Error('Sign in failed');
      }

      localStorage.setItem('better-auth-session-token', data.token);

      const pendingInvitationId = sessionStorage.getItem('pendingInvitationId');

      if (pendingInvitationId) {
        window.location.href = `${ROUTES.INVITATION_ACCEPT}?id=${pendingInvitationId}`;

        return;
      }

      window.location.href = ROUTES.SIGNUP_ORGANIZATION_LIST;
    } catch (e: any) {
      setError(e.message || 'An unexpected error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-md pt-12">
      <h2 className="mb-6 text-center text-xl font-semibold">Sign In</h2>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor={emailId} className="mb-1 block text-sm font-medium text-foreground-700">
            Email
          </label>
          <Input
            type="email"
            id={emailId}
            value={email}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
            placeholder="user@example.com"
            required
            className="w-full"
          />
        </div>
        <div>
          <div className="mb-1 flex items-center justify-between">
            <label htmlFor={passwordId} className="block text-sm font-medium text-foreground-700">
              Password
            </label>
            <span
              role="button"
              tabIndex={0}
              className="text-primary-base focus:ring-primary-base/50 cursor-pointer text-sm font-medium hover:underline focus:outline-none focus:ring-2"
              onClick={() => navigate(ROUTES.FORGOT_PASSWORD)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') navigate(ROUTES.FORGOT_PASSWORD);
              }}
            >
              Forgot password?
            </span>
          </div>
          <Input
            type="password"
            id={passwordId}
            value={password}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
            placeholder="Password"
            required
            className="w-full"
          />
        </div>
        {error && (
          <div className="space-y-2">
            <p className="text-sm text-red-600">{error}</p>
            {showResendVerification && (
              <Button
                type="button"
                variant="secondary"
                mode="outline"
                className="w-full"
                onClick={handleResendVerification}
                disabled={isResending}
              >
                {isResending ? 'Sending...' : 'Resend Verification Email'}
              </Button>
            )}
          </div>
        )}
        <Button type="submit" disabled={isLoading} variant="primary" mode="filled" className="w-full">
          {isLoading ? 'Signing In...' : 'Sign In'}
        </Button>
        <p className="mt-4 text-center text-sm text-foreground-600">
          Don&apos;t have an account?{' '}
          <span
            role="button"
            tabIndex={0}
            className="text-primary-base focus:ring-primary-base/50 cursor-pointer font-medium hover:underline focus:outline-none focus:ring-2"
            onClick={() => navigate(ROUTES.SIGN_UP)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') navigate(ROUTES.SIGN_UP);
            }}
          >
            Sign Up
          </span>
        </p>
      </form>
      {IS_ENTERPRISE && (
        <>
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-neutral-300"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="bg-white px-2 text-foreground-500">Or</span>
            </div>
          </div>
          <Button variant="secondary" mode="outline" className="w-full" onClick={() => navigate(ROUTES.SSO_SIGN_IN)}>
            Sign in with SSO
          </Button>
        </>
      )}
    </div>
  );
}
