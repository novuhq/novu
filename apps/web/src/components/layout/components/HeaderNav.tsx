import { Avatar, useMantineColorScheme, ActionIcon, Header, Group, Container } from '@mantine/core';
import { useEffect } from 'react';
import * as capitalize from 'lodash.capitalize';
import { useIntercom } from 'react-use-intercom';
import { Link } from 'react-router-dom';

import { useAuthContext } from '../../providers/AuthProvider';
import { shadows, colors, Text, Dropdown } from '../../../design-system';
import { Sun, Moon, Ellipse, Trash, Mail } from '../../../design-system/icons';
import { useLocalThemePreference } from '../../../hooks';
import { NotificationCenterWidget } from './NotificationCenterWidget';
import { Tooltip } from '../../../design-system';
import { CONTEXT_PATH, INTERCOM_APP_ID, LOGROCKET_ID } from '../../../config';
import { useSpotlightContext } from '../../providers/SpotlightProvider';
import { HEADER_HEIGHT } from '../constants';
import LogRocket from 'logrocket';
import { ROUTES } from '../../../constants/routes.enum';

type Props = {};
const menuItem = [
  {
    title: 'Invite Members',
    icon: <Mail />,
    path: ROUTES.TEAM,
  },
];
const headerIconsSettings = { color: colors.B60, width: 30, height: 30 };

export function HeaderNav({}: Props) {
  const { currentOrganization, currentUser, logout } = useAuthContext();
  const { colorScheme, toggleColorScheme } = useMantineColorScheme();
  const { themeStatus } = useLocalThemePreference();
  const dark = colorScheme === 'dark';
  const { addItem } = useSpotlightContext();

  if (INTERCOM_APP_ID) {
    const { boot } = useIntercom();

    useEffect(() => {
      if (currentUser && currentOrganization) {
        boot({
          email: currentUser?.email ?? '',
          name: currentUser?.firstName + ' ' + currentUser?.lastName,
          createdAt: currentUser?.createdAt,
          company: {
            name: currentOrganization?.name,
            companyId: currentOrganization?._id as string,
          },
          userHash: currentUser.servicesHashes?.intercom,
        });
      }
    }, [currentUser, currentOrganization]);
  }

  useEffect(() => {
    if (!LOGROCKET_ID) return;
    if (currentUser && currentOrganization) {
      let logrocketTraits;

      if (currentUser?.email !== undefined) {
        logrocketTraits = {
          name: currentUser?.firstName + ' ' + currentUser?.lastName,
          organizationId: currentOrganization._id,
          organization: currentOrganization.name,
          email: currentUser?.email ? currentUser?.email : ' ',
        };
      } else {
        logrocketTraits = {
          name: currentUser?.firstName + ' ' + currentUser?.lastName,
          organizationId: currentOrganization._id,
          organization: currentOrganization.name,
        };
      }

      LogRocket.identify(currentUser?._id, logrocketTraits);
    }
  }, [currentUser, currentOrganization]);

  const themeTitle = () => {
    let title = 'Match System Appearance';
    if (themeStatus === 'dark') {
      title = 'Dark Theme';
    } else if (themeStatus === 'light') {
      title = 'Light Theme';
    }

    return title;
  };

  const Icon = () => {
    if (themeStatus === 'dark') {
      return <Moon {...headerIconsSettings} />;
    }
    if (themeStatus === 'light') {
      return <Sun {...headerIconsSettings} />;
    }

    return <Ellipse {...headerIconsSettings} height={24} width={24} />;
  };

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
  }, [colorScheme]);

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
    <Dropdown.Item key="logout" icon={<Trash />} onClick={logout} data-test-id="logout-button">
      Sign Out
    </Dropdown.Item>,
  ];

  return (
    <Header
      height={HEADER_HEIGHT}
      sx={(theme) => ({
        position: 'sticky',
        top: 0,
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
            src={dark ? CONTEXT_PATH + '/static/images/logo-light.png' : CONTEXT_PATH + '/static/images/logo.png'}
            alt="logo"
            style={{ maxWidth: 150, maxHeight: 25 }}
          />
        </Link>
        <Group>
          <ActionIcon variant="transparent" onClick={() => toggleColorScheme()}>
            <Tooltip label={themeTitle()}>
              <div>{Icon()}</div>
            </Tooltip>
          </ActionIcon>
          <NotificationCenterWidget user={currentUser} />
          <Dropdown
            position="bottom-end"
            control={
              <ActionIcon variant="transparent">
                <Avatar
                  size={35}
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
