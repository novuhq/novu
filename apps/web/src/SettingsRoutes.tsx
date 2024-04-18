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
import { AccessSecurityPage, ApiKeysPage, TeamPage, UserProfilePage } from './pages/settings';
import { SettingsPage as SettingsPageOld } from './pages/settings/SettingsPage';
import { SettingsPageNew as SettingsPage } from './pages/settings/SettingsPageNew';
import { ApiKeysCard } from './pages/settings/tabs';
import { EmailSettings } from './pages/settings/tabs/EmailSettings';
import { OrganizationPage } from './pages/settings/organization';
import { WebhookPage } from './pages/settings/WebhookPage';

/** Note: using a hook is the only way to separate routes */
export const useSettingsRoutes = () => {
  const isInformationArchitectureEnabled = useFeatureFlag(FeatureFlagsKeysEnum.IS_INFORMATION_ARCHITECTURE_ENABLED);

  return isInformationArchitectureEnabled ? (
    <>
      <Route path={ROUTES.SETTINGS} element={<SettingsPage />}>
        <Route path={ROUTES.API_KEYS} element={<ApiKeysPage />} />
        <Route path={ROUTES.PROFILE} element={<UserProfilePage />} />
        <Route path={ROUTES.BRAND_SETTINGS} element={<BrandingPage />} />
        {/* TODO: replace with actual component */}
        <Route path={ROUTES.ORGANIZATION} element={<OrganizationPage />} />
        <Route path={ROUTES.TEAM_SETTINGS} element={<TeamPage />} />
        <Route path={ROUTES.BILLING} element={<BillingRoutes />} />
        <Route path={ROUTES.WEBHOOK} element={<WebhookPage />} />
        <Route path={ROUTES.SECURITY} element={<AccessSecurityPage />} />
        {/* Default settings route in case we didn't match with the existing */}
        <Route path={`${ROUTES.SETTINGS}/*`} element={<Navigate to={ROUTES.PROFILE} replace />} />
        <Route path={`${ROUTES.SETTINGS}`} element={<Navigate to={ROUTES.PROFILE} replace />} />
      </Route>
    </>
  ) : (
    <Route path={ROUTES.SETTINGS} element={<SettingsPageOld />}>
      <Route path="" element={<ApiKeysCard />} />
      <Route path="billing/*" element={<BillingRoutes />} />
      <Route path="email" element={<EmailSettings />} />
      <Route path="team" element={<MembersInvitePageNew />} />
      <Route path="brand" element={<BrandingFormOld />} />
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
    </Route>
  );
};
