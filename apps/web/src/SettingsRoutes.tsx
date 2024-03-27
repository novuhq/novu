import { Cloud, IconLockPerson, SSO, UserAccess } from '@novu/design-system';
import { FeatureFlagsKeysEnum } from '@novu/shared';
import { Route } from 'react-router-dom';
import { ProductLead } from './components/utils/ProductLead';
import { ROUTES } from './constants/routes.enum';
import { useFeatureFlag } from './hooks';
import { BillingRoutes } from './pages/BillingPages';
import { BrandingForm } from './pages/brand/tabs';
import { MembersInvitePage as MembersInvitePageNew } from './pages/invites/v2/MembersInvitePage';
import { SettingsPage } from './pages/settings/SettingsPage';
import { ApiKeysCard } from './pages/settings/tabs';
import { EmailSettings } from './pages/settings/tabs/EmailSettings';

/** Note: using a hook is the only way to separate routes */
export const useSettingsRoutes = () => {
  const isInformationArchitectureEnabled = useFeatureFlag(FeatureFlagsKeysEnum.IS_INFORMATION_ARCHITECTURE_ENABLED);

  return isInformationArchitectureEnabled ? (
    <>
      {/* TODO: this should redirect to Profile */}
      <Route path={ROUTES.SETTINGS} element={<SettingsPage />}>
        {/* TODO: replace with actual component */}
        <Route path={''} element={<ApiKeysCard />} />
        {/* TODO: replace with actual component */}
        <Route path={ROUTES.PROFILE} element={<ApiKeysCard />} />
        <Route path={ROUTES.BRAND_SETTINGS} element={<BrandingForm />} />
        {/* TODO: replace with actual component */}
        <Route path={ROUTES.ORGANIZATION} element={<ApiKeysCard />} />
        <Route path={ROUTES.TEAM_SETTINGS} element={<MembersInvitePageNew />} />
        <Route path={ROUTES.BILLING} element={<BillingRoutes />} />
        <Route path={ROUTES.API_KEYS} element={<ApiKeysCard />} />
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
      </Route>
    </>
  ) : (
    <Route path={ROUTES.SETTINGS} element={<SettingsPage />}>
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
