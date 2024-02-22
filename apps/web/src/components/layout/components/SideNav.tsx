import styled from '@emotion/styled';
import {
  CloseButton,
  CloseButtonProps,
  createPolymorphicComponent,
  createStyles,
  Navbar,
  Popover,
  useMantineColorScheme,
} from '@mantine/core';
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { ROUTES } from '../../../constants/routes.enum';
import {
  Activity,
  Bolt,
  Box,
  Brand,
  Buildings,
  CheckCircleOutlined,
  colors,
  NavMenu,
  NovuLogo,
  Repeat,
  SegmentedControl,
  Settings,
  shadows,
  Team,
  Translation,
} from '@novu/design-system';
import { useEnvController, useFeatureFlag } from '../../../hooks';
import { useSpotlightContext } from '../../providers/SpotlightProvider';
import { ChangesCountBadge } from './ChangesCountBadge';
import OrganizationSelect from './OrganizationSelect';
import { FeatureFlagsKeysEnum, UTM_CAMPAIGN_QUERY_PARAM } from '@novu/shared';
import { useUserOnboardingStatus } from '../../../api/hooks/useUserOnboardingStatus';
import { VisibilityOff } from './VisibilityOff';
import { useSegment } from '../../providers/SegmentProvider';

const usePopoverStyles = createStyles(({ colorScheme }) => ({
  dropdown: {
    padding: '12px 20px 14px 15px',
    backgroundColor: colorScheme === 'dark' ? colors.B20 : colors.white,
    position: 'absolute',
    color: colorScheme === 'dark' ? colors.white : colors.B40,
    border: 'none',
    marginTop: '1px',
  },
  arrow: {
    backgroundColor: colorScheme === 'dark' ? colors.B20 : colors.white,
    height: '7px',
    border: 'none',
    margin: '0px',
  },
}));

type Props = {};

export function SideNav({}: Props) {
  const navigate = useNavigate();
  const segment = useSegment();
  const [opened, setOpened] = useState(false);
  const { setEnvironment, isLoading, environment, readonly } = useEnvController({
    onSuccess: (newEnvironment) => {
      setOpened(!!newEnvironment?._parentId);
    },
  });
  const { colorScheme } = useMantineColorScheme();
  const dark = colorScheme === 'dark';
  const { addItem, removeItems } = useSpotlightContext();
  const { classes } = usePopoverStyles();
  const isMultiTenancyEnabled = useFeatureFlag(FeatureFlagsKeysEnum.IS_MULTI_TENANCY_ENABLED);
  const isTranslationManagerEnabled = useFeatureFlag(FeatureFlagsKeysEnum.IS_TRANSLATION_MANAGER_ENABLED);
  const {
    showOnboarding: showOnBoardingState,
    isLoading: isLoadingShowOnBoarding,
    updateOnboardingStatus,
  } = useUserOnboardingStatus();
  const showOnBoarding = isLoadingShowOnBoarding ? false : showOnBoardingState;

  useEffect(() => {
    removeItems(['toggle-environment']);

    addItem([
      {
        id: 'toggle-environment',
        title: `Toggle to ${environment?.name === 'Production' ? 'Development' : 'Production'} environment`,
        onTrigger: () => {
          setEnvironment(environment?.name === 'Production' ? 'Development' : 'Production');
        },
      },
    ]);
  }, [environment, addItem, removeItems, setEnvironment]);

  const handleHideOnboardingClick = async () => {
    segment.track('Click Hide Get Started Page - [Get Started]');
    await updateOnboardingStatus({ showOnboarding: false });
  };

  const menuItems = [
    {
      label: 'Get Started',
      condition: !readonly && showOnBoarding,
      icon: <CheckCircleOutlined />,
      link: ROUTES.GET_STARTED,
      rightSide: { component: <VisibilityOff onClick={handleHideOnboardingClick} />, displayOnHover: true },
      testId: 'side-nav-quickstart-link',
      tooltipLabel: 'Hide this page from menu',
    },
    { icon: <Bolt />, link: ROUTES.WORKFLOWS, label: 'Workflows', testId: 'side-nav-templates-link' },
    {
      label: 'Tenants',
      condition: isMultiTenancyEnabled,
      icon: <Buildings />,
      link: ROUTES.TENANTS,
      testId: 'side-nav-tenants-link',
    },
    {
      label: 'Subscribers',
      icon: <Team />,
      link: ROUTES.SUBSCRIBERS,
      testId: 'side-nav-subscribers-link',
    },
    {
      label: 'Translations',
      condition: isTranslationManagerEnabled,
      icon: <Translation width={20} height={20} />,
      link: ROUTES.TRANSLATIONS,
      testId: 'side-nav-translations-link',
    },
    {
      label: 'Brand',
      icon: <Brand />,
      link: '/brand',
      testId: 'side-nav-brand-link',
    },
    { icon: <Activity />, link: ROUTES.ACTIVITIES, label: 'Activity Feed', testId: 'side-nav-activities-link' },
    { icon: <Box />, link: ROUTES.INTEGRATIONS, label: 'Integrations Store', testId: 'side-nav-integrations-link' },
    {
      label: 'Team Members',
      icon: <Team />,
      link: ROUTES.TEAM,
      testId: 'side-nav-settings-organization',
    },
    {
      label: 'Changes',
      icon: <Repeat />,
      link: ROUTES.CHANGES,
      testId: 'side-nav-changes-link',
      rightSide: <ChangesCountBadge />,
      condition: !readonly,
    },
    { label: 'Settings', icon: <Settings />, link: ROUTES.SETTINGS, testId: 'side-nav-settings-link' },
  ];

  async function handlePopoverForChanges(e) {
    e.preventDefault();

    await setEnvironment('Development');
    navigate(ROUTES.CHANGES);
  }

  return (
    <Navbar
      sx={{
        position: 'sticky',
        top: 0,
        zIndex: 'auto',
        backgroundColor: 'transparent',
        borderRight: 'none',
        width: '300px',
        minHeight: '100vh',
        padding: '16px 24px',
        paddingBottom: '0px',
        '@media (max-width: 768px)': {
          width: '100%',
        },
      }}
    >
      <Navbar.Section mb={24}>
        <Link to="/">
          <NovuLogo />
        </Link>
      </Navbar.Section>
      <Navbar.Section sx={{ overflowY: 'auto', flex: 1 }}>
        <Popover
          classNames={classes}
          withArrow
          opened={opened}
          onClose={() => setOpened(false)}
          withinPortal={true}
          transition="rotate-left"
          transitionDuration={250}
          position="right"
          radius="md"
          shadow={dark ? shadows.dark : shadows.medium}
        >
          <Popover.Target>
            <SegmentedControl
              loading={isLoading}
              data={['Development', 'Production']}
              defaultValue={environment?.name}
              value={environment?.name}
              onChange={async (value) => {
                await setEnvironment(value);
              }}
              sx={{ marginBottom: '16px' }}
              data-test-id="environment-switch"
            />
          </Popover.Target>
          <Popover.Dropdown>
            <div style={{ maxWidth: '220px', paddingRight: '10px' }}>
              <CloseButtonStyled onClick={() => setOpened(false)} aria-label="Close popover" />
              {'To make changes you’ll need to visit '}
              <StyledLink onClick={handlePopoverForChanges}>development changes</StyledLink>{' '}
              {' and promote the changes from there'}
            </div>
          </Popover.Dropdown>
        </Popover>
        <NavMenu menuItems={menuItems} />
        <OrganizationSelect />
        <BottomNav dark={dark} data-test-id="side-nav-bottom-links">
          <a
            target="_blank"
            rel="noopener noreferrer"
            href="https://discord.novu.co"
            data-test-id="side-nav-bottom-link-support"
          >
            Support
          </a>
          <p>
            <b>&nbsp;&nbsp;&nbsp;•&nbsp;&nbsp;&nbsp;</b>
          </p>
          <a
            target="_blank"
            rel="noopener noreferrer"
            href={`https://docs.novu.co${UTM_CAMPAIGN_QUERY_PARAM}`}
            data-test-id="side-nav-bottom-link-documentation"
          >
            Docs
          </a>
          <p>
            <b>&nbsp;&nbsp;&nbsp;•&nbsp;&nbsp;&nbsp;</b>
          </p>
          <a
            target="_blank"
            rel="noopener noreferrer"
            href="https://github.com/novuhq/novu/issues/new/choose"
            data-test-id="side-nav-bottom-link-share-feedback"
          >
            Share Feedback
          </a>
        </BottomNav>
      </Navbar.Section>
    </Navbar>
  );
}

const CloseButtonStyled = createPolymorphicComponent<'button', CloseButtonProps>(styled(CloseButton)`
  position: absolute;
  top: 7px;
  z-index: 2;
  right: 10px;
`);

const StyledLink = styled.a`
  font-weight: bold;
  text-decoration: underline;

  &:hover {
    cursor: pointer;
  }
`;

const BottomNav = styled.div<{ dark: boolean }>`
  color: ${colors.B60};
  display: flex;
  align-items: center;
  justify-content: center;
`;
