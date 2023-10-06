import { ActionIcon, Avatar, Container, Group, Header, useMantineColorScheme } from '@mantine/core';
import * as capitalize from 'lodash.capitalize';
import { useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useIntercom } from 'react-use-intercom';

import LogRocket from 'logrocket';
import { CONTEXT_PATH, INTERCOM_APP_ID, IS_DOCKER_HOSTED, LOGROCKET_ID, REACT_APP_VERSION } from '../../../config';
import { ROUTES } from '../../../constants/routes.enum';
import { colors, Dropdown, shadows, Text, Tooltip } from '../../../design-system';
import { Ellipse, Mail, Moon, Question, Sun, Trash } from '../../../design-system/icons';
import { useLocalThemePreference } from '../../../hooks';
import { discordInviteUrl } from '../../../pages/quick-start/consts';
import { useAuthContext } from '../../providers/AuthProvider';
import { useSpotlightContext } from '../../providers/SpotlightProvider';
import { HEADER_HEIGHT } from '../constants';
import { NotificationCenterWidget } from './NotificationCenterWidget';

type Props = { isIntercomOpened: boolean };
const menuItem = [
  {
    title: 'Invite Members',
    icon: <Mail />,
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

export function HeaderNav({ isIntercomOpened }: Props) {
  const { currentOrganization, currentUser, logout } = useAuthContext();
  const { colorScheme, toggleColorScheme } = useMantineColorScheme();
  const { themeStatus } = useLocalThemePreference();
  const dark = colorScheme === 'dark';
  const { addItem, removeItems } = useSpotlightContext();
  const { boot } = useIntercom();
  const isSelfHosted = IS_DOCKER_HOSTED;

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
        icon: <Trash />,
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
    <Dropdown.Item key="logout" icon={<Trash />} onClick={logout} data-test-id="logout-button">
      Sign Out
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
      }}
    >
      <Container
        fluid
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', height: `${HEADER_HEIGHT}px` }}
      >
        <Group>
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
