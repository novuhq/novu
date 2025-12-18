import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/primitives/button';
import { Input } from '@/components/primitives/input';
import { ROUTES } from '@/utils/routes';
import { authClient } from '../client';

export function SignUp() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [organizationName, setOrganizationName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);

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

    if (!organizationName.trim()) {
      setError('Organization name is required.');
      setIsLoading(false);

      return;
    }

    try {
      const { data: signUpData, error: signUpError } = await authClient.signUp.email({
        email,
        password,
        name: `${firstName} ${lastName}`.trim(),
      });

      if (signUpError) {
        throw new Error(signUpError.message || 'Sign up failed');
      }

      if (!signUpData?.token || !signUpData?.user) {
        throw new Error('Sign up failed');
      }

      localStorage.setItem('better-auth-session-token', signUpData.token);

      const { data: orgData, error: orgError } = await authClient.organization.create({
        name: organizationName,
        slug: organizationName.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      });

      if (orgError) {
        console.error('Failed to create organization:', orgError);
      }

      if (orgData?.id) {
        await authClient.organization.setActive({
          organizationId: orgData.id,
        });
      }

      window.location.href = ROUTES.ROOT;
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
          <label htmlFor="firstName" className="mb-1 block text-sm font-medium text-gray-700">
            First Name <span className="text-red-600">*</span>
          </label>
          <Input
            type="text"
            id="firstName"
            value={firstName}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFirstName(e.target.value)}
            placeholder="John"
            required
            className="w-full"
          />
        </div>
        <div>
          <label htmlFor="lastName" className="mb-1 block text-sm font-medium text-gray-700">
            Last Name
          </label>
          <Input
            type="text"
            id="lastName"
            value={lastName}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setLastName(e.target.value)}
            placeholder="Doe"
            className="w-full"
          />
        </div>
        <div>
          <label htmlFor="email" className="mb-1 block text-sm font-medium text-gray-700">
            Email <span className="text-red-600">*</span>
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
        <div>
          <label htmlFor="password" className="mb-1 block text-sm font-medium text-gray-700">
            Password <span className="text-red-600">*</span>
          </label>
          <Input
            type="password"
            id="password"
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
          <p className="mt-1 text-xs text-gray-500" id="password-constraints">
            Min. 8 characters, include uppercase, lowercase, number, and special character.
          </p>
        </div>
        <div>
          <label htmlFor="organizationName" className="mb-1 block text-sm font-medium text-gray-700">
            Organization Name <span className="text-red-600">*</span>
          </label>
          <Input
            type="text"
            id="organizationName"
            value={organizationName}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setOrganizationName(e.target.value)}
            placeholder="Your Company"
            required
            className="w-full"
          />
        </div>
        {error && (
          <div className="rounded-md bg-red-50 p-4" role="alert">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}
        <Button type="submit" disabled={isLoading} variant="primary" mode="filled" className="!mt-6 w-full">
          {isLoading ? 'Creating Account...' : 'Create Account'}
        </Button>
        <p className="mt-4 text-center text-sm text-gray-600">
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
