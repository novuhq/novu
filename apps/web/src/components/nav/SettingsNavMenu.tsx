import {
  IconAdminPanelSettings,
  IconCreditCard,
  IconGroup,
  IconManageAccounts,
  IconRoomPreferences,
  IconWorkspacePremium,
} from '@novu/design-system';
import { useAuth } from '../../hooks/useAuth';
import { ROUTES } from '../../constants/routes';
import { useNavigate } from 'react-router-dom';
import { FreeTrialSidebarWidget } from '../layout/components/FreeTrialSidebarWidget';
import { NavMenu } from './NavMenu';
import { NavMenuLinkButton } from './NavMenuButton/NavMenuLinkButton';
import { NavMenuSection } from './NavMenuSection';

// TODO: Parentheses were not part of designs, but I believe it's much clearer this way
const getScopedTitle = (label: string, scope?: string) => `${label} ${`(${scope})` ?? ''}`;

export const SettingsNavMenu: React.FC = () => {
  const navigate = useNavigate();
  const { currentOrganization } = useAuth();

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
      <NavMenuSection title={getScopedTitle('Organization', currentOrganization?.name)}>
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
          label="Billing"
          isVisible
          icon={<IconCreditCard />}
          link={ROUTES.BILLING}
          testId="side-nav-settings-billing-link"
        ></NavMenuLinkButton>
      </NavMenuSection>
      {/** TODO: we will reinstate the toggle buttons w/ different envs once we have APIs to support the pages */}
      {/*
          <NavMenuToggleButton
          icon={<IconConstruction />}
          label={'Development'}
          testId="side-nav-settings-toggle-development"
        >
          <NavMenuLinkButton
            label="API keys"
            isVisible
            icon={<IconKey />}
            link={getEnvSettingsRoute(ROUTES.API_KEYS, BaseEnvironmentEnum.DEVELOPMENT)}
            testId="side-nav-settings-api-keys-development"
          ></NavMenuLinkButton>
          <NavMenuLinkButton
            label="Inbound webhook"
            isVisible
            icon={<IconWebhook />}
            link={getEnvSettingsRoute(ROUTES.WEBHOOK, BaseEnvironmentEnum.DEVELOPMENT)}
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
            link={getEnvSettingsRoute(ROUTES.API_KEYS, BaseEnvironmentEnum.PRODUCTION)}
            testId="side-nav-settings-api-keys-production"
          ></NavMenuLinkButton>
          <NavMenuLinkButton
            label="Inbound webhook"
            isVisible
            icon={<IconWebhook />}
            link={getEnvSettingsRoute(ROUTES.WEBHOOK, BaseEnvironmentEnum.PRODUCTION)}
            testId="side-nav-settings-inbound-webhook-production"
          ></NavMenuLinkButton>
        </NavMenuToggleButton>*/}
      <FreeTrialSidebarWidget />
    </NavMenu>
  );
};
