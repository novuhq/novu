import { IconRoute, IconSettings } from '@novu/novui/icons';
import { ROUTES } from '../../constants/routes';
import { EnvironmentSelect } from './EnvironmentSelect/index';
import { NavMenu } from '../../components/nav/NavMenu';
import { NavMenuLinkButton } from '../../components/nav/NavMenuButton/NavMenuLinkButton';
import { NavMenuSection } from '../../components/nav/NavMenuSection';
import { OrganizationSelect } from '../../components/nav/OrganizationSelect/v2/index';
import { RootNavMenuFooter } from '../../components/nav/RootNavMenuFooter';

export const LocalNavMenu: React.FC = () => {
  return (
    <NavMenu variant="root">
      <NavMenuSection>
        <OrganizationSelect />
        <NavMenuLinkButton
          label="Settings"
          icon={<IconSettings />}
          link={ROUTES.PROFILE}
          testId="side-nav-settings-link"
        />
        <EnvironmentSelect />
        <NavMenuLinkButton
          label="Workflows"
          icon={<IconRoute />}
          link={ROUTES.STUDIO_FLOWS}
          testId="side-nav-templates-link"
        />
      </NavMenuSection>
      <RootNavMenuFooter />
    </NavMenu>
  );
};
