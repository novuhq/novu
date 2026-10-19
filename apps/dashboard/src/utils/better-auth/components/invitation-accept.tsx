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

  const invitationId = searchParams.get('id');

  const loadInvitation = useCallback(async () => {
    if (!isLoaded) {
      return;
    }

    if (hasAttempted.current) {
      return;
    }

    if (!invitationId) {
      setError('Invalid invitation link. No invitation ID provided.');
      setIsLoading(false);

      return;
    }

    if (!isSignedIn) {
      sessionStorage.setItem('pendingInvitationId', invitationId || '');
      navigate(`${ROUTES.SIGN_UP}?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`);

      return;
    }

    hasAttempted.current = true;

    try {
      setIsLoading(true);

      let acceptData: any = null;
      let acceptError: any = null;

      try {
        const result = await authClient.organization.acceptInvitation({
          invitationId,
        });

        acceptData = result.data;
        acceptError = result.error;
      } catch (apiError: any) {
        throw apiError;
      }

      if (acceptError) {
        throw new Error(acceptError.message || 'Failed to accept invitation');
      }

      const organizationId = acceptData?.invitation?.organizationId;

      if (organizationId) {
        await authClient.organization.setActive({
          organizationId,
        });
      }

      showSuccessToast('You have joined the organization', 'Invitation Accepted');
      sessionStorage.removeItem('pendingInvitationId');

      navigate(ROUTES.INBOX_USECASE);
    } catch (e) {
      console.error('Failed to accept invitation:', e);
      setError(e instanceof Error ? e.message : 'Failed to accept invitation');
    } finally {
      setIsLoading(false);
    }
  }, [invitationId, isSignedIn, navigate, isLoaded]);

  useEffect(() => {
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
          <Button variant="secondary" mode="outline" onClick={() => navigate(ROUTES.INBOX_USECASE)}>
            Go to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return null;
}
