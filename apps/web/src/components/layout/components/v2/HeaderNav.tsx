import { ActionIcon, Avatar, Group, Header, useMantineColorScheme } from '@mantine/core';
import { useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';

import {
  colors,
  Dropdown,
  IconHelpOutline,
  IconLogout,
  IconOutlineGroupAdd,
  IconSettings,
  Text,
  Tooltip,
  When,
} from '@novu/design-system';
import { CONTEXT_PATH, IS_DOCKER_HOSTED, REACT_APP_VERSION } from '../../../../config';
import { ROUTES } from '../../../../constants/routes.enum';
import { useBootIntercom } from '../../../../hooks';
import useThemeChange from '../../../../hooks/useThemeChange';
import { discordInviteUrl } from '../../../../pages/quick-start/consts';
import { useAuthContext } from '../../../providers/AuthProvider';
import { useSpotlightContext } from '../../../providers/SpotlightProvider';
import { HEADER_NAV_HEIGHT } from '../../constants';
import { NotificationCenterWidget } from '../NotificationCenterWidget';

const FALLBACK_AVATAR = CONTEXT_PATH + '/static/images/avatar.png';

const menuItems = [
  {
    title: 'Settings',
    icon: <IconSettings color="inherit" />,
    path: ROUTES.SETTINGS,
  },
  {
    title: 'Invite Members',
    icon: <IconOutlineGroupAdd color="inherit" />,
    path: ROUTES.TEAM,
  },
];

export function HeaderNav() {
  const { currentOrganization, currentUser, logout } = useAuthContext();
  const { colorScheme } = useMantineColorScheme();

  const { addItem, removeItems } = useSpotlightContext();
  const isSelfHosted = IS_DOCKER_HOSTED;
  const isDark = colorScheme === 'dark';
  const iconColor = isDark ? colors.white : colors.B40;

  useBootIntercom();
  const { themeIcon, themeLabel, toggleColorScheme } = useThemeChange();

  useEffect(() => {
    const spotlightMenuItems = [
      {
        id: 'toggle-theme',
        title: themeLabel,
        icon: themeIcon,
        onTrigger: () => {
          toggleColorScheme();
        },
      },
      {
        id: 'sign-out',
        title: 'Sign out',
        icon: <IconLogout />,
        onTrigger: () => {
          logout();
        },
      },
    ];

    addItem(spotlightMenuItems);
  }, [addItem, removeItems, themeLabel, toggleColorScheme, logout, themeIcon]);

  const profileMenuMantine = [
    <Dropdown.Item disabled key="user">
      <Group spacing={16} noWrap>
        <Avatar radius="sm" size={40} src={currentUser?.profilePicture || FALLBACK_AVATAR} />
        <div style={{ flex: 1 }}>
          <Text data-test-id="header-dropdown-username" rows={1} weight="bold" transform="capitalize">
            {currentUser?.firstName as string} {currentUser?.lastName as string}
          </Text>
          <Text
            size={14}
            color={colors.B60}
            rows={1}
            data-test-id="header-dropdown-organization-name"
            transform="capitalize"
          >
            {currentOrganization?.name as string}
          </Text>
        </div>
      </Group>
    </Dropdown.Item>,
    ...menuItems.map(({ title, icon, path }) => (
      <Link to={path} key={`link-${title}`}>
        <Dropdown.Item key={`item-${title}`} icon={icon} component="div" color="green">
          {title}
        </Dropdown.Item>
      </Link>
    )),
    <Dropdown.Item key="logout" icon={<IconLogout color={iconColor} />} onClick={logout} data-test-id="logout-button">
      Log Out
    </Dropdown.Item>,
  ];

  return (
    <Header
      height={`${HEADER_NAV_HEIGHT}px`}
      sx={{
        position: 'sticky',
        top: 0,
        borderBottom: 'none',
        zIndex: 199,
        padding: 8,
      }}
    >
      {/* TODO: Change position: right to space-between for breadcrumbs */}
      <Group position="right" noWrap align="center">
        <Group spacing={16}>
          <NotificationCenterWidget user={currentUser} />

          <ActionIcon variant="transparent" onClick={() => toggleColorScheme()}>
            <Tooltip label={themeLabel}>
              <div>{themeIcon}</div>
            </Tooltip>
          </ActionIcon>
          {isSelfHosted ? (
            <a href={discordInviteUrl} target="_blank" rel="noreferrer">
              <ActionIcon variant="transparent">
                <IconHelpOutline color={colors.B60} />
              </ActionIcon>
            </a>
          ) : (
            <ActionIcon variant="transparent" id="intercom-launcher">
              <IconHelpOutline color={colors.B60} />
            </ActionIcon>
          )}
          <Dropdown
            position="bottom-end"
            styles={{
              dropdown: { minWidth: 220, padding: '0.25rem' },
              item: { paddingInline: '0.75rem', paddingBlock: '0.625rem' },
              itemIcon: {
                marginRight: '0.75rem',
              },
            }}
            control={
              <ActionIcon variant="transparent">
                <Avatar
                  size={24}
                  radius="sm"
                  data-test-id="header-profile-avatar"
                  src={currentUser?.profilePicture || FALLBACK_AVATAR}
                />
              </ActionIcon>
            }
          >
            {profileMenuMantine}
            <When truthy={isSelfHosted}>
              <Dropdown.Item
                style={{
                  padding: '0.625rem 1.25px',
                }}
                disabled
              >
                <Text color={colors.B40}>Version: {REACT_APP_VERSION}</Text>
              </Dropdown.Item>
            </When>
          </Dropdown>
        </Group>
      </Group>
    </Header>
  );
}
