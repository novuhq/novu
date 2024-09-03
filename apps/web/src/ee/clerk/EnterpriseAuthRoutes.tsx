import { SignedIn, SignedOut, useAuth } from '@clerk/clerk-react';
import { Navigate, Route } from 'react-router-dom';
import { PublicPageLayout } from '../../components/layout/components/PublicPageLayout';
import { ROUTES } from '../../constants/routes';
import OrganizationListPage from './pages/OrganizationListPage';
import QuestionnairePage from './pages/QuestionnairePage';
import ManageAccountPage from './pages/ManageAccountPage';
import SignInPage from './pages/SignInPage';
import SignUpPage from './pages/SignUpPage';
import { useEffectOnce, useVercelIntegration, useVercelParams } from '../../hooks';
import { PrivatePageLayout } from '../../components/layout/components/PrivatePageLayout';

const EnterprisePublicAuthLayout = () => {
  return (
    <SignedOut>
      <PublicPageLayout />
    </SignedOut>
  );
};

// private but we want appearance of public layout
const EnterprisePrivateAuthLayout = () => {
  return (
    <>
      <SignedIn>
        <PublicPageLayout />
      </SignedIn>
      <SignedOut>
        <Navigate to={ROUTES.AUTH_LOGIN} replace />
      </SignedOut>
    </>
  );
};

export const EnterpriseAuthRoutes = () => {
  const { isSignedIn } = useAuth();
  const { startVercelSetup } = useVercelIntegration();
  const { isFromVercel } = useVercelParams();

  useEffectOnce(
    () => {
      if (isSignedIn && isFromVercel) {
        startVercelSetup();
      }
    },
    !!(isSignedIn && isFromVercel)
  );

  return (
    <>
      <Route element={<EnterprisePublicAuthLayout />}>
        <Route path={`${ROUTES.AUTH_SIGNUP}/*`} element={<SignUpPage />} />
        <Route path={`${ROUTES.AUTH_LOGIN}/*`} element={<SignInPage />} />
      </Route>
      <Route element={<EnterprisePrivateAuthLayout />}>
        <Route path={ROUTES.AUTH_SIGNUP_ORGANIZATION_LIST} element={<OrganizationListPage />} />
        <Route path={ROUTES.AUTH_APPLICATION} element={<QuestionnairePage />} />
      </Route>
      <Route element={<PrivatePageLayout />}>
        <Route path="/manage-account/:tabValue" element={<ManageAccountPage />} />
      </Route>
    </>
  );
};
