import { SignUp } from '@clerk/clerk-react';
import AuthLayout from '../../../components/layout/components/AuthLayout';
import { ROUTES } from '../../../constants/routes';

export default function SignUpPage() {
  return (
    <AuthLayout>
      <SignUp
        path={ROUTES.AUTH_SIGNUP}
        signInUrl={ROUTES.AUTH_LOGIN}
        forceRedirectUrl={ROUTES.AUTH_SIGNUP_ORGANIZATION_LIST}
      />
    </AuthLayout>
  );
}
