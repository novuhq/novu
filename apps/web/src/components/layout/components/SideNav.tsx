import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Navbar,
  Popover,
  CloseButton,
  useMantineColorScheme,
  createStyles,
  createPolymorphicComponent,
  CloseButtonProps,
} from '@mantine/core';
import styled from '@emotion/styled';

import { colors, NavMenu, SegmentedControl, shadows } from '../../../design-system';
import { Activity, Bolt, Box, Settings, Team, Repeat, CheckCircleOutlined, Brand } from '../../../design-system/icons';
import { ChangesCountBadge } from './ChangesCountBadge';
import { useEnvController } from '../../../hooks';
import { useAuthContext } from '../../providers/AuthProvider';
import OrganizationSelect from './OrganizationSelect';
import { useSpotlightContext } from '../../providers/SpotlightProvider';
import { HEADER_HEIGHT } from '../constants';
import { LimitBar } from '../../../pages/integrations/components/LimitBar';
import { ROUTES } from '../../../constants/routes.enum';
import { currentOnboardingStep } from '../../../pages/quick-start/components/route/store';

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
  const { setEnvironment, isLoading, environment, readonly } = useEnvController();
  const { currentUser } = useAuthContext();
  const location = useLocation();
  const [opened, setOpened] = useState(readonly);
  const { colorScheme } = useMantineColorScheme();
  const dark = colorScheme === 'dark';
  const { addItem } = useSpotlightContext();
  const { classes } = usePopoverStyles();

  useEffect(() => {
    setOpened(readonly);
    if (readonly && location.pathname === ROUTES.CHANGES) {
      navigate(ROUTES.HOME);
    }
  }, [readonly]);

  useEffect(() => {
    addItem([
      {
        id: 'toggle-environment',
        title: `Toggle to ${environment?.name === 'Production' ? 'Development' : 'Production'} environment`,
        onTrigger: () => {
          setEnvironment(environment?.name === 'Production' ? 'Development' : 'Production');
        },
      },
    ]);
  }, [environment]);

  const lastStep = currentOnboardingStep().get();
  const getStartedRoute = lastStep === ROUTES.GET_STARTED_PREVIEW ? ROUTES.GET_STARTED : lastStep;

  const menuItems = [
    {
      condition: !readonly,
      icon: <CheckCircleOutlined />,
      link: getStartedRoute ?? ROUTES.GET_STARTED,
      label: 'Get Started',
      testId: 'side-nav-quickstart-link',
    },
    { icon: <Bolt />, link: ROUTES.TEMPLATES, label: 'Notifications', testId: 'side-nav-templates-link' },
    {
      icon: <Team />,
      link: ROUTES.SUBSCRIBERS,
      label: 'Subscribers',
      testId: 'side-nav-subscribers-link',
    },
    {
      icon: <Brand />,
      link: '/brand',
      label: 'Brand',
      testId: 'side-nav-brand-link',
    },
    { icon: <Activity />, link: ROUTES.ACTIVITIES, label: 'Activity Feed', testId: 'side-nav-activities-link' },
    { icon: <Box />, link: ROUTES.INTEGRATIONS, label: 'Integrations Store', testId: 'side-nav-integrations-link' },
    { icon: <Settings />, link: ROUTES.SETTINGS, label: 'Settings', testId: 'side-nav-settings-link' },
    {
      icon: <Team />,
      link: ROUTES.TEAM,
      label: 'Team Members',
      testId: 'side-nav-settings-organization',
    },
    {
      icon: <Repeat />,
      link: ROUTES.CHANGES,
      label: 'Changes',
      testId: 'side-nav-changes-link',
      rightSide: <ChangesCountBadge />,
      condition: !readonly,
    },
  ];

  async function handlePopoverForChanges(e) {
    e.preventDefault();

    await setEnvironment('Development');
    navigate(ROUTES.CHANGES);
  }

  return (
    <Navbar
      p={30}
      sx={{
        position: 'sticky',
        top: HEADER_HEIGHT,
        zIndex: 'auto',
        backgroundColor: 'transparent',
        borderRight: 'none',
        paddingRight: 0,
        width: '300px',
        height: 'max-content',
        '@media (max-width: 768px)': {
          width: '100%',
        },
      }}
    >
      <Navbar.Section>
        <Popover
          classNames={classes}
          withArrow
          opened={opened}
          onClose={() => setOpened(false)}
          withinPortal={false}
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
      </Navbar.Section>
      <Navbar.Section mt={15}>
        <LimitBar withLink={true} label="Novu email credits used" />
      </Navbar.Section>
      <Navbar.Section mt={15}>
        <Navbar.Section>
          <OrganizationSelect />
        </Navbar.Section>
        <Navbar.Section>
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
              href="https://docs.novu.co"
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
  margin-bottom: 5px;
`;
