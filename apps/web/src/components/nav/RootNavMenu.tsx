import {
  // cspell:disable-next-line
  IconAutorenew,
  IconCellTower,
  IconDomain,
  IconGroup,
  IconOutlineMonitorHeart,
  IconRoute,
  IconSettings,
  IconTaskAlt,
  IconTranslate,
  IconViewQuilt,
} from '@novu/design-system';
import { ROUTES } from '@novu/shared-web';
import { ChangesCountBadge } from '../layout/components/ChangesCountBadge';
import { EnvironmentSelect } from './EnvironmentSelect';
import { NavMenu } from './NavMenu';
import { NavMenuLinkButton } from './NavMenuButton/NavMenuLinkButton';
import { NavMenuSection } from './NavMenuSection';
import { OrganizationSelect } from './OrganizationSelect/v2/OrganizationSelect';
import { RootNavMenuFooter } from './RootNavMenuFooter';

export const RootNavMenu: React.FC = () => {
  return (
    <NavMenu variant="root">
      <NavMenuSection>
        <OrganizationSelect />
        <NavMenuLinkButton
          label="Get started"
          isVisible={true}
          icon={<IconTaskAlt />}
          link={ROUTES.GET_STARTED}
          // rightSide: { component: <VisibilityOff onClick={handleHideOnboardingClick} /> displayOnHover: true }} />}
          testId="side-nav-quickstart-link"
          // tooltipLabel: 'Hide this page from menu',
        />
        <NavMenuLinkButton
          icon={<IconCellTower />}
          link={ROUTES.INTEGRATIONS}
          label="Integrations"
          testId="side-nav-integrations-link"
        />
        <NavMenuLinkButton
          label="Settings"
          icon={<IconSettings />}
          link={ROUTES.SETTINGS}
          testId="side-nav-settings-link"
        />
      </NavMenuSection>
      <NavMenuSection>
        <EnvironmentSelect />
        <NavMenuLinkButton
          label="Workflows"
          icon={<IconRoute />}
          link={ROUTES.WORKFLOWS}
          testId="side-nav-templates-link"
        />
        <NavMenuLinkButton
          icon={<IconOutlineMonitorHeart />}
          link={ROUTES.ACTIVITIES}
          label="Activity Feed"
          testId="side-nav-activities-link"
        />
        <NavMenuLinkButton
          label="Change history"
          icon={<IconAutorenew />}
          link={ROUTES.CHANGES}
          testId={'side-nav-changes-link'}
          // rightSide={{ node: <ChangesCountBadge /> }}
          isVisible={true}
        />
        <NavMenuLinkButton
          label="Subscribers"
          icon={<IconGroup />}
          link={ROUTES.SUBSCRIBERS}
          testId="side-nav-subscribers-link"
        />
        <NavMenuLinkButton
          label="Tenants"
          isVisible={true}
          icon={<IconDomain />}
          link={ROUTES.TENANTS}
          testId="side-nav-tenants-link"
        />
        <NavMenuLinkButton
          label="Layouts"
          icon={<IconViewQuilt />}
          link={ROUTES.LAYOUT}
          testId="side-nav-layouts-link"
        />
        <NavMenuLinkButton
          label="Translations"
          isVisible={true}
          icon={<IconTranslate width={20} height={20} />}
          link={ROUTES.TRANSLATIONS}
          testId="side-nav-translations-link"
        />
      </NavMenuSection>
      <RootNavMenuFooter />
    </NavMenu>
  );
};
