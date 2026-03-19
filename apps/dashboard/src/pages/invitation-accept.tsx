import { Navigate } from 'react-router-dom';
import { AuthSideBanner } from '@/components/auth/auth-side-banner';
import { PageMeta } from '@/components/page-meta';
import { EE_AUTH_PROVIDER } from '@/config';
import { InvitationAccept as BetterAuthInvitationAccept } from '@/utils/better-auth/components/invitation-accept';
import { ROUTES } from '@/utils/routes';

export function InvitationAcceptPage() {
  if (EE_AUTH_PROVIDER === 'clerk') {
    return <Navigate to={ROUTES.SIGNUP_ORGANIZATION_LIST} replace />;
  }

  return (
    <div className="flex min-h-screen w-full flex-col md:max-w-[1100px] md:flex-row md:gap-36">
      <PageMeta title="Accept Invitation" />
      <div className="w-full md:w-auto">
        <AuthSideBanner />
      </div>
      <div className="flex flex-1 justify-end px-4 py-8 md:items-center md:px-0 md:py-0">
        <div className="flex w-full max-w-[500px] flex-col items-start justify-start">
          <BetterAuthInvitationAccept />
        </div>
      </div>
    </div>
  );
}
