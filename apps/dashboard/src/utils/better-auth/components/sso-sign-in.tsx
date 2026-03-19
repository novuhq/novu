import { useEffect, useId, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/primitives/button';
import { Input } from '@/components/primitives/input';
import { ROUTES } from '@/utils/routes';
import { authClient } from '../client';

export function SSOSignIn() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const ssoEmailId = useId();
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const errorParam = searchParams.get('error');
    const errorDescription = searchParams.get('error_description');
    if (errorParam) {
      setError(errorDescription || errorParam);
    }
  }, [searchParams]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      if (!email) {
        throw new Error('Please enter your email address');
      }

      const domain = email.split('@')[1]?.trim().toLowerCase();
      if (!domain) {
        throw new Error('Please enter a valid email address');
      }

      await authClient.signIn.sso(
        {
          domain,
          callbackURL: window.location.origin + ROUTES.SIGNUP_ORGANIZATION_LIST,
          errorCallbackURL: window.location.origin + ROUTES.SSO_SIGN_IN,
        },
        {
          onSuccess: () => {
            window.location.href = ROUTES.SIGNUP_ORGANIZATION_LIST;
          },
          onError: (ctx: any) => {
            throw new Error(ctx.error.message || 'SSO sign in failed');
          },
        }
      );
    } catch (e: unknown) {
      const errorMessage = e instanceof Error ? e.message : 'An unexpected error occurred.';
      setError(errorMessage);
      setIsLoading(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-md pt-12">
      <h2 className="mb-6 text-center text-xl font-semibold">Sign In with SSO</h2>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor={ssoEmailId} className="mb-1 block text-sm font-medium text-foreground-700">
            Work Email
          </label>
          <Input
            type="email"
            id={ssoEmailId}
            value={email}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
            placeholder="you@company.com"
            required
            className="w-full"
          />
          <p className="mt-1 text-xs text-foreground-500">
            Enter your work email to sign in with your organization&apos;s SSO provider
          </p>
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <Button type="submit" disabled={isLoading} variant="primary" mode="filled" className="w-full">
          {isLoading ? 'Redirecting...' : 'Continue with SSO'}
        </Button>
        <p className="mt-4 text-center text-sm text-foreground-600">
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
      </form>
    </div>
  );
}
