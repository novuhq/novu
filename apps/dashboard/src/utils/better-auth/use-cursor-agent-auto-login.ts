import { useEffect, useRef, useState } from 'react';
import { CURSOR_AGENT_AUTO_LOGIN, CURSOR_AGENT_SEED_EMAIL, CURSOR_AGENT_SEED_PASSWORD } from '@/config';
import { authClient } from './client';

type AutoLoginStatus = 'idle' | 'pending' | 'failed';

export function useCursorAgentAutoLogin({
  isLoaded,
  isSignedIn,
  refreshSession,
}: {
  isLoaded: boolean;
  isSignedIn: boolean;
  refreshSession: () => Promise<void>;
}) {
  const [status, setStatus] = useState<AutoLoginStatus>('idle');
  const attemptedRef = useRef(false);

  useEffect(() => {
    if (!CURSOR_AGENT_AUTO_LOGIN) {
      return;
    }

    if (!CURSOR_AGENT_SEED_EMAIL || !CURSOR_AGENT_SEED_PASSWORD) {
      console.warn(
        '[cursor-agent] VITE_CURSOR_AGENT_AUTO_LOGIN is enabled but VITE_AGENT_SEED_EMAIL or VITE_AGENT_SEED_PASSWORD is missing'
      );

      return;
    }

    if (!isLoaded || isSignedIn || attemptedRef.current) {
      return;
    }

    attemptedRef.current = true;
    setStatus('pending');

    async function runAutoLogin() {
      try {
        const { data, error } = await authClient.signIn.email({
          email: CURSOR_AGENT_SEED_EMAIL,
          password: CURSOR_AGENT_SEED_PASSWORD,
        });

        if (error || !data?.token) {
          throw new Error(error?.message || 'Auto sign-in failed');
        }

        localStorage.setItem('better-auth-session-token', data.token);

        const { data: organizations, error: listError } = await authClient.organization.list();

        if (listError) {
          throw new Error(listError.message || 'Failed to list organizations');
        }

        const firstOrg = organizations?.[0];

        if (firstOrg?.id) {
          const { error: activeError } = await authClient.organization.setActive({
            organizationId: firstOrg.id,
          });

          if (activeError) {
            throw new Error(activeError.message || 'Failed to set active organization');
          }
        }

        await refreshSession();
        setStatus('idle');
      } catch (err) {
        console.warn('[cursor-agent] Auto sign-in failed; use the sign-in form.', err);
        attemptedRef.current = false;
        setStatus('failed');
      }
    }

    void runAutoLogin();
  }, [isLoaded, isSignedIn, refreshSession]);

  return {
    isAutoLoginPending: CURSOR_AGENT_AUTO_LOGIN && status === 'pending',
    isAutoLoginFailed: CURSOR_AGENT_AUTO_LOGIN && status === 'failed',
  };
}
