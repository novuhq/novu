import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/primitives/button';
import { Input } from '@/components/primitives/input';
import { ROUTES } from '@/utils/routes';
import { authClient } from '../client';

export function ResetPassword() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    const tokenFromUrl = searchParams.get('token');

    if (!tokenFromUrl) {
      setError('Invalid or missing reset token. Please request a new password reset.');
    } else {
      setToken(tokenFromUrl);
    }
  }, [searchParams]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    if (!token) {
      setError('Invalid or missing reset token. Please request a new password reset.');

      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');

      return;
    }

    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters long.');

      return;
    }

    setIsLoading(true);

    try {
      const { error: authError } = await authClient.resetPassword({
        newPassword,
        token,
      });

      if (authError) {
        throw new Error(authError.message || 'Failed to reset password');
      }

      navigate(ROUTES.SIGN_IN);
    } catch (e: any) {
      setError(e.message || 'An unexpected error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-md pt-12">
      <h2 className="mb-6 text-center text-xl font-semibold">Reset Password</h2>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor="newPassword" className="mb-1 block text-sm font-medium text-foreground-700">
            New Password
          </label>
          <Input
            type="password"
            id="newPassword"
            value={newPassword}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewPassword(e.target.value)}
            placeholder="Enter new password"
            required
            className="w-full"
            disabled={!token}
          />
        </div>
        <div>
          <label htmlFor="confirmPassword" className="mb-1 block text-sm font-medium text-foreground-700">
            Confirm Password
          </label>
          <Input
            type="password"
            id="confirmPassword"
            value={confirmPassword}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setConfirmPassword(e.target.value)}
            placeholder="Confirm new password"
            required
            className="w-full"
            disabled={!token}
          />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <Button type="submit" disabled={isLoading || !token} variant="primary" mode="filled" className="w-full">
          {isLoading ? 'Resetting...' : 'Reset Password'}
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
            Back to Sign In
          </span>
        </p>
      </form>
    </div>
  );
}
