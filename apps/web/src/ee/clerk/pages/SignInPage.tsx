import { SignIn } from '@clerk/clerk-react';
import AuthLayout from '../../../components/layout/components/AuthLayout';
import { ROUTES } from '../../../constants/routes';

export default function SignInPage() {
  return (
    <AuthLayout>
      <SignIn
        path={ROUTES.AUTH_LOGIN}
        signUpUrl={ROUTES.AUTH_SIGNUP}
        forceRedirectUrl="https://www.loom.com/share/4a0d00f40a644bd7ad4d687aa9145515"
      />
    </AuthLayout>
  );
}
