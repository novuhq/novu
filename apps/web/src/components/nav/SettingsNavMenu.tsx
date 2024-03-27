import {
  IconManageAccounts,
  IconRoomPreferences,
  IconAdminPanelSettings,
  IconGroup,
  IconWorkspacePremium,
  IconCreditCard,
  IconConstruction,
  IconKey,
  IconWebhook,
  IconRocketLaunch,
} from '@novu/design-system';
import { ROUTES, useAuthContext } from '@novu/shared-web';
import { useNavigate } from 'react-router-dom';
import { NavMenu } from './NavMenu';
import { NavMenuLinkButton } from './NavMenuButton/NavMenuLinkButton';
import { NavMenuToggleButton } from './NavMenuButton/NavMenuToggleButton';
import { NavMenuSection } from './NavMenuSection';

const getEnvSettingsRoute = (route: ROUTES, env: 'development' | 'production') => `${route.replace(':env', env)}`;

export const SettingsNavMenu: React.FC = () => {
  const navigate = useNavigate();
  const { currentOrganization } = useAuthContext();

  // TODO: Parentheses were not part of designs, but I believe it's much clearer this way
  const getOrgScopedTitle = (title: string) => `${title} ${`(${currentOrganization?.name})` ?? ''}`;

  const onBackButtonClick = () => {
    navigate(ROUTES.HOME);
  };

  return (
    <NavMenu variant="nested" title="Settings" onBackButtonClick={onBackButtonClick}>
      <NavMenuSection title="Account">
        <NavMenuLinkButton
          label="User profile"
          isVisible
          icon={<IconManageAccounts />}
          link={ROUTES.PROFILE}
          testId="side-nav-settings-user-profile"
        ></NavMenuLinkButton>
      </NavMenuSection>
      <NavMenuSection title={getOrgScopedTitle('Organization')}>
        <NavMenuLinkButton
          label="Organization profile"
          isVisible
          icon={<IconRoomPreferences />}
          link={ROUTES.ORGANIZATION}
          testId="side-nav-settings-organization-link"
        ></NavMenuLinkButton>
        <NavMenuLinkButton
          label="Access security"
          isVisible
          icon={<IconAdminPanelSettings />}
          link={ROUTES.SECURITY}
          testId="side-nav-settings-security-link"
        ></NavMenuLinkButton>
        <NavMenuLinkButton
          label="Team members"
          isVisible
          icon={<IconGroup />}
          link={ROUTES.TEAM_SETTINGS}
          testId="side-nav-settings-team-link"
        ></NavMenuLinkButton>
        <NavMenuLinkButton
          label="Branding"
          isVisible
          icon={<IconWorkspacePremium />}
          link={ROUTES.BRAND_SETTINGS}
          testId="side-nav-settings-branding-link"
        ></NavMenuLinkButton>
        <NavMenuLinkButton
          label="Billing plans"
          isVisible
          icon={<IconCreditCard />}
          link={ROUTES.BILLING}
          testId="side-nav-settings-billing-link"
        ></NavMenuLinkButton>
      </NavMenuSection>
      <NavMenuSection title={getOrgScopedTitle('Environments')}>
        <NavMenuToggleButton
          icon={<IconConstruction />}
          label={'Development'}
          testId="side-nav-settings-toggle-development"
        >
          <NavMenuLinkButton
            label="API keys"
            isVisible
            icon={<IconKey />}
            link={getEnvSettingsRoute(ROUTES.API_KEYS, 'development')}
            testId="side-nav-settings-api-keys-development"
          ></NavMenuLinkButton>
          <NavMenuLinkButton
            label="Inbound webhook"
            isVisible
            icon={<IconWebhook />}
            link={getEnvSettingsRoute(ROUTES.WEBHOOK, 'development')}
            testId="side-nav-settings-inbound-webhook-development"
          ></NavMenuLinkButton>
        </NavMenuToggleButton>
        <NavMenuToggleButton
          icon={<IconRocketLaunch />}
          label={'Production'}
          testId="side-nav-settings-toggle-production"
        >
          <NavMenuLinkButton
            label="API keys"
            isVisible
            icon={<IconKey />}
            link={getEnvSettingsRoute(ROUTES.API_KEYS, 'production')}
            testId="side-nav-settings-api-keys-production"
          ></NavMenuLinkButton>
          <NavMenuLinkButton
            label="Inbound webhook"
            isVisible
            icon={<IconWebhook />}
            link={getEnvSettingsRoute(ROUTES.WEBHOOK, 'production')}
            testId="side-nav-settings-inbound-webhook-production"
          ></NavMenuLinkButton>
        </NavMenuToggleButton>
      </NavMenuSection>
    </NavMenu>
  );
};
