import { SignUp as SignUpForm } from '@clerk/clerk-react';
import { PageMeta } from '@/components/page-meta';
import { ROUTES } from '@/utils/routes';

export const SignUpPage = () => {
  return (
    <>
      <PageMeta title="Sign up" />
      <SignUpForm path={ROUTES.SIGN_UP} signInUrl={ROUTES.SIGN_IN} forceRedirectUrl={ROUTES.SIGNUP_ORGANIZATION_LIST} />
    </>
  );
};
