import { ROUTES } from '@/utils/routes';
import { SignIn as SignInForm } from '@clerk/clerk-react';
import { PageMeta } from '../components/page-meta';

export const SignInPage = () => {
  return (
    <>
      <PageMeta title="Sign in" />
      <SignInForm path={ROUTES.SIGN_IN} signUpUrl={ROUTES.SIGN_UP} />
    </>
  );
};
