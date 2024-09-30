import { SignUp as SignUpForm } from '@clerk/clerk-react';
import { PageMeta } from '@/components/page-meta';
import { ROUTES } from '@/utils/routes';

export const SignUp = () => {
  return (
    <>
      <PageMeta title="Sign up" />
      <SignUpForm
        path={ROUTES.AUTH_SIGN_UP}
        signInUrl={ROUTES.AUTH_SIGN_IN}
        forceRedirectUrl={ROUTES.AUTH_SIGNUP_ORGANIZATION_LIST}
      />
    </>
  );
};
