import { useId, useState } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/primitives/button';
import { Input } from '@/components/primitives/input';
import { IS_SELF_HOSTED_EE } from '@/config';
import { readClerkRedirectUrlParam, resolveSameOriginRedirectUrl } from '@/utils/product-auth-urls';
import { ROUTES } from '@/utils/routes';
import { authClient } from '../client';
import { SocialAuthButtons } from './SocialAuthButtons';
import { buildSsoSignInPath } from '../sso-redirect';
import { useAuthConfig } from '../use-auth-config';

export function SignIn() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { emailPasswordAuthEnabled, isLoading: isAuthConfigLoading } = useAuthConfig();
  const postSignInRedirectUrl = resolveSameOriginRedirectUrl(readClerkRedirectUrlParam(searchParams));

  const emailId = useId();
  const passwordId = useId();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const [unverifiedEmail, setUnverifiedEmail] = useState<string | null>(null);
  const [isResending, setIsResending] = useState(false);

  const targetCallbackUrl = postSignInRedirectUrl
    ? `${window.location.origin}${postSignInRedirectUrl}`
    : undefined;

  const handleResendVerification = async () => {
    const targetEmail = unverifiedEmail || email;
    if (!targetEmail) return;

    setIsResending(true);
    setError(null);
    setSuccessMessage(null);

    try {
      await authClient.sendVerificationEmail({
        email: targetEmail,
        callbackURL: `${window.location.origin}${ROUTES.SIGN_IN}`,
      });

      setSuccessMessage('Verification email sent! Please check your inbox.');
      setUnverifiedEmail(null);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Failed to send verification email.';
      setError(message);
    } finally {
      setIsResending(false);
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setSuccessMessage(null);
    setUnverifiedEmail(null);
    setIsLoading(true);

    try {
      const { data, error: authError } = await authClient.signIn.email({
        email,
        password,
      });

      if (authError) {
        if (authError.status === 403) {
          setUnverifiedEmail(email);
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
        navigate(`${ROUTES.INVITATION_ACCEPT}?id=${pendingInvitationId}`);
        return;
      }

      if (postSignInRedirectUrl) {
        navigate(postSignInRedirectUrl);
        return;
      }

      navigate(ROUTES.SIGNUP_ORGANIZATION_LIST);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'An unexpected error occurred.';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  if (isAuthConfigLoading) return null;

  if (!emailPasswordAuthEnabled) {
    return <Navigate to={buildSsoSignInPath(searchParams)} replace />;
  }

  return (
    <div className="mx-auto w-full max-w-md pt-12">
      <h2 className="mb-6 text-center text-xl font-semibold">Sign In</h2>

      <SocialAuthButtons callbackURL={targetCallbackUrl} disabled={isLoading} />

      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-neutral-300" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-foreground-500">Or continue with</span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor={emailId} className="mb-1 block text-sm font-medium text-foreground-700">
            Email
          </label>
          <Input
            type="email"
            id={emailId}
            name="email"
            autoComplete="email"
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
            <Link
              to={ROUTES.FORGOT_PASSWORD}
              className="text-sm font-medium text-primary-base hover:underline focus:outline-none focus:ring-2 focus:ring-primary-base/50"
            >
              Forgot password?
            </Link>
          </div>
          <Input
            type="password"
            id={passwordId}
            name="password"
            autoComplete="current-password"
            value={password}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
            placeholder="Password"
            required
            className="w-full"
          />
        </div>

        {successMessage && (
          <p className="text-sm text-green-600" role="status">
            {successMessage}
          </p>
        )}

        {error && (
          <div className="space-y-2" role="alert">
            <p className="text-sm text-red-600">{error}</p>
            {unverifiedEmail && (
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
          <Link
            to={ROUTES.SIGN_UP}
            className="font-medium text-primary-base hover:underline focus:outline-none focus:ring-2 focus:ring-primary-base/50"
          >
            Sign Up
          </Link>
        </p>
      </form>

      {IS_SELF_HOSTED_EE && (
        <>
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-neutral-300" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="bg-white px-2 text-foreground-500">Or</span>
            </div>
          </div>
          <Button
            variant="secondary"
            mode="outline"
            className="w-full"
            onClick={() => navigate(buildSsoSignInPath(searchParams))}
          >
            Sign in with SSO
          </Button>
        </>
      )}
    </div>
  );
}
