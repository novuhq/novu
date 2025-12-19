import { useCallback, useEffect, useRef, useState } from 'react';
import { RiCloseLine, RiLoader4Line } from 'react-icons/ri';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/primitives/button';
import { showSuccessToast } from '@/components/primitives/sonner-helpers';
import { ROUTES } from '@/utils/routes';
import { authClient } from '../client';
import { useAuth } from '../index';

export function InvitationAccept() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { isSignedIn, isLoaded, refreshSession } = useAuth();

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const hasAttempted = useRef(false);
  const isRefreshing = useRef(false);

  const invitationId = searchParams.get('id');

  // #region agent log
  useEffect(() => {
    fetch('http://127.0.0.1:7242/ingest/6a9435f8-6f33-4fc0-aa12-0ddad7898770', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        location: 'invitation-accept.tsx:authStateChange',
        message: 'Auth state changed',
        data: { isLoaded, isSignedIn, invitationId, hasAttempted: hasAttempted.current },
        timestamp: Date.now(),
        sessionId: 'debug-session',
        hypothesisId: 'A',
      }),
    }).catch(() => {});
  }, [isLoaded, isSignedIn, invitationId]);
  // #endregion

  const loadInvitation = useCallback(async () => {
    if (hasAttempted.current) {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/6a9435f8-6f33-4fc0-aa12-0ddad7898770', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          location: 'invitation-accept.tsx:alreadyAttempted',
          message: 'Already attempted, skipping',
          data: { hasAttempted: hasAttempted.current },
          timestamp: Date.now(),
          sessionId: 'debug-session',
          hypothesisId: 'B',
        }),
      }).catch(() => {});
      // #endregion

      return;
    }

    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/6a9435f8-6f33-4fc0-aa12-0ddad7898770', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        location: 'invitation-accept.tsx:loadInvitationStart',
        message: 'loadInvitation called',
        data: { invitationId, isSignedIn, isLoaded },
        timestamp: Date.now(),
        sessionId: 'debug-session',
        hypothesisId: 'A,B',
      }),
    }).catch(() => {});
    // #endregion

    if (!invitationId) {
      setError('Invalid invitation link. No invitation ID provided.');
      setIsLoading(false);

      return;
    }

    const hasToken = !!localStorage.getItem('better-auth-session-token');

    if (!isSignedIn && hasToken && !isRefreshing.current) {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/6a9435f8-6f33-4fc0-aa12-0ddad7898770', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          location: 'invitation-accept.tsx:refreshingSession',
          message: 'Token exists but not signed in, refreshing session',
          data: { invitationId, hasToken },
          timestamp: Date.now(),
          sessionId: 'debug-session',
          hypothesisId: 'E',
        }),
      }).catch(() => {});
      // #endregion
      isRefreshing.current = true;
      await refreshSession();

      return;
    }

    if (!isSignedIn) {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/6a9435f8-6f33-4fc0-aa12-0ddad7898770', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          location: 'invitation-accept.tsx:notSignedIn',
          message: 'Not signed in, redirecting to sign-up',
          data: { invitationId },
          timestamp: Date.now(),
          sessionId: 'debug-session',
          hypothesisId: 'A',
        }),
      }).catch(() => {});
      // #endregion
      sessionStorage.setItem('pendingInvitationId', invitationId);
      navigate(`${ROUTES.SIGN_UP}?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`);

      return;
    }

    hasAttempted.current = true;

    try {
      setIsLoading(true);

      // #region agent log
      const sessionToken = localStorage.getItem('better-auth-session-token');
      fetch('http://127.0.0.1:7242/ingest/6a9435f8-6f33-4fc0-aa12-0ddad7898770', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          location: 'invitation-accept.tsx:beforeAccept',
          message: 'About to call acceptInvitation',
          data: { invitationId, hasSessionToken: !!sessionToken, tokenLength: sessionToken?.length },
          timestamp: Date.now(),
          sessionId: 'debug-session',
          hypothesisId: 'C',
        }),
      }).catch(() => {});
      // #endregion

      let acceptData: any = null;
      let acceptError: any = null;

      try {
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/6a9435f8-6f33-4fc0-aa12-0ddad7898770', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            location: 'invitation-accept.tsx:callingAPI',
            message: 'Calling authClient.organization.acceptInvitation',
            data: { invitationId },
            timestamp: Date.now(),
            sessionId: 'debug-session',
            hypothesisId: 'D',
          }),
        }).catch(() => {});
        // #endregion

        const result = await authClient.organization.acceptInvitation({
          invitationId,
        });

        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/6a9435f8-6f33-4fc0-aa12-0ddad7898770', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            location: 'invitation-accept.tsx:apiReturned',
            message: 'API call returned',
            data: { result: JSON.stringify(result).substring(0, 500) },
            timestamp: Date.now(),
            sessionId: 'debug-session',
            hypothesisId: 'D',
          }),
        }).catch(() => {});
        // #endregion

        acceptData = result.data;
        acceptError = result.error;
      } catch (apiError: any) {
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/6a9435f8-6f33-4fc0-aa12-0ddad7898770', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            location: 'invitation-accept.tsx:apiException',
            message: 'API call threw exception',
            data: { error: apiError?.message, name: apiError?.name, stack: apiError?.stack?.substring(0, 300) },
            timestamp: Date.now(),
            sessionId: 'debug-session',
            hypothesisId: 'D',
          }),
        }).catch(() => {});
        // #endregion
        throw apiError;
      }

      if (acceptError) {
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/6a9435f8-6f33-4fc0-aa12-0ddad7898770', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            location: 'invitation-accept.tsx:apiError',
            message: 'API returned error',
            data: { acceptError },
            timestamp: Date.now(),
            sessionId: 'debug-session',
            hypothesisId: 'D',
          }),
        }).catch(() => {});
        // #endregion
        throw new Error(acceptError.message || 'Failed to accept invitation');
      }

      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/6a9435f8-6f33-4fc0-aa12-0ddad7898770', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          location: 'invitation-accept.tsx:acceptSuccess',
          message: 'Invitation accepted successfully',
          data: { organizationId: acceptData?.invitation?.organizationId },
          timestamp: Date.now(),
          sessionId: 'debug-session',
          hypothesisId: 'C',
        }),
      }).catch(() => {});
      // #endregion

      const organizationId = acceptData?.invitation?.organizationId;
      if (organizationId) {
        await authClient.organization.setActive({
          organizationId,
        });
      }

      showSuccessToast('You have joined the organization', 'Invitation Accepted');
      sessionStorage.removeItem('pendingInvitationId');

      navigate(ROUTES.ROOT);
    } catch (e) {
      console.error('Failed to accept invitation:', e);
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/6a9435f8-6f33-4fc0-aa12-0ddad7898770', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          location: 'invitation-accept.tsx:error',
          message: 'Error in loadInvitation',
          data: { error: e instanceof Error ? e.message : String(e) },
          timestamp: Date.now(),
          sessionId: 'debug-session',
          hypothesisId: 'C',
        }),
      }).catch(() => {});
      // #endregion
      setError(e instanceof Error ? e.message : 'Failed to accept invitation');
    } finally {
      setIsLoading(false);
    }
  }, [invitationId, isSignedIn, navigate, isLoaded, refreshSession]);

  useEffect(() => {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/6a9435f8-6f33-4fc0-aa12-0ddad7898770', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        location: 'invitation-accept.tsx:useEffectTrigger',
        message: 'useEffect triggered',
        data: { isLoaded, willCall: isLoaded },
        timestamp: Date.now(),
        sessionId: 'debug-session',
        hypothesisId: 'B',
      }),
    }).catch(() => {});
    // #endregion
    if (isLoaded) {
      loadInvitation();
    }
  }, [isLoaded, loadInvitation]);

  if (isLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-center">
          <RiLoader4Line className="mx-auto size-12 animate-spin text-primary-base" />
          <h2 className="mt-6 text-xl font-semibold text-foreground-950">Accepting Invitation</h2>
          <p className="mt-2 text-sm text-foreground-600">Please wait while we add you to the organization...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="max-w-md text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
            <RiCloseLine className="size-8 text-destructive" />
          </div>
          <h2 className="mb-2 text-xl font-semibold text-foreground-950">Failed to Accept Invitation</h2>
          <p className="mb-6 text-sm text-foreground-600">{error}</p>
          <Button variant="secondary" mode="outline" onClick={() => navigate(ROUTES.ROOT)}>
            Go to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return null;
}
