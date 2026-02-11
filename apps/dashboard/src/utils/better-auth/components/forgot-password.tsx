import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/primitives/button';
import { Input } from '@/components/primitives/input';
import { ROUTES } from '@/utils/routes';
import { authClient } from '../client';

export function ForgotPassword() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const redirectUrl = `${window.location.origin}${ROUTES.RESET_PASSWORD}`;

      const { error: authError } = await authClient.requestPasswordReset({
        email,
        redirectTo: redirectUrl,
      });

      if (authError) {
        throw new Error(authError.message || 'Failed to send reset email');
      }

      setEmailSent(true);
    } catch (e: any) {
      console.error('Forgot password error:', e);
      setError(e.message || 'An unexpected error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  if (emailSent) {
    return (
      <div className="mx-auto w-full max-w-md pt-12">
        <h2 className="mb-6 text-center text-xl font-semibold">Check Your Email</h2>
        <div className="space-y-6">
          <p className="text-center text-sm text-foreground-600">
            We've sent a password reset link to <strong>{email}</strong>. Please check your email and click the link to
            reset your password.
          </p>
          <Button variant="primary" mode="filled" className="w-full" onClick={() => navigate(ROUTES.SIGN_IN)}>
            Back to Sign In
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-md pt-12">
      <h2 className="mb-6 text-center text-xl font-semibold">Forgot Password</h2>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor="email" className="mb-1 block text-sm font-medium text-foreground-700">
            Email
          </label>
          <Input
            type="email"
            id="email"
            value={email}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
            placeholder="user@example.com"
            required
            className="w-full"
          />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <Button type="submit" disabled={isLoading} variant="primary" mode="filled" className="w-full">
          {isLoading ? 'Sending...' : 'Send Reset Link'}
        </Button>
        <p className="mt-4 text-center text-sm text-foreground-600">
          Remember your password?{' '}
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
