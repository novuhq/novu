import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/primitives/button';
import { Input } from '@/components/primitives/input';
import { ROUTES } from '@/utils/routes';
import { authClient } from '../client';
import { useAuth } from '../index';

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

export function SignUp() {
  const { refreshSession } = useAuth();

  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const redirectUrl = searchParams.get('redirect');
  const pendingInvitationId =
    extractInvitationIdFromRedirect(redirectUrl) || sessionStorage.getItem('pendingInvitationId');
  const hasInvitation = !!pendingInvitationId;

  const validatePassword = (password: string) => {
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const hasSpecialChar = /[#?!@$%^&*()-]/.test(password);
    const isLengthValid = password.length >= 8 && password.length <= 64;

    if (!isLengthValid) {
      return 'Password must be between 8 and 64 characters';
    }

    if (!hasUpperCase) {
      return 'Password must contain at least one uppercase letter';
    }

    if (!hasLowerCase) {
      return 'Password must contain at least one lowercase letter';
    }

    if (!hasNumber) {
      return 'Password must contain at least one number';
    }

    if (!hasSpecialChar) {
      return 'Password must contain at least one special character (#?!@$%^&*()-)';
    }

    return null;
  };

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
        callbackURL: window.location.origin + ROUTES.SIGN_IN,
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

      await refreshSession();

      localStorage.setItem('better-auth-session-token', signUpData.token);

      if (pendingInvitationId) {
        navigate(`${ROUTES.INVITATION_ACCEPT}?id=${pendingInvitationId}`);

        return;
      }

      navigate(ROUTES.SIGNUP_ORGANIZATION_LIST);
    } catch (e: any) {
      setError(e.message || 'An unexpected error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-md pt-12">
      <h2 className="mb-6 text-center text-xl font-semibold">Create Account</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="firstName" className="mb-1 block text-sm font-medium text-foreground-700">
            First Name <span className="text-red-600">*</span>
          </label>
          <Input
            type="text"
            value={firstName}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFirstName(e.target.value)}
            placeholder="John"
            required
            className="w-full"
          />
        </div>
        <div>
          <label htmlFor="lastName" className="mb-1 block text-sm font-medium text-foreground-700">
            Last Name
          </label>
          <Input
            type="text"
            value={lastName}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setLastName(e.target.value)}
            placeholder="Doe"
            className="w-full"
          />
        </div>
        <div>
          <label htmlFor="email" className="mb-1 block text-sm font-medium text-foreground-700">
            Email <span className="text-red-600">*</span>
          </label>
          <Input
            type="email"
            value={email}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
            placeholder="user@example.com"
            required
            className="w-full"
          />
        </div>
        <div>
          <label htmlFor="password" className="mb-1 block text-sm font-medium text-foreground-700">
            Password <span className="text-red-600">*</span>
          </label>
          <Input
            type="password"
            value={password}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
              setIsSubmitted(false);
              setPassword(e.target.value);
            }}
            placeholder="••••••••"
            required
            hasError={Boolean(isSubmitted && passwordError)}
            className="w-full"
            aria-describedby="password-constraints"
          />
          <p className="mt-1 text-xs text-foreground-500">
            Min. 8 characters, include uppercase, lowercase, number, and special character.
          </p>
        </div>
        {hasInvitation && (
          <div className="rounded-md bg-blue-50 p-4">
            <p className="text-sm text-blue-700">You'll be joining an organization after creating your account.</p>
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
          <span
            role="button"
            tabIndex={0}
            className="text-primary-base focus:ring-primary-base/50 cursor-pointer font-medium hover:underline focus:outline-none focus:ring-2"
            onClick={() => navigate(ROUTES.SIGN_IN)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') navigate(ROUTES.SIGN_IN);
            }}
          >
            Sign In
          </span>
        </p>
      </form>
    </div>
  );
}
