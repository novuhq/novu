import { Route, Navigate } from 'react-router-dom';
import { Cloud, IconLockPerson, SSO, UserAccess } from '@novu/design-system';
import { FeatureFlagsKeysEnum } from '@novu/shared';

import { ProductLead } from './components/utils/ProductLead';
import { ROUTES } from './constants/routes.enum';
import { useFeatureFlag } from './hooks';
import { BillingRoutes } from './pages/BillingPages';
import { BrandingForm } from './pages/brand/tabs';
import { MembersInvitePage as MembersInvitePageNew } from './pages/invites/v2/MembersInvitePage';
import { ApiKeysPage, UserProfilePage } from './pages/settings';
import { SettingsPage as SettingsPageOld } from './pages/settings/SettingsPage';
import { SettingsPageNew as SettingsPage } from './pages/settings/SettingsPageNew';
import { ApiKeysCard } from './pages/settings/tabs';
import { EmailSettings } from './pages/settings/tabs/EmailSettings';
import { OrganizationPage } from './pages/settings/organization';

/** Note: using a hook is the only way to separate routes */
export const useSettingsRoutes = () => {
  const isInformationArchitectureEnabled = useFeatureFlag(FeatureFlagsKeysEnum.IS_INFORMATION_ARCHITECTURE_ENABLED);

  /*
   * FIXME: reload doesn't work properly with conditional routes,
   * so replace with isInformationArchitectureEnabled before merging
   */
  return true ? (
    <>
      <Route path={ROUTES.SETTINGS} element={<SettingsPage />}>
        <Route path={ROUTES.API_KEYS} element={<ApiKeysPage />} />
        <Route path={ROUTES.PROFILE} element={<UserProfilePage />} />
        <Route path={ROUTES.BRAND_SETTINGS} element={<BrandingForm />} />
        {/* TODO: replace with actual component */}
        <Route path={ROUTES.ORGANIZATION} element={<OrganizationPage />} />
        <Route path={ROUTES.TEAM_SETTINGS} element={<MembersInvitePageNew />} />
        <Route path={ROUTES.BILLING} element={<BillingRoutes />} />
        <Route path={ROUTES.WEBHOOK} element={<EmailSettings />} />
        <Route
          path={ROUTES.SECURITY}
          element={
            <ProductLead
              icon={<IconLockPerson size="24" color="typography.text.secondary" />}
              id="rbac-permissions"
              title="Role-based access control"
              text="Securely manage users' permissions to access system resources."
              closeable={false}
            />
          }
        />
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
      <Route path="brand" element={<BrandingForm />} />
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
