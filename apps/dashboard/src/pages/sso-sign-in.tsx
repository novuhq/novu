import { Navigate } from 'react-router-dom';
import { EE_AUTH_PROVIDER } from '@/config';
import { SSOSignIn } from '@/utils/better-auth/components/sso-sign-in';
import { ROUTES } from '@/utils/routes';
import { AuthSideBanner } from '../components/auth/auth-side-banner';
import { PageMeta } from '../components/page-meta';

export const SSOSignInPage = () => {
  if (EE_AUTH_PROVIDER === 'clerk') {
    return <Navigate to={ROUTES.SIGN_IN} replace />;
  }

  return (
    <div className="flex min-h-screen w-full flex-col md:max-w-[1100px] md:flex-row md:gap-36">
      <PageMeta title="SSO Sign In" />
      <div className="w-full md:w-auto">
        <AuthSideBanner />
      </div>
      <div className="flex flex-1 justify-end px-4 py-8 md:items-center md:px-0 md:py-0">
        <div className="flex w-full max-w-[400px] flex-col items-start justify-start gap-[18px]">
          <SSOSignIn />
        </div>
      </div>
    </div>
  );
};
