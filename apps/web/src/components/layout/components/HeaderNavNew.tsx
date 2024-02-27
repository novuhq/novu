import { ActionIcon, Avatar, ColorScheme, Group, Header, useMantineColorScheme } from '@mantine/core';
import * as capitalize from 'lodash.capitalize';
import { useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useIntercom } from 'react-use-intercom';

import {
  colors,
  Dropdown,
  Ellipse,
  IconDarkMode,
  IconHelpOutline,
  IconLightMode,
  IconLogout,
  IconOutlineGroupAdd,
  Settings,
  Text,
  Tooltip,
} from '@novu/design-system';
import { CONTEXT_PATH, INTERCOM_APP_ID, IS_DOCKER_HOSTED, REACT_APP_VERSION } from '../../../config';
import { ROUTES } from '../../../constants/routes.enum';
import { useDebounce, useLocalThemePreference } from '../../../hooks';
import { discordInviteUrl } from '../../../pages/quick-start/consts';
import { useAuthContext } from '../../providers/AuthProvider';
import { useSegment } from '../../providers/SegmentProvider';
import { useSpotlightContext } from '../../providers/SpotlightProvider';
import { HEADER_HEIGHT } from '../constants';
import { NotificationCenterWidget } from './NotificationCenterWidget';

const menuItem = [
  {
    title: 'Settings',
    icon: <Settings width={20} height={20} />,
    path: ROUTES.SETTINGS,
  },
  {
    title: 'Invite Members',
    icon: <IconOutlineGroupAdd />,
    path: ROUTES.TEAM,
  },
];
const headerIconsSettings = { color: colors.B60, width: 20, height: 20 };

const Icon = () => {
  const { themeStatus } = useLocalThemePreference();

  if (themeStatus === 'dark') {
    return <IconDarkMode {...headerIconsSettings} />;
  }
  if (themeStatus === 'light') {
    return <IconLightMode {...headerIconsSettings} />;
  }

  return <Ellipse {...headerIconsSettings} />;
};

export function HeaderNavNew() {
  const { currentOrganization, currentUser, logout } = useAuthContext();
  const { colorScheme, toggleColorScheme } = useMantineColorScheme();
  const { themeStatus } = useLocalThemePreference();
  const { addItem, removeItems } = useSpotlightContext();
  const { boot } = useIntercom();
  const segment = useSegment();
  const isSelfHosted = IS_DOCKER_HOSTED;

  const debounceThemeChange = useDebounce((args: { colorScheme: ColorScheme; themeStatus: string }) => {
    segment.track('Theme is set - [Theme]', args);
  }, 500);

  useEffect(() => {
    debounceThemeChange({ colorScheme, themeStatus });
  }, [colorScheme, themeStatus, debounceThemeChange]);

  useEffect(() => {
    const shouldBootIntercom = !!INTERCOM_APP_ID && currentUser && currentOrganization;
    if (shouldBootIntercom) {
      boot({
        userId: currentUser._id,
        email: currentUser?.email ?? '',
        name: currentUser?.firstName + ' ' + currentUser?.lastName,
        createdAt: currentUser?.createdAt,
        company: {
          name: currentOrganization?.name,
          companyId: currentOrganization?._id as string,
        },
        userHash: currentUser.servicesHashes?.intercom,
        customLauncherSelector: '#intercom-launcher',
        hideDefaultLauncher: true,
      });
    }
  }, [boot, currentUser, currentOrganization]);

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
        icon: <IconLogout />,
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
      <Group spacing={16} noWrap>
        <Avatar radius="sm" size={40} src={currentUser?.profilePicture || CONTEXT_PATH + '/static/images/avatar.png'} />
        <div style={{ flex: 1 }}>
          <Text data-test-id="header-dropdown-username" rows={1} weight="bold">
            {capitalize(currentUser?.firstName as string)} {capitalize(currentUser?.lastName as string)}
          </Text>
          <Text size={14} color={colors.B60} rows={1} data-test-id="header-dropdown-organization-name">
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
    <Dropdown.Item key="logout" icon={<IconLogout />} onClick={logout} data-test-id="logout-button">
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
      height={`${HEADER_HEIGHT}px`}
      sx={{
        position: 'sticky',
        top: 0,
        borderBottom: 'none',
        zIndex: 199,
        padding: 8,
      }}
    >
      {/* TODO: Change postion: right to space-between for breadcumbs */}
      <Group position="right" noWrap align="center">
        <Group spacing={16}>
          <NotificationCenterWidget user={currentUser} />

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
              dropdown: { minWidth: 220, padding: '4px' },
              item: { paddingInline: '12px', paddingBlock: '10px' },
              itemIcon: {
                marginRight: '12px',
              },
            }}
            control={
              <ActionIcon variant="transparent">
                <Avatar
                  size={24}
                  radius="sm"
                  data-test-id="header-profile-avatar"
                  src={currentUser?.profilePicture || CONTEXT_PATH + '/static/images/avatar.png'}
                />
              </ActionIcon>
            }
          >
            {profileMenuMantine}
          </Dropdown>
        </Group>
      </Group>
    </Header>
  );
}
