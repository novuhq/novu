import { ROUTES } from '@/utils/routes';
import { SignIn as SignInForm } from '@clerk/clerk-react';
import { PageMeta } from '../components/page-meta';

export const SignIn = () => {
  return (
    <>
      <PageMeta title="Sign in" />
      <SignInForm path={ROUTES.AUTH_SIGN_IN} signUpUrl={ROUTES.AUTH_SIGN_UP} />
    </>
  );
};
