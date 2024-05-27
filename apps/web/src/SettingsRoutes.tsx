import { Route, Navigate } from 'react-router-dom';
import { Cloud, SSO, UserAccess } from '@novu/design-system';
import { FeatureFlagsKeysEnum } from '@novu/shared';

import { ProductLead } from './components/utils/ProductLead';
import { ROUTES } from './constants/routes.enum';
import { useFeatureFlag } from './hooks';
import { BillingRoutes } from './pages/BillingPages';
import { BrandingPage } from './pages/brand/tabs/v2';
import { MembersInvitePage as MembersInvitePageNew } from './pages/invites/v2/MembersInvitePage';
import { AccessSecurityPage, BillingPage, TeamPage, UserProfilePage } from './pages/settings';
import { SettingsPage as SettingsPageOld } from './pages/settings/SettingsPage';
import { SettingsPageNew as SettingsPage } from './pages/settings/SettingsPageNew';
import { ApiKeysCard } from './pages/settings/tabs';
import { EmailSettings } from './pages/settings/tabs/EmailSettings';
import { OrganizationPage } from './pages/settings/organization';

/** Note: using a hook is the only way to separate routes */
export const useSettingsRoutes = () => {
  const isInformationArchitectureEnabled = useFeatureFlag(FeatureFlagsKeysEnum.IS_INFORMATION_ARCHITECTURE_ENABLED);

  if (isInformationArchitectureEnabled) {
    return (
      <Route path={ROUTES.SETTINGS} element={<SettingsPage />}>
        <Route path="" element={<Navigate to={ROUTES.PROFILE} replace />} />
        <Route path={ROUTES.BRAND_SETTINGS} element={<BrandingPage />} />
        <Route path={ROUTES.ORGANIZATION} element={<OrganizationPage />} />
        <Route path={ROUTES.TEAM_SETTINGS} element={<TeamPage />} />
        <Route path={`${ROUTES.BILLING}/*`} element={<BillingPage />} />
        <Route path={ROUTES.SECURITY} element={<AccessSecurityPage />} />
        <Route path={`${ROUTES.SETTINGS}`} element={<Navigate to={ROUTES.PROFILE} replace />} />
        <Route path="permissions" element={<Navigate to={ROUTES.SECURITY} replace />} />
        <Route path="sso" element={<Navigate to={ROUTES.SETTINGS} replace />} />
        <Route path="data-integrations" element={<Navigate to={ROUTES.SETTINGS} replace />} />
        <Route path={ROUTES.PROFILE} element={<UserProfilePage />} />
        <Route path={`${ROUTES.SETTINGS}/*`} element={<Navigate to={ROUTES.SETTINGS} replace />} />
      </Route>
    );
  }

  /* TODO: remove all routes below once information architecture is fully enabled */
  return (
    <>
      <Route path={ROUTES.SETTINGS} element={<SettingsPageOld />}>
        <Route path="" element={<ApiKeysCard />} />
        <Route path="billing/*" element={<BillingRoutes />} />
        <Route path="email" element={<EmailSettings />} />
        <Route path="team" element={<MembersInvitePageNew />} />
        <Route
          path="permissions"
          element={
            <ProductLead
              icon={<UserAccess />}
              id="rbac-permissions"
              title="Role-based access control"
              text="Securely manage users' permissions to access system resources."
              closeable={false}
            />
          }
        />
        <Route
          path="sso"
          element={
            <ProductLead
              icon={<SSO />}
              id="sso-settings"
              title="Single Sign-On (SSO)"
              text="Simplify user authentication and enhance security."
              closeable={false}
            />
          }
        />
        <Route
          path="data-integrations"
          element={
            <ProductLead
              icon={<Cloud />}
              id="data-integrations-settings"
              title="Data Integrations"
              text="Share data with 3rd party services via Segment and Datadog integrations to monitor analytics."
              closeable={false}
            />
          }
        />
        <Route path={ROUTES.PROFILE} element={<Navigate to={ROUTES.SETTINGS} replace />} />
        <Route path={`${ROUTES.SETTINGS}/*`} element={<Navigate to={ROUTES.SETTINGS} replace />} />
      </Route>
    </>
  );
};
