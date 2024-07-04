import {
  // cspell:disable-next-line
  IconAutorenew,
  IconCellTower,
  IconDomain,
  IconGroup,
  IconKey,
  IconLaptop,
  IconOutlineMonitorHeart,
  IconRoute,
  IconSettings,
  IconTaskAlt,
  IconTranslate,
  IconViewQuilt,
  IconWebhook,
} from '@novu/novui/icons';
import { ChangesCountBadge } from '../layout/components/ChangesCountBadge';
import { ROUTES } from '../../constants/routes';
import { useSegment } from '../../components/providers/SegmentProvider';
import { useEnvironment } from '../../hooks/useEnvironment';
import { BaseEnvironmentEnum } from '../../constants/BaseEnvironmentEnum';
import { useUserOnboardingStatus } from '../../api/hooks/useUserOnboardingStatus';
import { EnvironmentSelect } from './EnvironmentSelect';
import { NavMenu } from './NavMenu';
import { NavMenuLinkButton } from './NavMenuButton/NavMenuLinkButton';
import { NavMenuSection } from './NavMenuSection';
import { OrganizationSelect } from './OrganizationSelect/v2/OrganizationSelect';
import { RootNavMenuFooter } from './RootNavMenuFooter';
import { VisibilityButton } from './VisibilityButton';
import { FreeTrialSidebarWidget } from '../layout/components/FreeTrialSidebarWidget';
import { parseUrl } from '../../utils/routeUtils';
import { useFeatureFlag } from '../../hooks/useFeatureFlag';
import { FeatureFlagsKeysEnum } from '@novu/shared';
import { When } from '../utils/When';
import { SidebarFooter } from '../layout/components/LocalStudioSidebar/SidebarFooter';
import { useNavigateToLocalStudio } from '../../studio/hooks/useNavigateToLocalStudio';
import { OpenLocalStudioModal } from '../../studio/components/OpenLocalStudioModal';
import { useToggle } from '@mantine/hooks';
import { OutlineButton } from '../../studio/components/OutlineButton';

const getEnvPageRoute = (route: ROUTES, env: BaseEnvironmentEnum) => parseUrl(route, { env });

export const RootNavMenu: React.FC = () => {
  const segment = useSegment();
  const { updateOnboardingStatus, showOnboarding, isLoading: isLoadingOnboardingStatus } = useUserOnboardingStatus();
  const { readonly: isEnvReadonly, environment } = useEnvironment();
  const isV2Enabled = useFeatureFlag(FeatureFlagsKeysEnum.IS_V2_ENABLED);
  const isV2ExperienceEnabled = useFeatureFlag(FeatureFlagsKeysEnum.IS_V2_EXPERIENCE_ENABLED);
  const [isLocalStudioModalOpen, toggleLocalStudioModalOpen] = useToggle();
  const { navigateToLocalStudio } = useNavigateToLocalStudio({ fallbackFn: toggleLocalStudioModalOpen });

  const handleHideOnboardingClick: React.MouseEventHandler = async () => {
    segment.track('Click Hide Get Started Page - [Get Started]');
    await updateOnboardingStatus({ showOnboarding: false });
  };

  return (
    <NavMenu variant="root">
      <NavMenuSection>
        <OrganizationSelect />
        <NavMenuLinkButton
          label="Get started"
          isVisible={!isEnvReadonly && !isLoadingOnboardingStatus && showOnboarding && !isV2Enabled}
          icon={<IconTaskAlt />}
          link={ROUTES.GET_STARTED}
          testId="side-nav-quickstart-link"
          rightSide={{
            node: <VisibilityButton onClick={handleHideOnboardingClick} />,
            triggerOn: 'hover',
            tooltip: 'Hide this page from menu',
          }}
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
          link={ROUTES.PROFILE}
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
        <When truthy={!isV2Enabled}>
          <NavMenuLinkButton
            label="Change history"
            icon={<IconAutorenew />}
            link={ROUTES.CHANGES}
            testId={'side-nav-changes-link'}
            rightSide={{ node: <ChangesCountBadge /> }}
            isVisible={!isEnvReadonly}
          />
        </When>
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
        <When truthy={!isV2Enabled}>
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
        </When>
        <NavMenuLinkButton
          label="API keys"
          isVisible
          icon={<IconKey />}
          link={getEnvPageRoute(
            ROUTES.API_KEYS,
            (environment?.name as BaseEnvironmentEnum) ?? BaseEnvironmentEnum.DEVELOPMENT
          )}
          testId="side-nav-settings-api-keys"
        ></NavMenuLinkButton>
        <NavMenuLinkButton
          label="Inbound webhook"
          isVisible
          icon={<IconWebhook />}
          link={getEnvPageRoute(
            ROUTES.WEBHOOK,
            (environment?.name as BaseEnvironmentEnum) ?? BaseEnvironmentEnum.DEVELOPMENT
          )}
          testId="side-nav-settings-inbound-webhook"
        ></NavMenuLinkButton>
      </NavMenuSection>
      {isV2ExperienceEnabled ? (
        <>
          <SidebarFooter>
            <FreeTrialSidebarWidget />
            <OutlineButton fullWidth onClick={navigateToLocalStudio} Icon={IconLaptop}>
              Open Local Studio
            </OutlineButton>
          </SidebarFooter>
          {/** TODO: refactor when modal manager is available */}
          {isLocalStudioModalOpen && <OpenLocalStudioModal isOpen toggleOpen={toggleLocalStudioModalOpen} />}
        </>
      ) : (
        <RootNavMenuFooter />
      )}
    </NavMenu>
  );
};
