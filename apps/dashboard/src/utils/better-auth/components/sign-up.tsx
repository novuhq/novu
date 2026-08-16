import { useId, useState } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/primitives/button';
import { Input } from '@/components/primitives/input';
import { ROUTES } from '@/utils/routes';
import { authClient } from '../client';
import { SocialAuthButtons } from './SocialAuthButtons';
import { useAuth } from '../index';
import { buildSsoSignInPath } from '../sso-redirect';
import { useAuthConfig } from '../use-auth-config';

function extractInvitationIdFromRedirect(redirectUrl: string | null): string | null {
  if (!redirectUrl) return null;

  try {
    const decodedRedirect = decodeURIComponent(redirectUrl);
    const url = new URL(decodedRedirect, window.location.origin);

    if (url.pathname === ROUTES.INVITATION_ACCEPT) {
      return url.searchParams.get('id');
    }

    return null;
  } catch {
    return null;
  }
}

function validatePassword(password: string): string | null {
  if (password.length < 8 || password.length > 64) {
    return 'Password must be between 8 and 64 characters';
  }
  if (!/[A-Z]/.test(password)) {
    return 'Password must contain at least one uppercase letter';
  }
  if (!/[a-z]/.test(password)) {
    return 'Password must contain at least one lowercase letter';
  }
  if (!/[0-9]/.test(password)) {
    return 'Password must contain at least one number';
  }
  if (!/[#?!@$%^&*()-]/.test(password)) {
    return 'Password must contain at least one special character (#?!@$%^&*()-)';
  }
  return null;
}

export function SignUp() {
  const { refreshSession } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { emailPasswordAuthEnabled, isLoading: isAuthConfigLoading } = useAuthConfig();

  const firstNameId = useId();
  const lastNameId = useId();
  const emailId = useId();
  const passwordId = useId();
  const passwordConstraintsId = useId();
  const passwordErrorId = useId();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const redirectUrl = searchParams.get('redirect');
  const pendingInvitationId =
    extractInvitationIdFromRedirect(redirectUrl) || sessionStorage.getItem('pendingInvitationId');
  const hasInvitation = Boolean(pendingInvitationId);

  const targetCallbackUrl = pendingInvitationId
    ? `${window.location.origin}${ROUTES.INVITATION_ACCEPT}?id=${pendingInvitationId}`
    : undefined;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setPasswordError(null);
    setIsLoading(true);
    setIsSubmitted(true);

    const passwordValidationError = validatePassword(password);
    if (passwordValidationError) {
      setPasswordError(passwordValidationError);
      setIsLoading(false);
      return;
    }

    try {
      const { data: signUpData, error: signUpError } = await authClient.signUp.email({
        email,
        password,
        name: `${firstName} ${lastName}`.trim(),
        callbackURL: `${window.location.origin}${ROUTES.SIGN_IN}`,
      });

      if (signUpError) {
        throw new Error(signUpError.message || 'Sign up failed');
      }

      if (!signUpData?.user) {
        throw new Error('Sign up failed');
      }

      if (!signUpData.token) {
        navigate(`${ROUTES.VERIFY_EMAIL}?email=${encodeURIComponent(email)}`);
        return;
      }

      localStorage.setItem('better-auth-session-token', signUpData.token);
      await refreshSession();

      if (pendingInvitationId) {
        sessionStorage.removeItem('pendingInvitationId');
        navigate(`${ROUTES.INVITATION_ACCEPT}?id=${pendingInvitationId}`);
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
    <div className="mx-auto max-w-md pt-12">
      <h2 className="mb-6 text-center text-xl font-semibold">Create Account</h2>

      <SocialAuthButtons callbackURL={targetCallbackUrl} disabled={isLoading} />

      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-neutral-300" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-foreground-500">Or continue with</span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor={firstNameId} className="mb-1 block text-sm font-medium text-foreground-700">
            First Name <span className="text-red-600">*</span>
          </label>
          <Input
            id={firstNameId}
            type="text"
            name="firstName"
            autoComplete="given-name"
            value={firstName}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFirstName(e.target.value)}
            placeholder="John"
            required
            className="w-full"
          />
        </div>

        <div>
          <label htmlFor={lastNameId} className="mb-1 block text-sm font-medium text-foreground-700">
            Last Name
          </label>
          <Input
            id={lastNameId}
            type="text"
            name="lastName"
            autoComplete="family-name"
            value={lastName}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setLastName(e.target.value)}
            placeholder="Doe"
            className="w-full"
          />
        </div>

        <div>
          <label htmlFor={emailId} className="mb-1 block text-sm font-medium text-foreground-700">
            Email <span className="text-red-600">*</span>
          </label>
          <Input
            id={emailId}
            type="email"
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
          <label htmlFor={passwordId} className="mb-1 block text-sm font-medium text-foreground-700">
            Password <span className="text-red-600">*</span>
          </label>
          <Input
            id={passwordId}
            type="password"
            name="password"
            autoComplete="new-password"
            value={password}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
              setIsSubmitted(false);
              setPasswordError(null);
              setPassword(e.target.value);
            }}
            placeholder="••••••••"
            required
            hasError={Boolean(isSubmitted && passwordError)}
            className="w-full"
            aria-describedby={`${passwordConstraintsId} ${isSubmitted && passwordError ? passwordErrorId : ''}`.trim()}
          />
          {isSubmitted && passwordError && (
            <p id={passwordErrorId} className="mt-1 text-xs text-red-600" role="alert">
              {passwordError}
            </p>
          )}
          <p id={passwordConstraintsId} className="mt-1 text-xs text-foreground-500">
            Min. 8 characters, include uppercase, lowercase, number, and special character.
          </p>
        </div>

        {hasInvitation && (
          <div className="rounded-md bg-blue-50 p-4">
            <p className="text-sm text-blue-700">You&apos;ll be joining an organization after creating your account.</p>
          </div>
        )}

        {error && (
          <div className="rounded-md bg-red-50 p-4" role="alert">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        <Button type="submit" disabled={isLoading} variant="primary" mode="filled" className="!mt-6 w-full">
          {isLoading ? 'Creating Account...' : 'Create Account'}
        </Button>

        <p className="mt-4 text-center text-sm text-foreground-600">
          Already have an account?{' '}
          <Link
            to={ROUTES.SIGN_IN}
            className="font-medium text-primary-base hover:underline focus:outline-none focus:ring-2 focus:ring-primary-base/50"
          >
            Sign In
          </Link>
        </p>
      </form>
    </div>
  );
}
