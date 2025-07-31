import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../components/primitives/button';
import { Input } from '../../components/primitives/input';
import { API_HOSTNAME } from '../../config';

const JWT_STORAGE_KEY = 'self-hosted-jwt';

export function OrganizationList() {
  return <></>;
}

export function OrganizationProfile() {
  return <></>;
}

export function UserProfile() {
  return <></>;
}

export function SignIn() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const response = await fetch(`${API_HOSTNAME}/v1/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Login failed');
      }

      if (data.data.token) {
        localStorage.setItem(JWT_STORAGE_KEY, data.data.token);
        (window as any).Clerk = { ...((window as any).Clerk || {}), loggedIn: true };
        navigate('/');
      } else {
        throw new Error('No token received');
      }
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
          <label htmlFor="email" className="mb-1 block text-sm font-medium text-gray-700">
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
        <div>
          <label htmlFor="password" className="mb-1 block text-sm font-medium text-gray-700">
            Password
          </label>
          <Input
            type="password"
            id="password"
            value={password}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
            placeholder="Password"
            required
            className="w-full"
          />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <Button type="submit" disabled={isLoading} variant="primary" mode="filled" className="w-full">
          {isLoading ? 'Signing In...' : 'Sign In'}
        </Button>
        <p className="mt-4 text-center text-sm text-gray-600">
          Don&apos;t have an account?{' '}
          <span
            role="button"
            tabIndex={0}
            className="text-primary-base focus:ring-primary-base/50 cursor-pointer font-medium hover:underline focus:outline-none focus:ring-2"
            onClick={() => navigate('/auth/sign-up')}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') navigate('/auth/sign-up');
            }}
          >
            Sign Up
          </span>
        </p>
      </form>
    </div>
  );
}

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
      const response = await fetch(`${API_HOSTNAME}/v1/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          password,
          firstName,
          lastName: lastName || undefined,
          organizationName,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.errors?.general?.messages) {
          setError(data.errors.general.messages[0]);
        } else {
          throw new Error(data.message || 'Sign up failed');
        }

        return;
      }

      if (data.data.token) {
        localStorage.setItem(JWT_STORAGE_KEY, data.data.token);
        (window as any).Clerk = { ...((window as any).Clerk || {}), loggedIn: true };
        navigate('/');
      } else {
        throw new Error('No token received after sign up');
      }
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
            onClick={() => navigate('/auth/sign-in')}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') navigate('/auth/sign-in');
            }}
          >
            Sign In
          </span>
        </p>
      </form>
    </div>
  );
}

export function RedirectToSignIn({ children }: { children: any }) {
  const navigate = useNavigate();

  useEffect(() => {
    if (!(window as any).Clerk.loggedIn) {
      navigate('/auth/sign-in');
    }
  }, [navigate]);

  return <>{children}</>;
}

export function SignedIn({ children }: { children: any }) {
  return <>{children}</>;
}

export function SignedOut({ children }: { children: any }) {
  if ((window as any).Clerk.loggedIn) return null;

  return <>{children}</>;
}
