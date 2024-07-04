import { FeatureFlagsKeysEnum } from '@novu/shared';
import { PrivatePageLayout } from './components/layout/components/PrivatePageLayout';
import { PublicPageLayout } from './components/layout/components/PublicPageLayout';
import { Navigate, Route, Routes } from 'react-router-dom';
import { ROUTES } from './constants/routes';
import { useAuth, useFeatureFlag } from './hooks';
import { ActivitiesPage } from './pages/activities/ActivitiesPage';
import InvitationPage from './pages/auth/InvitationPage';
import LoginPage from './pages/auth/LoginPage';
import { PasswordResetPage } from './pages/auth/PasswordResetPage';
import QuestionnairePage from './pages/auth/QuestionnairePage';
import SignUpPage from './pages/auth/SignUpPage';
import { BrandingPage } from './pages/brand/BrandingPage';
import { PromoteChangesPage } from './pages/changes/PromoteChangesPage';
import { GetStartedPage } from './pages/get-started/GetStartedPage';
import HomePage from './pages/HomePage';
import { ApiKeysPage, WebhookPage } from './pages/settings/index';
import { SelectProviderPage } from './pages/integrations/components/SelectProviderPage';
import { CreateProviderPage } from './pages/integrations/CreateProviderPage';
import { IntegrationsListPage } from './pages/integrations/IntegrationsListPage';
import { UpdateProviderPage } from './pages/integrations/UpdateProviderPage';
import { MembersInvitePage } from './pages/invites/MembersInvitePage';
import { LinkVercelProjectPage } from './pages/partner-integrations/LinkVercelProjectPage';
import { DigestPreview } from './pages/quick-start/steps/DigestPreview';
import { FrameworkSetup } from './pages/quick-start/steps/FrameworkSetup';
import { GetStarted } from './pages/quick-start/steps/GetStarted';
import { InAppSuccess } from './pages/quick-start/steps/InAppSuccess';
import { NotificationCenter } from './pages/quick-start/steps/NotificationCenter';
import { Setup } from './pages/quick-start/steps/Setup';
import SubscribersList from './pages/subscribers/SubscribersListPage';
import { ChannelPreview } from './pages/templates/components/ChannelPreview';
import { ChannelStepEditor } from './pages/templates/components/ChannelStepEditor';
import { ProvidersPage } from './pages/templates/components/ProvidersPage';
import { SnippetPage } from './pages/templates/components/SnippetPage';
import { TemplateSettings } from './pages/templates/components/TemplateSettings';
import { TestWorkflowPage } from './pages/templates/components/TestWorkflowPage';
import { UserPreference } from './pages/templates/components/UserPreference';
import { VariantsPage } from './pages/templates/components/VariantsPage';
import TemplateEditorPage from './pages/templates/editor/TemplateEditorPage';
import { TemplatesDigestPlaygroundPage } from './pages/templates/TemplatesDigestPlaygroundPage';
import { Sidebar } from './pages/templates/workflow/SideBar/Sidebar';
import WorkflowListPage from './pages/templates/WorkflowListPage';
import { CreateTenantPage } from './pages/tenants/CreateTenantPage';
import { TenantsPage } from './pages/tenants/TenantsPage';
import { UpdateTenantPage } from './pages/tenants/UpdateTenantPage';
import { TranslationRoutes } from './pages/TranslationPages';
import { StudioOnboarding } from './pages/studio-onboarding/index';
import { StudioOnboardingPreview } from './pages/studio-onboarding/preview';
import { StudioOnboardingSuccess } from './pages/studio-onboarding/success';
import { AccessSecurityPage, BillingPage, TeamPage, UserProfilePage } from './pages/settings';
import { SettingsPageNew as SettingsPage } from './pages/settings/SettingsPageNew';
import { OrganizationPage } from './pages/settings/organization';
import { LayoutsPage } from './pages/layouts/LayoutsPage';
import { StudioPageLayout } from './studio/StudioPageLayout';
import { LocalStudioAuthenticator } from './studio/LocalStudioAuthenticator';
import {
  LocalStudioWorkflowLandingPage,
  WorkflowsDetailPage,
  WorkflowsStepEditorPage,
  WorkflowsTestPage,
} from './studio/components/workflows';
import { WorkflowsStepEditorPageV2 } from './pages/templates/editor_v2/TemplateStepEditorV2';
import { useSegment } from './components/providers/SegmentProvider';
import * as mixpanel from 'mixpanel-browser';
import { useEffect } from 'react';
import { novuOnboardedCookie } from './utils/cookies';

export const AppRoutes = () => {
  const isImprovedOnboardingEnabled = useFeatureFlag(FeatureFlagsKeysEnum.IS_IMPROVED_ONBOARDING_ENABLED);
  const isMixpanelRecordingEnabled = useFeatureFlag(FeatureFlagsKeysEnum.IS_MIXPANEL_RECORDING_ENABLED);
  const segment = useSegment();
  const { inPrivateRoute } = useAuth();

  useEffect(() => {
    if (!segment._mixpanelEnabled) {
      return;
    }

    if (isMixpanelRecordingEnabled && inPrivateRoute) {
      mixpanel.start_session_recording();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMixpanelRecordingEnabled, inPrivateRoute]);

  return (
    <Routes>
      <Route element={<PublicPageLayout />}>
        <Route path={ROUTES.AUTH_SIGNUP} element={<SignUpPage />} />
        <Route path={ROUTES.AUTH_LOGIN} element={<LoginPage />} />
        <Route path={ROUTES.AUTH_RESET_REQUEST} element={<PasswordResetPage />} />
        <Route path={ROUTES.AUTH_RESET_TOKEN} element={<PasswordResetPage />} />
        <Route path={ROUTES.AUTH_INVITATION_TOKEN} element={<InvitationPage />} />
        <Route path={ROUTES.AUTH_APPLICATION} element={<QuestionnairePage />} />
      </Route>
      <Route element={<PrivatePageLayout />}>
        <Route
          path={ROUTES.PARTNER_INTEGRATIONS_VERCEL_LINK_PROJECTS}
          element={<LinkVercelProjectPage type="create" />}
        />
        <Route
          path={ROUTES.PARTNER_INTEGRATIONS_VERCEL_LINK_PROJECTS_EDIT}
          element={<LinkVercelProjectPage type="edit" />}
        />
        <Route path={ROUTES.WORKFLOWS_DIGEST_PLAYGROUND} element={<TemplatesDigestPlaygroundPage />} />
        <Route path={ROUTES.WORKFLOWS_CREATE} element={<TemplateEditorPage />} />
        <Route path={ROUTES.WORKFLOWS_V2_STEP_EDIT} element={<WorkflowsStepEditorPageV2 />} />
        <Route path={ROUTES.WORKFLOWS_V2_TEST} element={<WorkflowsTestPage />} />
        <Route path={ROUTES.WORKFLOWS_EDIT_TEMPLATEID} element={<TemplateEditorPage />}>
          <Route path="" element={<Sidebar />} />
          <Route path="settings" element={<TemplateSettings />} />
          <Route path="channels" element={<UserPreference />} />
          <Route path="test-workflow" element={<TestWorkflowPage />} />
          <Route path="snippet" element={<SnippetPage />} />
          <Route path="providers" element={<ProvidersPage />} />
          <Route path=":channel/:stepUuid" element={<ChannelStepEditor />} />
          <Route path=":channel/:stepUuid/preview" element={<ChannelPreview />} />
          <Route path=":channel/:stepUuid/variants/:variantUuid/preview" element={<VariantsPage />} />
          <Route path=":channel/:stepUuid/variants/:variantUuid" element={<ChannelStepEditor />} />
          <Route path=":channel/:stepUuid/variants/create" element={<VariantsPage />} />
        </Route>
        <Route path={ROUTES.WORKFLOWS} element={<WorkflowListPage />} />
        <Route path={ROUTES.TENANTS} element={<TenantsPage />}>
          <Route path="create" element={<CreateTenantPage />} />
          <Route path=":identifier" element={<UpdateTenantPage />} />
        </Route>
        {isImprovedOnboardingEnabled ? (
          <Route path={ROUTES.GET_STARTED} element={<GetStartedPage />} />
        ) : (
          <Route path={ROUTES.GET_STARTED} element={<GetStarted />} />
        )}
        <Route path={ROUTES.GET_STARTED_PREVIEW} element={<DigestPreview />} />
        <Route path={ROUTES.QUICK_START_NOTIFICATION_CENTER} element={<NotificationCenter />} />
        <Route path={ROUTES.QUICK_START_SETUP} element={<FrameworkSetup />} />
        <Route path={ROUTES.QUICK_START_SETUP_FRAMEWORK} element={<Setup />} />
        <Route path={ROUTES.QUICK_START_SETUP_SUCCESS} element={<InAppSuccess />} />
        <Route path={ROUTES.ACTIVITIES} element={<ActivitiesPage />} />
        <Route path={ROUTES.SETTINGS} element={<SettingsPage />}>
          <Route path="" element={<Navigate to={ROUTES.PROFILE} replace />} />
          {/* TODO: Remove after the next deployment on 2024-06-18 */}
          <Route path={ROUTES.BRAND_SETTINGS_DEPRECATED} element={<Navigate to={ROUTES.BRAND_SETTINGS} replace />} />
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
        <Route path={ROUTES.INTEGRATIONS} element={<IntegrationsListPage />}>
          <Route path="create" element={<SelectProviderPage />} />
          <Route path="create/:channel/:providerId" element={<CreateProviderPage />} />
          <Route path=":integrationId" element={<UpdateProviderPage />} />
        </Route>
        <Route path={ROUTES.TEAM} element={<MembersInvitePage />} />
        <Route path={ROUTES.CHANGES} element={<PromoteChangesPage />} />
        <Route path={ROUTES.SUBSCRIBERS} element={<SubscribersList />} />
        <Route path="/translations/*" element={<TranslationRoutes />} />
        <Route path={ROUTES.LAYOUT} element={<LayoutsPage />} />
        <Route path={ROUTES.API_KEYS} element={<ApiKeysPage />} />
        <Route path={ROUTES.WEBHOOK} element={<WebhookPage />} />
        <Route path={ROUTES.ANY} element={<HomePage />} />
      </Route>

      <Route path={ROUTES.LOCAL_STUDIO_AUTH} element={<LocalStudioAuthenticator />} />

      <Route path={ROUTES.STUDIO} element={<StudioPageLayout />}>
        <Route
          path=""
          element={<Navigate to={novuOnboardedCookie.get() ? ROUTES.STUDIO_FLOWS : ROUTES.STUDIO_ONBOARDING} replace />}
        />
        <Route path={ROUTES.STUDIO_FLOWS} element={<LocalStudioWorkflowLandingPage />} />
        <Route path={ROUTES.STUDIO_FLOWS_VIEW} element={<WorkflowsDetailPage />} />
        <Route path={ROUTES.STUDIO_FLOWS_STEP_EDITOR} element={<WorkflowsStepEditorPage />} />
        <Route path={ROUTES.STUDIO_FLOWS_TEST} element={<WorkflowsTestPage />} />
        <Route path={ROUTES.STUDIO_ONBOARDING} element={<StudioOnboarding />} />
        <Route path={ROUTES.STUDIO_ONBOARDING_PREVIEW} element={<StudioOnboardingPreview />} />
        <Route path={ROUTES.STUDIO_ONBOARDING_SUCCESS} element={<StudioOnboardingSuccess />} />
      </Route>
    </Routes>
  );
};
