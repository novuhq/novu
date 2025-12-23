import { ResetPassword as ResetPasswordForm } from '@clerk/clerk-react';
import { AuthSideBanner } from '../components/auth/auth-side-banner';
import { PageMeta } from '../components/page-meta';
import { ROUTES } from '../utils/routes';

export const ResetPasswordPage = () => {
  return (
    <div className="flex min-h-screen w-full flex-col md:max-w-[1100px] md:flex-row md:gap-36">
      <PageMeta title="Reset password" />
      <div className="w-full md:w-auto">
        <AuthSideBanner />
      </div>
      <div className="flex flex-1 justify-end px-4 py-8 md:items-center md:px-0 md:py-0">
        <div className="flex w-full max-w-[400px] flex-col items-start justify-start gap-[18px]">
          <ResetPasswordForm path={ROUTES.RESET_PASSWORD} />
        </div>
      </div>
    </div>
  );
};
