import { SignedIn, SignedOut } from '@clerk/clerk-react';
import { Route } from 'react-router-dom';
import { PublicPageLayout } from '../../components/layout/components/PublicPageLayout';
import { ROUTES } from '../../constants/routes';
import OrganizationListPage from './pages/OrganizationListPage';
import QuestionnairePage from './pages/QuestionnairePage';
import SignInPage from './pages/SignInPage';
import SignUpPage from './pages/SignUpPage';

export const ClerkRoutes = () => {
  return (
    <>
      <Route
        element={
          <SignedOut>
            <PublicPageLayout />
          </SignedOut>
        }
      >
        <Route path={ROUTES.AUTH_SIGNUP + '/*'} element={<SignUpPage />} />
        <Route path={ROUTES.AUTH_LOGIN + '/*'} element={<SignInPage />} />
      </Route>
      <Route
        element={
          <SignedIn>
            <PublicPageLayout />
          </SignedIn>
        }
      >
        <Route path={ROUTES.AUTH_SIGNUP_ORGANIZATION_LIST} element={<OrganizationListPage />} />
        <Route path={ROUTES.AUTH_APPLICATION} element={<QuestionnairePage />} />
      </Route>
    </>
  );
};
