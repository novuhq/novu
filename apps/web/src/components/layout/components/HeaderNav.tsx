import { ActionIcon, Avatar, Badge, ColorScheme, Container, Group, Header, useMantineColorScheme } from '@mantine/core';
import * as capitalize from 'lodash.capitalize';
import { useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';

import { CONTEXT_PATH, IS_DOCKER_HOSTED, REACT_APP_VERSION } from '../../../config';
import { ROUTES } from '../../../constants/routes.enum';
import {
  colors,
  Dropdown,
  shadows,
  Text,
  Tooltip,
  Ellipse,
  Moon,
  Question,
  Sun,
  Logout,
  InviteMembers,
} from '@novu/design-system';
import { useLocalThemePreference, useDebounce, useBootIntercom } from '../../../hooks';
import { discordInviteUrl } from '../../../pages/quick-start/consts';
import { useAuthContext } from '../../providers/AuthProvider';
import { useSpotlightContext } from '../../providers/SpotlightProvider';
import { HEADER_NAV_HEIGHT } from '../constants';
import { NotificationCenterWidget } from './NotificationCenterWidget';
import { useSegment } from '../../providers/SegmentProvider';
import { EchoStatus } from './EchoStatus';

type Props = { isIntercomOpened: boolean };
const menuItem = [
  {
    title: 'Invite Members',
    icon: <InviteMembers />,
    path: ROUTES.TEAM,
  },
];
const headerIconsSettings = { color: colors.B60, width: 24, height: 24 };

const Icon = () => {
  const { themeStatus } = useLocalThemePreference();

  if (themeStatus === 'dark') {
    return <Moon {...headerIconsSettings} />;
  }
  if (themeStatus === 'light') {
    return <Sun {...headerIconsSettings} />;
  }

  return <Ellipse {...headerIconsSettings} />;
};

/**
 * @deprecated This file will be removed in future.
 * Use HeaderNav from V2 folder instead.
 */
export function HeaderNav({ isIntercomOpened }: Props) {
  const { currentOrganization, currentUser, logout } = useAuthContext();
  const { colorScheme, toggleColorScheme } = useMantineColorScheme();
  const { themeStatus } = useLocalThemePreference();
  const { addItem, removeItems } = useSpotlightContext();

  const segment = useSegment();
  const isSelfHosted = IS_DOCKER_HOSTED;

  const debounceThemeChange = useDebounce((args: { colorScheme: ColorScheme; themeStatus: string }) => {
    segment.track('Theme is set - [Theme]', args);
  }, 500);

  useEffect(() => {
    debounceThemeChange({ colorScheme, themeStatus });
  }, [colorScheme, themeStatus, debounceThemeChange]);

  useBootIntercom();

  let themeTitle = 'Match System Appearance';
  if (themeStatus === 'dark') {
    themeTitle = 'Dark Theme';
  } else if (themeStatus === 'light') {
    themeTitle = 'Light Theme';
  }

  const additionalMenuItems = useMemo(() => {
    return [
      {
        id: 'toggle-theme',
        title: themeTitle,
        icon: <Icon />,
        onTrigger: () => {
          toggleColorScheme();
        },
      },
      {
        id: 'sign-out',
        title: 'Sign out',
        icon: <Logout />,
        onTrigger: () => {
          logout();
        },
      },
    ];
  }, [toggleColorScheme, logout, themeTitle]);

  useEffect(() => {
    removeItems(additionalMenuItems.map((item) => item.id));

    addItem(additionalMenuItems);
  }, [addItem, removeItems, additionalMenuItems]);

  const profileMenuMantine = [
    <Dropdown.Item disabled key="user">
      <Group spacing={15}>
        <Avatar
          sx={(theme) => ({
            boxShadow: theme.colorScheme === 'dark' ? shadows.dark : shadows.medium,
          })}
          radius="xl"
          size={45}
          src={currentUser?.profilePicture || CONTEXT_PATH + '/static/images/avatar.png'}
        />
        <div style={{ flex: 1 }}>
          <Text data-test-id="header-dropdown-username" rows={1}>
            {capitalize(currentUser?.firstName as string)} {capitalize(currentUser?.lastName as string)}
          </Text>
          <Text size="md" color={colors.B70} rows={1} data-test-id="header-dropdown-organization-name">
            {capitalize(currentOrganization?.name as string)}
          </Text>
        </div>
      </Group>
    </Dropdown.Item>,
    ...menuItem.map(({ title, icon, path }) => (
      <Link to={path} key={title}>
        <Dropdown.Item key={title} icon={icon} component="div">
          {title}
        </Dropdown.Item>
      </Link>
    )),
    <Dropdown.Item key="logout" icon={<Logout />} onClick={logout} data-test-id="logout-button">
      Log Out
    </Dropdown.Item>,
  ];

  isSelfHosted &&
    profileMenuMantine.push(
      <Dropdown.Item
        style={{
          padding: '10px 20px',
        }}
        disabled
        key="version"
      >
        <Text color={colors.B40}>Version: {REACT_APP_VERSION}</Text>
      </Dropdown.Item>
    );

  return (
    <Header
      height={`${HEADER_NAV_HEIGHT}px`}
      sx={{
        position: 'sticky',
        top: 0,
        borderBottom: 'none',
        zIndex: 199,
      }}
    >
      <Container
        fluid
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', height: `${HEADER_NAV_HEIGHT}px` }}
      >
        <Group>
          <EchoStatus />

          <ActionIcon variant="transparent" onClick={() => toggleColorScheme()}>
            <Tooltip label={themeTitle}>
              <div>
                <Icon />
              </div>
            </Tooltip>
          </ActionIcon>
          {isSelfHosted ? (
            <a href={discordInviteUrl} target="_blank" rel="noreferrer">
              <ActionIcon variant="transparent">
                <Question width={24} height={24} color={colors.B60} isGradient={isIntercomOpened} />
              </ActionIcon>
            </a>
          ) : (
            <ActionIcon variant="transparent" id="intercom-launcher">
              <Question width={24} height={24} color={colors.B60} isGradient={isIntercomOpened} />
            </ActionIcon>
          )}
          <NotificationCenterWidget user={currentUser} />
          <Dropdown
            position="bottom-end"
            styles={{ dropdown: { minWidth: 220 } }}
            control={
              <ActionIcon variant="transparent">
                <Avatar
                  size={24}
                  radius="xl"
                  data-test-id="header-profile-avatar"
                  src={currentUser?.profilePicture || CONTEXT_PATH + '/static/images/avatar.png'}
                />
              </ActionIcon>
            }
          >
            {profileMenuMantine}
          </Dropdown>
        </Group>
      </Container>
    </Header>
  );
}
