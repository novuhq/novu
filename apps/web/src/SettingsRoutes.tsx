import { Route, Navigate } from 'react-router-dom';
import { Cloud, SSO, UserAccess } from '@novu/design-system';
import { FeatureFlagsKeysEnum } from '@novu/shared';

import { ProductLead } from './components/utils/ProductLead';
import { ROUTES } from './constants/routes.enum';
import { useFeatureFlag } from './hooks';
import { BillingRoutes } from './pages/BillingPages';
import { BrandingForm as BrandingFormOld } from './pages/brand/tabs';
import { BrandingPage } from './pages/brand/tabs/v2';
import { MembersInvitePage as MembersInvitePageNew } from './pages/invites/v2/MembersInvitePage';
import { AccessSecurityPage, ApiKeysPage, BillingPage, TeamPage, UserProfilePage } from './pages/settings';
import { SettingsPage as SettingsPageOld } from './pages/settings/SettingsPage';
import { SettingsPageNew as SettingsPage } from './pages/settings/SettingsPageNew';
import { ApiKeysCard } from './pages/settings/tabs';
import { EmailSettings } from './pages/settings/tabs/EmailSettings';
import { OrganizationPage } from './pages/settings/organization';
import { WebhookPage } from './pages/settings/WebhookPage';

/** Note: using a hook is the only way to separate routes */
export const useSettingsRoutes = () => {
  const isInformationArchitectureEnabled = useFeatureFlag(FeatureFlagsKeysEnum.IS_INFORMATION_ARCHITECTURE_ENABLED);

  return (
    <>
      <Route path={ROUTES.SETTINGS} element={isInformationArchitectureEnabled ? <SettingsPage /> : <SettingsPageOld />}>
        <Route
          path=""
          element={isInformationArchitectureEnabled ? <Navigate to={ROUTES.PROFILE} replace /> : <ApiKeysCard />}
        />
        <Route path="billing/*" element={<BillingRoutes />} />
        <Route path="email" element={<EmailSettings />} />
        <Route path="team" element={<MembersInvitePageNew />} />
        <Route path="brand" element={<BrandingFormOld />} />
        {/* ensure legacy routes re-route to base settings page */}
        <Route
          path="permissions"
          element={
            !isInformationArchitectureEnabled ? (
              <ProductLead
                icon={<UserAccess />}
                id="rbac-permissions"
                title="Role-based access control"
                text="Securely manage users' permissions to access system resources."
                closeable={false}
              />
            ) : (
              <Navigate to={ROUTES.SECURITY} replace />
            )
          }
        />
        <Route
          path="sso"
          element={
            !isInformationArchitectureEnabled ? (
              <ProductLead
                icon={<SSO />}
                id="sso-settings"
                title="Single Sign-On (SSO)"
                text="Simplify user authentication and enhance security."
                closeable={false}
              />
            ) : (
              <Navigate to={ROUTES.SETTINGS} replace />
            )
          }
        />
        <Route
          path="data-integrations"
          element={
            !isInformationArchitectureEnabled ? (
              <ProductLead
                icon={<Cloud />}
                id="data-integrations-settings"
                title="Data Integrations"
                text="Share data with 3rd party services via Segment and Datadog integrations to monitor analytics."
                closeable={false}
              />
            ) : (
              <Navigate to={ROUTES.SETTINGS} replace />
            )
          }
        />
        {/* TODO: remove all routes above once information architecture is fully enabled */}
        {isInformationArchitectureEnabled && (
          <>
            <Route path={ROUTES.API_KEYS} element={<ApiKeysPage />} />
            <Route path={ROUTES.PROFILE} element={<UserProfilePage />} />
            <Route path={ROUTES.BRAND_SETTINGS} element={<BrandingPage />} />
            <Route path={ROUTES.ORGANIZATION} element={<OrganizationPage />} />
            <Route path={ROUTES.TEAM_SETTINGS} element={<TeamPage />} />
            <Route path={`${ROUTES.BILLING}/*`} element={<BillingPage />} />
            <Route path={ROUTES.WEBHOOK} element={<WebhookPage />} />
            <Route path={ROUTES.SECURITY} element={<AccessSecurityPage />} />
            <Route path={`${ROUTES.SETTINGS}`} element={<Navigate to={ROUTES.PROFILE} replace />} />
          </>
        )}
        <Route path={`${ROUTES.SETTINGS}/*`} element={<Navigate to={ROUTES.SETTINGS} replace />} />
      </Route>
    </>
  );
};
