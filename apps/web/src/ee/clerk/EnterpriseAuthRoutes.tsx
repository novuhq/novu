import { SignedIn, SignedOut } from '@clerk/clerk-react';
import { Navigate, Route } from 'react-router-dom';
import { PublicPageLayout } from '../../components/layout/components/PublicPageLayout';
import { ROUTES } from '../../constants/routes';
import OrganizationListPage from './pages/OrganizationListPage';
import ManageAccountPage from './pages/ManageAccountPage';
import SignInPage from './pages/SignInPage';
import SignUpPage from './pages/SignUpPage';
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
  return (
    <>
      <Route element={<EnterprisePublicAuthLayout />}>
        <Route path={`${ROUTES.AUTH_SIGNUP}/*`} element={<SignUpPage />} />
        <Route path={`${ROUTES.AUTH_LOGIN}/*`} element={<SignInPage />} />
      </Route>
      <Route element={<EnterprisePrivateAuthLayout />}>
        <Route path={ROUTES.AUTH_SIGNUP_ORGANIZATION_LIST} element={<OrganizationListPage />} />
      </Route>
      <Route element={<PrivatePageLayout />}>
        <Route path="/manage-account/:tabValue" element={<ManageAccountPage />} />
      </Route>
    </>
  );
};
