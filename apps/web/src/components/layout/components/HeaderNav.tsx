import {
  Avatar,
  useMantineColorScheme,
  ActionIcon,
  Header,
  Group,
  Menu as MantineMenu,
  Container,
} from '@mantine/core';
import { useContext } from 'react';
import * as capitalize from 'lodash.capitalize';
import styled from '@emotion/styled';
import { AuthContext } from '../../../store/authContext';
import { shadows, colors, Text, Dropdown } from '../../../design-system';
import { Sun, Moon, Trash, Mail } from '../../../design-system/icons';
import { NotificationCenterWidget } from '../../widget/NotificationCenterWidget';

type Props = {};
const menuItem = [
  {
    title: 'Invite Members',
    icon: <Mail />,
    path: '/team',
  },
];
const headerIconsSettings = { color: colors.B60, width: 30, height: 30 };

export function HeaderNav({}: Props) {
  const { currentOrganization, currentUser, logout } = useContext(AuthContext);
  const { colorScheme, toggleColorScheme } = useMantineColorScheme();
  const dark = colorScheme === 'dark';

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
      <MantineMenu.Item key={title} icon={icon} component="a" href={path}>
        {title}
      </MantineMenu.Item>
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
      })}>
      <Container
        fluid
        p={30}
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '100%' }}>
        <img
          src={dark ? '/static/images/logo-formerly-dark-bg.png' : '/static/images/logo-formerly-light-bg.png'}
          alt="logo"
          style={{ maxWidth: 150, maxHeight: 25 }}
        />
        <Group>
          <ActionIcon variant="transparent" onClick={() => toggleColorScheme()} title="Toggle color scheme">
            {dark ? <Sun {...headerIconsSettings} /> : <Moon {...headerIconsSettings} />}
          </ActionIcon>
          <ActionIcon variant="transparent" id="notification-bell">
            <NotificationCenterWidget user={currentUser} />
            <UnseenBadge id="unseen-badge-selector" />
          </ActionIcon>
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
            }>
            {' '}
            {profileMenuMantine}
          </Dropdown>
        </Group>
      </Container>
    </Header>
  );
}

const UnseenBadge = styled.span`
  position: absolute;
  background: ${colors.error};
  width: 7px;
  height: 7px;
  border-radius: 50%;
  right: 2px;
  top: 2px;
  display: none;
`;
