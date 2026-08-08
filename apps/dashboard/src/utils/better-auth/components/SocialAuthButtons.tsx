import { useState } from 'react';
import { Button } from '@/components/primitives/button';
import { ROUTES } from '@/utils/routes';
import { authClient } from '../client';

interface SocialAuthProps {
  callbackURL?: string;
  disabled?: boolean;
}

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
      />
    </svg>
  );
}

function GitHubIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
      />
    </svg>
  );
}

export function SocialAuthButtons({ callbackURL, disabled }: SocialAuthProps) {
  const [loadingProvider, setLoadingProvider] = useState<'google' | 'github' | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSocialSignIn = async (provider: 'google' | 'github') => {
    setLoadingProvider(provider);
    setError(null);

    try {
      const { error: authError } = await authClient.signIn.social({
        provider,
        callbackURL: callbackURL || `${window.location.origin}${ROUTES.SIGNUP_ORGANIZATION_LIST}`,
      });

      if (authError) {
        throw new Error(authError.message || `Failed to sign in with ${provider}`);
      }
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Social sign-in failed.';
      setError(message);
      setLoadingProvider(null);
    }
  };

  const isDisabled = disabled || loadingProvider !== null;

  return (
    <div className="space-y-3">
      {error && (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      )}

      <div className="grid grid-cols-2 gap-3">
        <Button
          type="button"
          variant="secondary"
          mode="outline"
          disabled={isDisabled}
          onClick={() => handleSocialSignIn('google')}
          className="flex items-center justify-center gap-2 w-full"
        >
          <GoogleIcon className="h-4 w-4" />
          <span>{loadingProvider === 'google' ? 'Connecting...' : 'Google'}</span>
        </Button>

        <Button
          type="button"
          variant="secondary"
          mode="outline"
          disabled={isDisabled}
          onClick={() => handleSocialSignIn('github')}
          className="flex items-center justify-center gap-2 w-full"
        >
          <GitHubIcon className="h-4 w-4" />
          <span>{loadingProvider === 'github' ? 'Connecting...' : 'GitHub'}</span>
        </Button>
      </div>
    </div>
  );
}
