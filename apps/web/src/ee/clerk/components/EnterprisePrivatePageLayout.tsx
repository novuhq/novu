import { SignedIn, SignedOut } from '@clerk/clerk-react';
import { Navigate } from 'react-router-dom';
import { PrivatePageLayout } from '../../../components/layout/components/PrivatePageLayout';
import { ROUTES } from '../../../constants/routes';

export const EnterprisePrivatePageLayout = () => (
  <>
    <SignedIn>
      <PrivatePageLayout />
    </SignedIn>
    <SignedOut>
      <Navigate to={ROUTES.AUTH_LOGIN} replace />
    </SignedOut>
  </>
);
