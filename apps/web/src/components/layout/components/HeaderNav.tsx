import {
  Avatar,
  useMantineColorScheme,
  ActionIcon,
  Header,
  Group,
  Menu as MantineMenu,
  Container,
} from '@mantine/core';
import { useCallback, useContext, useEffect, useState } from 'react';
import * as capitalize from 'lodash.capitalize';
import { useIntercom } from 'react-use-intercom';
import { Link } from 'react-router-dom';

import { AuthContext } from '../../../store/authContext';
import { shadows, colors, Text, Dropdown } from '../../../design-system';
import { Sun, Moon, Ellipse, Trash, Mail } from '../../../design-system/icons';
import { useLocalThemePreference } from '../../../hooks/use-localThemePreference';
import { NotificationCenterWidget } from '../../widget/NotificationCenterWidget';
import { Tooltip } from '../../../design-system';
import { INTERCOM_APP_ID } from '../../../config';
import { SpotlightContext } from '../../../store/spotlightContext';

type Props = {};
const menuItem = [
  {
    title: 'Invite Members',
    icon: <Mail />,
    path: '/team',
  },
];
const headerIconsSettings = { color: colors.B60, width: 30, height: 30 };

const useBootIntercom = (currentUser, currentOrganization) => {
  const { boot } = useIntercom();

  const [isIntercomEnabled] = useState<boolean>(!!INTERCOM_APP_ID);

  return useCallback(() => {
    if (isIntercomEnabled) {
      boot({
        email: currentUser?.email,
        name: currentUser?.firstName + ' ' + currentUser?.lastName,
        createdAt: currentUser?.createdAt,
        company: {
          name: currentOrganization?.name,
          companyId: currentOrganization?._id as string,
        },
      });
    }
  }, [isIntercomEnabled, boot, currentUser, currentOrganization]);
};

export function HeaderNav({}: Props) {
  const { currentOrganization, currentUser, logout } = useContext(AuthContext);
  const bootIntercom = useBootIntercom(currentUser, currentOrganization);
  const { colorScheme, toggleColorScheme } = useMantineColorScheme();
  const { themeStatus } = useLocalThemePreference();
  const dark = colorScheme === 'dark';
  const { addItem } = useContext(SpotlightContext);

  useEffect(() => {
    if (bootIntercom && currentUser && currentOrganization) {
      bootIntercom();
    }
  }, [currentUser, currentOrganization, bootIntercom]);

  const themeTitle = useCallback(() => {
    let title = 'Match System Appearance';
    if (themeStatus === 'dark') {
      title = `Dark Theme`;
    } else if (themeStatus === 'light') {
      title = `Light Theme`;
    }

    return title;
  }, [themeStatus]);

  const Icon = useCallback(() => {
    if (themeStatus === 'dark') {
      return <Moon {...headerIconsSettings} />;
    }
    if (themeStatus === 'light') {
      return <Sun {...headerIconsSettings} />;
    }

    return <Ellipse {...headerIconsSettings} height={24} width={24} />;
  }, [themeStatus]);

  useEffect(() => {
    addItem([
      {
        id: 'toggle-theme',
        title: themeTitle(),
        icon: Icon(),
        onTrigger: () => {
          toggleColorScheme();
        },
      },
      {
        id: 'sign-out',
        title: 'Sign out',
        icon: <Trash />,
        onTrigger: () => {
          logout();
        },
      },
    ]);
  }, [colorScheme, Icon, addItem, logout, themeTitle, toggleColorScheme]);

  const profileMenuMantine = [
    <MantineMenu.Item disabled key="user">
      <Group spacing={15}>
        <Avatar
          sx={(theme) => ({
            boxShadow: theme.colorScheme === 'dark' ? shadows.dark : shadows.medium,
          })}
          radius="xl"
          size={45}
          src={currentUser?.profilePicture || '/static/images/avatar.png'}
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
    </MantineMenu.Item>,
    ...menuItem.map(({ title, icon, path }) => (
      <Link to={path} key={title}>
        <MantineMenu.Item key={title} icon={icon} component="div">
          {title}
        </MantineMenu.Item>
      </Link>
    )),
    <MantineMenu.Item key="logout" icon={<Trash />} onClick={logout} data-test-id="logout-button">
      Sign Out
    </MantineMenu.Item>,
  ];

  return (
    <Header
      height="65px"
      sx={(theme) => ({
        boxShadow: theme.colorScheme === 'dark' ? shadows.dark : shadows.light,
        borderBottom: 'none',
      })}
    >
      <Container
        fluid
        p={30}
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '100%' }}
      >
        <Link to="/">
          <img
            src={dark ? '/static/images/logo-formerly-dark-bg.png' : '/static/images/logo-formerly-light-bg.png'}
            alt="logo"
            style={{ maxWidth: 150, maxHeight: 25 }}
          />
        </Link>
        <Group>
          <ActionIcon variant="transparent" onClick={() => toggleColorScheme()}>
            <Tooltip label={themeTitle()}>{Icon()}</Tooltip>
          </ActionIcon>
          <NotificationCenterWidget user={currentUser} />
          <Dropdown
            control={
              <ActionIcon variant="transparent">
                <Avatar
                  size={35}
                  radius="xl"
                  data-test-id="header-profile-avatar"
                  src={currentUser?.profilePicture || '/static/images/avatar.png'}
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
