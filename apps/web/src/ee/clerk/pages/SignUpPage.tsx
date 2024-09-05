import { SignUp } from '@clerk/clerk-react';
import { PageMeta } from '@novu/design-system';
import { useEffect } from 'react';
import AuthLayout from '../../../components/layout/components/AuthLayout';
import { ROUTES } from '../../../constants/routes';
import { useVercelParams } from '../../../hooks/useVercelParams';

export default function SignUpPage() {
  const { params, isFromVercel } = useVercelParams();

  useEffect(() => {
    if (isFromVercel) {
      localStorage.setItem(
        'vercel_redirect_data',
        JSON.stringify({
          params: params.toString(),
          isFromVercel,
          date: new Date().toISOString(),
        })
      );
    }
  }, [isFromVercel, params]);

  return (
    <AuthLayout>
      <PageMeta title="Sign up" />
      <SignUp
        path={ROUTES.AUTH_SIGNUP}
        signInUrl={ROUTES.AUTH_LOGIN}
        forceRedirectUrl={ROUTES.AUTH_SIGNUP_ORGANIZATION_LIST}
      />
    </AuthLayout>
  );
}
