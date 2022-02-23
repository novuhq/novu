import {
  Avatar,
  useMantineColorScheme,
  ActionIcon,
  Header,
  Group,
  Menu as MantineMenu,
  Container,
} from '@mantine/core';
import { useQuery } from 'react-query';
import { IOrganizationEntity, IUserEntity } from '@notifire/shared';
import { useContext } from 'react';
import * as capitalize from 'lodash.capitalize';
import { AuthContext } from '../../../store/authContext';
import { getUser } from '../../../api/user';
import { getCurrentOrganization } from '../../../api/organization';
import { shadows, colors, Text, Dropdown } from '../../../design-system';
import { Sun, Moon, Bell, Trash, Mail } from '../../../design-system/icons';

type Props = {};
const menuItem = [
  {
    title: 'Invite Members',
    icon: <Mail />,
    path: '/settings/organization',
  },
];
const headerIconsSettings = { color: colors.B60, width: 30, height: 30 };

export function HeaderNav({}: Props) {
  const authContext = useContext(AuthContext);
  const { colorScheme, toggleColorScheme } = useMantineColorScheme();
  const dark = colorScheme === 'dark';
  const { data: user, isLoading: isUserLoading } = useQuery<IUserEntity>('/v1/users/me', getUser);
  const { data: organization, isLoading: isOrganizationLoading } = useQuery<IOrganizationEntity>(
    '/v1/organizations/me',
    getCurrentOrganization
  );

  const profileMenuMantine = [
    <MantineMenu.Item disabled key="user">
      <Group spacing={10}>
        <Avatar radius="xl" size={45} src={user?.profilePicture || '/static/images/avatar.png'} />
        <div style={{ flex: 1 }}>
          <Text data-test-id="header-dropdown-username">
            {' '}
            {capitalize(user?.firstName as string)} {capitalize(user?.lastName as string)}
          </Text>
          <Text size="md" color={colors.B60} data-test-id="header-dropdown-organization-name">
            {' '}
            {capitalize(organization?.name as string)}
          </Text>
        </div>
      </Group>
    </MantineMenu.Item>,
    ...menuItem.map(({ title, icon, path }) => (
      <MantineMenu.Item key={title} icon={icon} component="a" href={path}>
        {title}
      </MantineMenu.Item>
    )),
    <MantineMenu.Item key="logout" icon={<Trash />} onClick={authContext.logout} data-test-id="logout-button">
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
        padding={30}
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '100%' }}>
        <img
          src={dark ? '/static/images/logo-light.png' : '/static/images/logo.png'}
          alt="logo"
          style={{ maxWidth: 150 }}
        />
        <Group>
          <ActionIcon variant="transparent" onClick={() => toggleColorScheme()} title="Toggle color scheme">
            {dark ? <Sun {...headerIconsSettings} /> : <Moon {...headerIconsSettings} />}
          </ActionIcon>
          <ActionIcon variant="transparent">
            <Bell {...headerIconsSettings} />
          </ActionIcon>
          <Dropdown
            control={
              <ActionIcon variant="transparent">
                <Avatar
                  size={35}
                  radius="xl"
                  data-test-id="header-profile-avatar"
                  src={user?.profilePicture || '/static/images/avatar.png'}
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
